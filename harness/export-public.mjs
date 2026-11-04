// node export-public.mjs <ids-file> <out-dir> <setup>=<arm> [<setup>=<arm> ...]
// Builds the public data folder from the raw runs: per run the patch, the run summary, the tool's own transcript
// (only the work: replies, tool calls and results, usage), and LetThemBuild's per-call usage; per setup the
// predictions file and the official harness's report. Every path under the home folder and every email address is
// replaced, and the parts of a stream that describe this machine rather than the run (settings, the discussion list,
// installed plugins and connectors) are left out.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import os from "node:os";

const SWE = resolve(process.env.BENCH_DIR ?? ".");
const [idsFile, outDir, ...pairs] = process.argv.slice(2);
if (!idsFile || !outDir || !pairs.length) { console.error("usage: node export-public.mjs <ids-file> <out-dir> <setup>=<arm> ..."); process.exit(2); }
const ids = readFileSync(join(SWE, idsFile), "utf8").trim().split("\n");
const setups = pairs.map((p) => { const [setup, arm] = p.split("="); return { setup, arm }; });

const HOME = os.homedir();
function scrub(text) {
  return text
    .replaceAll(join(SWE, "work"), "/bench/work")
    .replaceAll(SWE, "/bench")
    .replaceAll(HOME, "/home/bench")
    .replaceAll(HOME.replaceAll("/", "-"), "-home-bench")
    .replace(/\/private\/tmp\/claude-\d+\/[^\s"'\\]*/g, "/tmp/session")
    .replace(/[A-Za-z0-9._%+-]+@(?!pytest\b)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, (m) => m.endsWith(".invalid") ? m : "user@example.invalid");
}
const jsonl = (f) => existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } }) : [];

// What each tool's stream keeps: the work, not the machine.
const LTB_KEEP = new Set(["phase", "round", "message_start", "delta", "message_end", "message_final", "tool_activity", "tool_result", "spend", "turn_cost", "done"]);
function transcript(arm, events) {
  // A notice can link the person's other discussions, and the GitHub lines are about their sign-in, not the run.
  if (arm.startsWith("ltb-")) return events.filter((e) => LTB_KEEP.has(e.type) && e.tool !== "github").map((e) => {
    if (e.type !== "done") return e;
    const { settings: _s, sessions: _ss, ...rest } = e; return rest;
  });
  if (arm === "cc") return events.filter((e) => !(e.type === "system" && /^hook_/.test(e.subtype ?? ""))).map((e) => {
    if (e.type !== "system" || e.subtype !== "init") return e;
    return { type: e.type, subtype: e.subtype, cwd: e.cwd, model: e.model, permissionMode: e.permissionMode, claude_code_version: e.claude_code_version };
  });
  return events;
}

rmSync(join(outDir, "data"), { recursive: true, force: true });
const rows = [];
for (const { setup, arm } of setups) {
  const gradeDir = join(SWE, "grades", arm.replace("@", "_"));
  const reportFile = readdirSync(gradeDir).find((f) => f.endsWith(".json") && f.includes(".ltb-"));
  const report = JSON.parse(readFileSync(join(gradeDir, reportFile), "utf8"));
  const resolved = new Set(report.resolved_ids);
  mkdirSync(join(outDir, "data", "grades"), { recursive: true });
  mkdirSync(join(outDir, "data", "predictions"), { recursive: true });
  writeFileSync(join(outDir, "data", "grades", `${setup}.json`), scrub(JSON.stringify({ ...report, setup }, null, 2).replaceAll(arm, setup)) + "\n");
  const preds = [];
  for (const id of ids) {
    const src = join(SWE, "runs", arm, id), dst = join(outDir, "data", "runs", setup, id);
    if (!existsSync(join(src, "run.json"))) continue;
    mkdirSync(dst, { recursive: true });
    const run = JSON.parse(readFileSync(join(src, "run.json"), "utf8"));
    const patch = readFileSync(join(src, "patch.diff"), "utf8");
    copyFileSync(join(src, "patch.diff"), join(dst, "patch.diff"));
    copyFileSync(join(src, "prompt.txt"), join(dst, "prompt.txt"));
    const summary = { setup, instance_id: id, repo: run.repo, models: run.models, started: run.started, wallSeconds: Math.round(run.wallMs / 1000), exitCode: run.exitCode, timedOut: run.timedOut,
      filesChanged: run.filesChanged, resolved: resolved.has(id), tokens: run.tokens };
    writeFileSync(join(dst, "run.json"), scrub(JSON.stringify(summary, null, 2)) + "\n");
    writeFileSync(join(dst, "transcript.jsonl"), scrub(transcript(arm, jsonl(join(src, "events.jsonl"))).map((e) => JSON.stringify(e)).join("\n")) + "\n");
    if (existsSync(join(src, "ltb-usage.jsonl"))) writeFileSync(join(dst, "usage.jsonl"), scrub(readFileSync(join(src, "ltb-usage.jsonl"), "utf8")));
    preds.push({ instance_id: id, model_name_or_path: setup, model_patch: patch });
    rows.push({ setup, id, tokens: run.tokens.total, resolved: resolved.has(id), wall: summary.wallSeconds });
  }
  writeFileSync(join(outDir, "data", "predictions", `${setup}.jsonl`), preds.map((p) => JSON.stringify(p)).join("\n") + "\n");
}
writeFileSync(join(outDir, "data", "results.csv"), "setup,instance_id,tokens,resolved,wall_seconds\n" + rows.map((r) => `${r.setup},${r.id},${r.tokens},${r.resolved},${r.wall}`).join("\n") + "\n");
writeFileSync(join(outDir, "data", "tasks.txt"), ids.join("\n") + "\n");

const left = [];
const walk = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else { const t = readFileSync(p, "utf8"); if (t.includes(HOME) || /nur\.ahmed|nuruddin|gpulogy\.com/i.test(t)) left.push(p); } } };
walk(join(outDir, "data"));
console.log(`${rows.length} runs exported${left.length ? `; STILL IDENTIFYING: ${left.join(", ")}` : "; nothing identifying left"}`);
