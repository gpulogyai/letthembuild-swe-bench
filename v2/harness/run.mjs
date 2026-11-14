// node run.mjs <arm> <instance_id>          (v2: isolated runs)
// One SWE-bench Verified issue, one setup, under the same isolation for every setup:
//  - the workspace holds the repository at the issue's base commit and no later history (prep-ws.mjs);
//  - the run gets a fresh home folder with each CLI's web tools off and no plugins (home.mjs);
//  - the whole process tree runs under one kernel profile that hides the rest of the home folder, the benchmark's
//    data included, and allows no network but the run's own proxy (sandbox.mjs), which lets through only the model
//    providers and the Python package index (proxy.mjs);
//  - afterwards contam.mjs checks the run's own record for web access and benchmark files, and the run is kept
//    with that verdict beside it.
// arms: cc | codex | agy | grok | ltb-claude | ltb-codex | ltb-gemini | ltb-grok | room<N>-<lead>
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, createWriteStream, cpSync, readdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { prepWorkspace } from "./prep-ws.mjs";
import { makeHome, returnHome } from "./home.mjs";
import { profileFile } from "./sandbox.mjs";
import { startProxy } from "./proxy.mjs";
import { check } from "./contam.mjs";

const V2 = import.meta.dirname, H = os.homedir();
const DATA = join(H, "ltb-tokenbench/swe/verified-100.json");
// The LetThemBuild bench build's desktop folder, for the LetThemBuild setups (set in local.env, which run-all.sh reads).
const LTB_DESKTOP = process.env.LTB_DESKTOP ?? "";
const LTB_DATA_TEMPLATE = join(V2, "ltb-data-template");
export const MODELS = { claude: "claude-opus-5-5", chatgpt: "gpt-6.1-sol", gemini: "gemini-4-argon-high", grok: "grok-4.7" };
const LIMIT_MS = 40 * 60 * 1000;
const SEATS = ["claude", "chatgpt", "gemini", "grok"];
export const PROMPT = (problem) => `Resolve the GitHub issue below in this repository, which is checked out at the commit where it was reported. Change the source code so the issue is fixed. You do not need to add or change tests: the fix will be checked with the project's own tests. Make the change; do not ask questions.

<issue>
${problem}
</issue>`;

const [armTagged, id] = process.argv.slice(2);
if (!armTagged || !id) { console.error("usage: node run.mjs <arm> <instance_id>"); process.exit(2); }
const arm = armTagged.split("@")[0];
const task = JSON.parse(readFileSync(DATA, "utf8"))[id];
if (!task) { console.error(`unknown instance ${id}`); process.exit(2); }
const out = join(V2, "runs", armTagged, id);
const slot = join(H, "swe-ws", armTagged.replace(/[@/]/g, "_"), id);
const ws = join(slot, "repo"), home = join(slot, "home"), ltbData = join(slot, "ltb-data");
rmSync(out, { recursive: true, force: true }); rmSync(slot, { recursive: true, force: true });
mkdirSync(out, { recursive: true }); mkdirSync(slot, { recursive: true });

const wsProof = prepWorkspace(task, ws);
makeHome(home);
const prompt = PROMPT(task.problem_statement);
writeFileSync(join(out, "prompt.txt"), prompt);
const isLtb = arm.startsWith("ltb-") || arm.startsWith("room");
if (isLtb && !LTB_DESKTOP) { console.error("LTB_DESKTOP is not set"); process.exit(2); }
if (isLtb) cpSync(LTB_DATA_TEMPLATE, ltbData, { recursive: true });

