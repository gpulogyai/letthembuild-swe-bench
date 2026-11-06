// node grade-full.mjs [tag] [ids-file]   (ARMS=arm,arm to grade chosen setups)
// Grades the full run with the official harness one issue at a time: pull that issue's image (x86, as the harness
// needs on Apple silicon), grade every setup's patch for it, then remove the image, so only one image is on disk.
// A setup already graded for an issue is skipped. Writes grades/<tag>/<arm>.json with resolved and unresolved ids.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";

const SWE = join(os.homedir(), "ltb-tokenbench/swe");
const [tag = "full", idsFile = "tasks-50.txt"] = process.argv.slice(2);
const ids = readFileSync(join(SWE, idsFile), "utf8").trim().split("\n");
// ARMS=a,b grades just those setups (any tags) in one pass, so each issue's image is pulled once for all of them.
const arms = process.env.ARMS ? process.env.ARMS.split(",") : readdirSync(join(SWE, "runs")).filter((a) => a.endsWith(`@${tag}`)).sort();
// One work folder for every tag, so a setup graded once is never graded again under another tag's pass.
const work = join(SWE, "grades", "work");
mkdirSync(work, { recursive: true });
const image = (id) => `swebench/sweb.eval.x86_64.${id.replace("__", "_1776_")}:latest`;
const reportOf = (arm, id) => join(work, "logs", "run_evaluation", `g-${arm.replace("@", "_")}`, arm, id, "report.json");

for (const id of ids) {
  const todo = arms.filter((a) => existsSync(join(SWE, "runs", a, id, "patch.diff")) && !existsSync(reportOf(a, id)));
  if (!todo.length) continue;
  const started = Date.now();
  spawnSync("docker", ["pull", "-q", "--platform", "linux/amd64", image(id)], { stdio: "ignore" });
  for (const arm of todo) {
    const patch = readFileSync(join(SWE, "runs", arm, id, "patch.diff"), "utf8");
    const pred = join(work, `pred-${arm.replace("@", "_")}-${id}.jsonl`);
    writeFileSync(pred, JSON.stringify({ instance_id: id, model_name_or_path: arm, model_patch: patch }) + "\n");
    // An empty patch cannot pass; the harness skips it, and it is recorded as unresolved below.
    if (!patch.trim()) continue;
    spawnSync(join(SWE, ".venv/bin/python"), ["-m", "swebench.harness.run_evaluation", "-d", "SWE-bench/SWE-bench_Verified", "-s", "test",
      "-p", pred, "-i", id, "--max_workers", "1", "-id", `g-${arm.replace("@", "_")}`, "--timeout", "3600"],
      { cwd: work, stdio: "ignore", env: { ...process.env, DOCKER_DEFAULT_PLATFORM: "linux/amd64" } });
  }
  spawnSync("docker", ["rmi", "-f", image(id)], { stdio: "ignore" });
  spawnSync("docker", ["image", "prune", "-f"], { stdio: "ignore" });
  console.log(`${new Date().toISOString()} ${id}: ${todo.length} graded in ${Math.round((Date.now() - started) / 1000)}s`);
}

mkdirSync(join(SWE, "grades", tag), { recursive: true });
for (const arm of arms) {
  const out = { arm, resolved_ids: [], unresolved_ids: [], empty_patch_ids: [], error_ids: [] };
  for (const id of ids) {
    const p = join(SWE, "runs", arm, id, "patch.diff");
    if (!existsSync(p)) continue;
    if (!readFileSync(p, "utf8").trim()) { out.empty_patch_ids.push(id); out.unresolved_ids.push(id); continue; }
    const r = reportOf(arm, id);
    if (!existsSync(r)) { out.error_ids.push(id); continue; }
    (JSON.parse(readFileSync(r, "utf8"))[id]?.resolved ? out.resolved_ids : out.unresolved_ids).push(id);
  }
  writeFileSync(join(SWE, "grades", tag, `${arm.replace("@", "_")}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`${arm}: ${out.resolved_ids.length} resolved, ${out.unresolved_ids.length} not, ${out.error_ids.length} not graded`);
}
