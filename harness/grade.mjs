// node grade.mjs <arm> [ids-file]
// The official SWE-bench harness over one setup's patches: writes grades/<arm>/predictions.jsonl, runs
// swebench.harness.run_evaluation in the local venv, and leaves its report in grades/<arm>/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const SWE = resolve(process.env.BENCH_DIR ?? ".");
const [arm, idsFile = "tasks-50.txt"] = process.argv.slice(2);
if (!arm) { console.error("usage: node grade.mjs <arm> [ids-file]"); process.exit(2); }
const ids = readFileSync(join(SWE, idsFile), "utf8").trim().split("\n");
const dir = join(SWE, "grades", arm.replace("@", "_"));
mkdirSync(dir, { recursive: true });
const preds = ids.filter((id) => existsSync(join(SWE, "runs", arm, id, "patch.diff")))
  .map((id) => ({ instance_id: id, model_name_or_path: arm, model_patch: readFileSync(join(SWE, "runs", arm, id, "patch.diff"), "utf8") }));
const predFile = join(dir, "predictions.jsonl");
writeFileSync(predFile, preds.map((p) => JSON.stringify(p)).join("\n") + "\n");
console.log(`${arm}: ${preds.length} predictions`);
execFileSync(process.env.PYTHON ?? join(SWE, ".venv/bin/python"), ["-m", "swebench.harness.run_evaluation", "-d", "SWE-bench/SWE-bench_Verified", "-s", "test",
  "-p", predFile, "--max_workers", process.env.EVAL_WORKERS ?? "3", "-id", `ltb-${arm.replace("@", "_")}`, "--timeout", "3600", "--report_dir", dir],
  { cwd: dir, stdio: "inherit", env: { ...process.env, DOCKER_DEFAULT_PLATFORM: "linux/amd64" } });
