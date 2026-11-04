// node run.mjs <arm> <instance_id>
// One SWE-bench Verified issue, one setup: a fresh checkout at the issue's base commit, the same prompt for every
// setup, the tool's own token count, and the patch it left. Writes runs/<arm>/<instance_id>/.
//
// arms: cc | codex | agy | grok                      — each CLI on its own
//       ltb-claude | ltb-codex | ltb-gemini | ltb-grok — LetThemBuild with that model as the only seat, on the same CLI
//       ltb-room                                      — LetThemBuild, Claude leads and Codex reviews
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, createWriteStream, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// BENCH_DIR holds verified-100.json, repos/ (bare mirrors) and receives runs/ and work/.
const SWE = resolve(process.env.BENCH_DIR ?? ".");
// LTB_DESKTOP: the LetThemBuild desktop app folder the LetThemBuild setups run (see the README for the build).
const LTB_DESKTOP = process.env.LTB_DESKTOP ?? "";
export const MODELS = { claude: "claude-opus-5-5", chatgpt: "gpt-6.1-sol", gemini: "gemini-4-argon-high", grok: "grok-4.7" };
const LIMIT_MS = 40 * 60 * 1000;
// What each CLI on its own may run without asking: reading, searching, and running Python and the tests.
const COMMANDS = ["python", "python3", "pytest", "pip", "git status", "git diff", "git log", "git show", "git grep", "ls", "cat", "grep", "rg", "find", "sed -n", "head", "tail", "wc"];
const SEATS = ["claude", "chatgpt", "gemini", "grok"];

export const PROMPT = (problem) => `Resolve the GitHub issue below in this repository, which is checked out at the commit where it was reported. Change the source code so the issue is fixed. You do not need to add or change tests: the fix will be checked with the project's own tests. Make the change; do not ask questions.

<issue>
${problem}
</issue>`;

// An arm may carry a tag ("ltb-claude@vD") for a variant run: it is stored apart, and the tag is not part of the command.
const [armTagged, id] = process.argv.slice(2);
const arm = String(armTagged ?? "").split("@")[0];
if (!armTagged || !id) { console.error("usage: node run.mjs <arm> <instance_id>"); process.exit(2); }
const task = JSON.parse(readFileSync(join(SWE, "verified-100.json"), "utf8"))[id];
if (!task) { console.error(`unknown instance ${id}`); process.exit(2); }

const out = join(SWE, "runs", armTagged, id);
const ws = join(SWE, "work", armTagged, id);
rmSync(out, { recursive: true, force: true }); rmSync(ws, { recursive: true, force: true });
mkdirSync(out, { recursive: true }); mkdirSync(join(SWE, "work", armTagged), { recursive: true });

// A shared clone of the local mirror, at the base commit: cheap on disk, and the same tree for every setup.
const mirror = join(SWE, "repos", `${task.repo.replace("/", "__")}.git`);
execFileSync("git", ["clone", "-q", "--shared", "--no-checkout", mirror, ws]);
execFileSync("git", ["-C", ws, "checkout", "-q", "--detach", task.base_commit]);
execFileSync("git", ["-C", ws, "config", "user.email", "bench@letthembuild.invalid"]);
execFileSync("git", ["-C", ws, "config", "user.name", "bench"]);
const prompt = PROMPT(task.problem_statement);
writeFileSync(join(out, "prompt.txt"), prompt);

function room(on, leader) {
  return {
    leader,
    enabled: Object.fromEntries(SEATS.map((s) => [s, on.includes(s)])),
    backends: Object.fromEntries(SEATS.map((s) => [s, "cli"])),
    models: MODELS, reviewerModels: MODELS,
    geminiCli: "antigravity", peerRanking: false,
  };
}
function cmd() {
  const ltb = (on) => ({ bin: join(LTB_DESKTOP, "node_modules/.bin/electron"), cwd: LTB_DESKTOP,
    args: [".", "run", prompt, "--cwd", ws, "--json", "--permission", "auto", "--rounds", "1"],
    env: { LTB_ACCEPT_LICENSE: "1", LTB_BENCH_ROOM: JSON.stringify(room(on, on[0])), LTB_USAGE_LOG: join(out, "ltb-usage.jsonl") } });
  switch (arm) {
    case "cc": return { bin: "claude", cwd: ws, env: {}, args: ["-p", prompt, "--output-format", "stream-json", "--verbose", "--setting-sources", "user", "--model", MODELS.claude,
      "--permission-mode", "acceptEdits", "--allowed-tools", COMMANDS.map((c) => `Bash(${c}:*)`).join(",")] };
    case "codex": return { bin: "codex", cwd: ws, env: {}, args: ["exec", "--json", "--skip-git-repo-check", "-m", MODELS.chatgpt, "--sandbox", "workspace-write", "-C", ws, prompt] };
    case "agy": {
      // This account has no auto mode in Antigravity, and its headless default refuses every command, so it gets
      // accept-edits plus the same commands by name (its rules match a command's name, not its arguments).
      const allow = [...new Set(COMMANDS.map((c) => c.split(" ")[0]))].map((c) => `command(${c})`);
      return { bin: "agy", cwd: ws, env: {}, args: ["-p", prompt, "--model", MODELS.gemini, "--mode", "accept-edits", "--settings", JSON.stringify({ permissions: { allow } }), "--output-format", "stream-json"] };
    }
    case "grok": { const pf = join(out, "prompt.txt"); return { bin: "grok", cwd: ws, env: {}, args: ["--prompt-file", pf, "--output-format", "streaming-json", "--model", MODELS.grok,
      "--permission-mode", "auto", "--no-subagents", ...COMMANDS.flatMap((c) => ["--allow", `Bash(${c}:*)`])] }; }
    case "ltb-claude": return ltb(["claude"]);
    case "ltb-codex": return ltb(["chatgpt"]);
    case "ltb-gemini": return ltb(["gemini"]);
    case "ltb-grok": return ltb(["grok"]);
    case "ltb-room": return ltb(["claude", "chatgpt"]);
    default: throw new Error(`unknown arm ${arm}`);
  }
}

