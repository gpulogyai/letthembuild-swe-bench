// node quota.mjs <arm@tag> <id>
// Says whether a finished run was spoiled by a seat's plan limit rather than by the work: a model's quota or usage
// limit message in its output. Such a run is removed so it can be run again, and the wait until the limit resets is
// printed in seconds (0 when the run is fine). The run's own result never decides this, only the limit message.
import { readFileSync, existsSync, rmSync, appendFileSync } from "node:fs";
import { join } from "node:path";
const [arm, id] = process.argv.slice(2);
const dir = join(import.meta.dirname, "runs", arm, id);
const text = ["stderr.log", "events.jsonl"].map((f) => existsSync(join(dir, f)) ? readFileSync(join(dir, f), "utf8") : "").join("\n");
const hit = /Individual quota reached|RESOURCE_EXHAUSTED|usage limit reached|hit your (usage )?limit|hit its usage limit|rate limit exceeded|usage balance exhausted|balance ran out|402 Payment Required|Eligibility check failed|loadCodeAssist|workspace routing discovery failed/i.exec(text);
// A lead that never answered (the service down or out of allowance, no message given) spent nothing: no result either.
const spent = existsSync(join(dir, "run.json")) ? JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).tokens?.total || 0 : 0;
const silent = !spent && /No seat could lead this round/.test(text);
if (!hit && !silent) { console.log(0); process.exit(0); }
const m = /Resets in (?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(text);
const wait = m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 900;
{ const ctx = text.slice(Math.max(0, (hit?.index ?? 0) - 200), (hit?.index ?? 0) + 300).replace(/\s+/g, " ");
  appendFileSync(join(import.meta.dirname, "logs", "quota-hits.log"), `${new Date().toISOString()} ${arm} ${id} wait=${wait} ${silent ? "silent-lead" : ""} :: ${ctx}\n`); }
rmSync(dir, { recursive: true, force: true });
console.log(wait + 60);