function room(on) {
  return { leader: on[0], enabled: Object.fromEntries(SEATS.map((s) => [s, on.includes(s)])), backends: Object.fromEntries(SEATS.map((s) => [s, "cli"])),
    models: MODELS, reviewerModels: MODELS, geminiCli: "antigravity", peerRanking: false,
    // The harness's profile stands in for LetThemBuild's own seat sandbox (macOS refuses one inside another), and
    // LetThemBuild's own web tools are off, as every CLI's are.
    sandbox: false, toolFamilies: { browser: "off" } };
}
function cmd() {
  const ltb = (on) => ({ bin: join(LTB_DESKTOP, "node_modules/.bin/electron"), cwd: LTB_DESKTOP,
    args: [".", "run", prompt, "--cwd", ws, "--json", "--permission", "auto", "--rounds", "1"],
    env: { LTB_USER_DATA_DIR: ltbData, LTB_ACCEPT_LICENSE: "1", LTB_BENCH_STORE: "1", LTB_BENCH_ROOM: JSON.stringify(room(on)), LTB_USAGE_LOG: join(ltbData, "bench-usage.jsonl") },
    read: [LTB_DESKTOP], write: [ltbData] });
  switch (arm) {
    case "cc": return { bin: "claude", args: ["-p", prompt, "--output-format", "stream-json", "--verbose", "--setting-sources", "user", "--model", MODELS.claude, "--permission-mode", "auto"] };
    // Codex's own sandbox cannot run inside the harness's; the harness's profile stands in, as it does for LetThemBuild's seats.
    case "codex": return { bin: "codex", args: ["exec", "--json", "--skip-git-repo-check", "-m", MODELS.chatgpt, "--sandbox", "danger-full-access", "-C", ws, prompt] };
    case "agy": return { bin: "agy", args: ["-p", prompt, "--model", MODELS.gemini, "--dangerously-skip-permissions", "--output-format", "stream-json"] };
    case "grok": return { bin: "grok", args: ["--prompt-file", join(home, "prompt.txt"), "--output-format", "streaming-json", "--model", MODELS.grok, "--permission-mode", "auto", "--no-subagents", "--disable-web-search"] };
    case "ltb-claude": return ltb(["claude"]);
    case "ltb-codex": return ltb(["chatgpt"]);
    case "ltb-gemini": return ltb(["gemini"]);
    case "ltb-grok": return ltb(["grok"]);
    default: {
      const m = /^room([234])-(claude|chatgpt|gemini|grok)$/.exec(arm);
      if (!m) throw new Error(`unknown arm ${arm}`);
      const at = SEATS.indexOf(m[2]);
      return ltb(Array.from({ length: +m[1] }, (_, i) => SEATS[(at + i) % SEATS.length]));
    }
  }
}
const c = cmd();
if (arm === "grok") writeFileSync(join(home, "prompt.txt"), prompt);
const versions = Object.fromEntries(["claude", "codex", "agy", "grok"].map((b) => { try { return [b, execFileSync(b, ["--version"], { encoding: "utf8", timeout: 20000 }).trim()]; } catch { return [b, null]; } }));
const proxy = await startProxy(join(out, "network.log"));
const prof = profileFile(join(slot, "profile.sb"), { ws, home, extraRead: c.read ?? [], extraWrite: c.write ?? [] });
const px = `http://127.0.0.1:${proxy.port}`;
const env = { ...process.env, ...(c.env ?? {}), HOME: home, TMPDIR: join(home, "tmp") + "/", HTTPS_PROXY: px, HTTP_PROXY: px, https_proxy: px, http_proxy: px, ALL_PROXY: px, NO_PROXY: "localhost,127.0.0.1", NODE_USE_ENV_PROXY: "1", DISABLE_AUTOUPDATER: "1", GROK_UPDATE_CHANNEL: "stable" };
// Chromium sandboxes its own helpers, which macOS will not nest inside the harness profile; the profile covers them.
const args = isLtb ? [c.args[0], "--no-sandbox", `--proxy-server=${px}`, ...c.args.slice(1)] : c.args;

const started = Date.now();
const events = createWriteStream(join(out, "events.jsonl")), errs = createWriteStream(join(out, "stderr.log"));
const child = spawn("/usr/bin/sandbox-exec", ["-f", prof, c.bin, ...args], { cwd: c.cwd ?? ws, env, stdio: ["ignore", "pipe", "pipe"] });
child.stdout.pipe(events); child.stderr.pipe(errs);
let timedOut = false;
const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); setTimeout(() => child.kill("SIGKILL"), 10000); }, LIMIT_MS);
const code = await new Promise((r) => child.on("close", r));
clearTimeout(timer); const ended = Date.now();
await new Promise((r) => events.end(r)); proxy.close();
if (existsSync(join(ltbData, "bench-usage.jsonl"))) cpSync(join(ltbData, "bench-usage.jsonl"), join(out, "ltb-usage.jsonl"));

execFileSync("git", ["-C", ws, "add", "-A"]);
const EXCLUDE = [".letthemchat", ".gemini", ".claude", ".codex", "artifacts", ".grok", ".agents"].map((p) => `:(exclude)${p}`);
const patch = execFileSync("git", ["-C", ws, "diff", "--cached", "--binary", task.base_commit, "--", ".", ...EXCLUDE], { encoding: "utf8", maxBuffer: 64 << 20 });
writeFileSync(join(out, "patch.diff"), patch);
const files = execFileSync("git", ["-C", ws, "diff", "--cached", "--name-only", task.base_commit, "--", ".", ...EXCLUDE], { encoding: "utf8" }).trim().split("\n").filter(Boolean);