const c = cmd();
const started = Date.now();
const events = createWriteStream(join(out, "events.jsonl")), errs = createWriteStream(join(out, "stderr.log"));
const child = spawn(c.bin, c.args, { cwd: c.cwd, env: { ...process.env, ...c.env }, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.pipe(events); child.stderr.pipe(errs);
let timedOut = false;
const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 10000); }, LIMIT_MS);
const code = await new Promise((r) => child.on("close", r));
clearTimeout(timer);
const ended = Date.now();
await new Promise((r) => events.end(r));

// The patch: everything the run changed against the base commit, new files included, minus the tools' own folders.
execFileSync("git", ["-C", ws, "add", "-A"]);
const EXCLUDE = [".letthemchat", ".gemini", ".claude", ".codex", "artifacts", ".grok"].map((p) => `:(exclude)${p}`);
const patch = execFileSync("git", ["-C", ws, "diff", "--cached", "--binary", task.base_commit, "--", ".", ...EXCLUDE], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
writeFileSync(join(out, "patch.diff"), patch);
const files = execFileSync("git", ["-C", ws, "diff", "--cached", "--name-only", task.base_commit, "--", ".", ...EXCLUDE], { encoding: "utf8" }).trim().split("\n").filter(Boolean);

// Tokens, as each tool reports them.
const lines = (f) => existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
const ev = lines(join(out, "events.jsonl"));
const usage = { bySource: {}, total: 0, calls: null, costUsd: null };
const put = (k, row) => { usage.bySource[k] = row; usage.total += row.total; };
if (arm === "cc") {
  const r = ev.filter((e) => e.type === "result").pop();
  for (const [m, u] of Object.entries(r?.modelUsage ?? {})) put(`claude:${m}`, { uncached: u.inputTokens, cacheRead: u.cacheReadInputTokens, cacheWrite: u.cacheCreationInputTokens, output: u.outputTokens, total: u.inputTokens + u.cacheReadInputTokens + u.cacheCreationInputTokens + u.outputTokens });
  usage.calls = r?.num_turns ?? null; usage.costUsd = r?.total_cost_usd ?? null;
} else if (arm === "codex") {
  const row = { uncached: 0, cacheRead: 0, cacheWrite: 0, output: 0 }; let calls = 0;
  for (const e of ev) if (e.type === "turn.completed" && e.usage) { calls++; row.uncached += e.usage.input_tokens - (e.usage.cached_input_tokens ?? 0); row.cacheRead += e.usage.cached_input_tokens ?? 0; row.output += e.usage.output_tokens; }
  put(`codex:${MODELS.chatgpt}`, { ...row, total: row.uncached + row.cacheRead + row.output });
} else if (arm === "agy") {
  const u = ev.filter((e) => e.event === "result").pop()?.result?.usage ?? {};
  // Antigravity's total_tokens leaves out cache reads and thinking, so the parts are added up, as for the others.
  const row = { uncached: u.input_tokens ?? 0, cacheRead: u.cache_read_tokens ?? 0, cacheWrite: 0, output: (u.output_tokens ?? 0) + (u.thinking_tokens ?? 0) };
  put(`gemini:${MODELS.gemini}`, { ...row, total: row.uncached + row.cacheRead + row.output, reportedTotal: u.total_tokens ?? null });
  usage.calls = ev.filter((e) => e.event === "result").pop()?.result?.num_turns ?? null;
} else if (arm === "grok") {
  const r = ev.filter((e) => e.usage).pop() ?? {}; const u = r.usage ?? {};
  put(`grok:${MODELS.grok}`, { uncached: u.input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, output: u.output_tokens ?? 0, total: u.total_tokens ?? 0 });
  usage.calls = r.num_turns ?? null;
} else {
  for (const u of lines(join(out, "ltb-usage.jsonl")).filter((l) => l.kind === "cli-turn")) {
    const k = `${u.provider}:${u.model}`; const row = usage.bySource[k] ?? { turns: 0, total: 0 };
    row.turns += 1; row.total += u.tokens ?? 0; usage.bySource[k] = row; usage.total += u.tokens ?? 0;
  }
}

const result = { arm: armTagged, briefDrop: process.env.LTB_BRIEF_DROP || null, instance_id: id, repo: task.repo, models: MODELS, started: new Date(started).toISOString(), wallMs: ended - started, exitCode: code, timedOut,
  patchBytes: patch.length, filesChanged: files, tokens: usage };
writeFileSync(join(out, "run.json"), JSON.stringify(result, null, 2));
rmSync(ws, { recursive: true, force: true });
console.log(`${armTagged} ${id}: exit ${code}${timedOut ? " TIMEOUT" : ""}, ${Math.round((ended - started) / 1000)}s, ${usage.total} tokens, ${files.length} files, patch ${patch.length}B`);