const lines = (f) => existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];
const ev = lines(join(out, "events.jsonl"));
const usage = { bySource: {}, total: 0, calls: null, costUsd: null, complete: true };
const put = (k, row) => { usage.bySource[k] = row; usage.total += row.total; };
if (arm === "cc") {
  const r = ev.filter((e) => e.type === "result").pop();
  for (const [m, u] of Object.entries(r?.modelUsage ?? {})) put(`claude:${m}`, { uncached: u.inputTokens, cacheRead: u.cacheReadInputTokens, cacheWrite: u.cacheCreationInputTokens, output: u.outputTokens, total: u.inputTokens + u.cacheReadInputTokens + u.cacheCreationInputTokens + u.outputTokens });
  usage.calls = r?.num_turns ?? null; usage.costUsd = r?.total_cost_usd ?? null; usage.complete = Boolean(r);
} else if (arm === "codex") {
  const row = { uncached: 0, cacheRead: 0, cacheWrite: 0, output: 0 }; let calls = 0;
  for (const e of ev) if (e.type === "turn.completed" && e.usage) { calls++; row.uncached += e.usage.input_tokens - (e.usage.cached_input_tokens ?? 0); row.cacheRead += e.usage.cached_input_tokens ?? 0; row.output += e.usage.output_tokens; }
  put(`codex:${MODELS.chatgpt}`, { ...row, total: row.uncached + row.cacheRead + row.output }); usage.calls = calls; usage.complete = calls > 0;
} else if (arm === "agy") {
  const res = ev.filter((e) => e.event === "result").pop()?.result; const u = res?.usage ?? {};
  const row = { uncached: u.input_tokens ?? 0, cacheRead: u.cache_read_tokens ?? 0, cacheWrite: 0, output: (u.output_tokens ?? 0) + (u.thinking_tokens ?? 0) };
  put(`gemini:${MODELS.gemini}`, { ...row, total: row.uncached + row.cacheRead + row.output, reportedTotal: u.total_tokens ?? null });
  usage.calls = res?.num_turns ?? null; usage.complete = Boolean(res);
} else if (arm === "grok") {
  const r = ev.filter((e) => e.type === "end" && e.usage).pop(); const u = r?.usage ?? {};
  put(`grok:${MODELS.grok}`, { uncached: u.input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, output: (u.output_tokens ?? 0), total: u.total_tokens ?? 0 });
  usage.calls = r?.num_turns ?? null; usage.complete = Boolean(r);
} else {
  const turns = lines(join(out, "ltb-usage.jsonl")).filter((l) => l.kind === "cli-turn");
  for (const u of turns) {
    const k = `${u.provider}:${u.model}`; const row = usage.bySource[k] ?? { turns: 0, uncached: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0 };
    row.turns += 1; row.total += u.tokens ?? 0;
    const p = u.usage ?? {}; // LetThemBuild's parts: input includes cache reads and writes
    row.cacheRead += p.cachedTokens ?? 0; row.cacheWrite += p.cacheWriteTokens ?? 0; row.output += p.outputTokens ?? 0;
    row.uncached += Math.max(0, (p.inputTokens ?? 0) - (p.cachedTokens ?? 0) - (p.cacheWriteTokens ?? 0));
    if (!u.usage) row.partsMissing = (row.partsMissing ?? 0) + 1;
    usage.bySource[k] = row; usage.total += u.tokens ?? 0;
    if (u.tokens == null) usage.complete = false;
  }
  if (!turns.length) usage.complete = false;
}
// A run whose token count is missing is a failed run, never a run of zero tokens.
const failed = !usage.complete || (code !== 0 && !timedOut && !patch.length);
const result = { arm: armTagged, harness: "v2", instance_id: id, repo: task.repo, models: MODELS, versions, ltbBuild: isLtb ? execFileSync("git", ["-C", LTB_DESKTOP, "rev-parse", "HEAD"], { encoding: "utf8" }).trim() : null,
  workspace: wsProof, started: new Date(started).toISOString(), wallMs: ended - started, exitCode: code, timedOut, failed, patchBytes: patch.length, filesChanged: files, tokens: usage };
writeFileSync(join(out, "run.json"), JSON.stringify(result, null, 2));
const verdict = check(out, task);
// LetThemBuild's own data folder must not hold another benchmark issue (an account sync could bring earlier ones in).
if (isLtb && existsSync(ltbData)) {
  const own = JSON.stringify(task.problem_statement.slice(0, 80)).slice(1, -1);
  let others = 0;
  const walk = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.json$/.test(f.name)) { const t = readFileSync(p, "utf8"); let i = -1; while ((i = t.indexOf("Resolve the GitHub issue below", i + 1)) >= 0) if (!t.slice(i, i + 3000).includes(own)) others++; } } };
  try { walk(ltbData); } catch {}
  if (others) { verdict.reached.push(`LetThemBuild data held ${others} other benchmark prompt(s)`); verdict.clean = false; }
}
writeFileSync(join(out, "contamination.json"), JSON.stringify(verdict, null, 2));
returnHome(home);
rmSync(slot, { recursive: true, force: true });
console.log(`${armTagged} ${id}: exit ${code}${timedOut ? " TIMEOUT" : ""}${failed ? " FAILED" : ""}, ${Math.round((ended - started) / 1000)}s, ${usage.total} tokens, ${files.length} files, patch ${patch.length}B, contamination ${verdict.clean ? "clean" : "REACHED: " + verdict.reached.join("; ")}${verdict.attempted.length ? " / tried: " + verdict.attempted.join("; ") : ""}${verdict.recall.length ? " / recall: " + verdict.recall.join("; ") : ""}`);
