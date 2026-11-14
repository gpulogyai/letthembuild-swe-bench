// check(runDir, task): does this run's own record show it reached anything beyond the issue and its repository?
// It reads everything the run wrote (the tool's event stream, LetThemBuild's record, stderr) with byte-array output
// decoded, and the proxy's log. Flags, any one of which marks the run:
//  - network: any host the proxy refused, or any allowed host outside the model providers' own (PyPI is reported,
//    not flagged);
//  - web: a web search or fetch tool called, or a URL of the project's upstream pull, commit or compare pages in
//    any tool result (the issue text itself is left out, since it often links the pull request);
//  - benchmark: a path or name from the benchmark's own files (the dataset, grades, other runs, SWE-bench data);
//  - history: a commit hash later than the base commit (the workspace has none, so this would mean a leak).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
const decode = (t) => t.replace(/\[(\d{1,3}(?:,\d{1,3}){20,})\]/g, (m, s) => { try { return Buffer.from(s.split(",").map(Number)).toString("utf8"); } catch { return m; } });
const PROVIDERS = /(^|\.)(anthropic\.com|claude\.ai|claude\.com|chatgpt\.com|openai\.com|x\.ai|grok\.com|googleapis\.com|google\.com|letthembuild\.com|letthem\.chat|letthemchat\.com)$/;
const WEB_TOOLS = /"(name|tool|toolName|title)":"(WebSearch|WebFetch|web_search|web_fetch|fetch_url|fetch_urls|search_web|read_url_content|browse|browser_[a-z_]+|site_map|search_service\.web_run)"/;
const BENCH = /verified-100\.json|tasks-50\.txt|ltb-tokenbench|swe-bench-public|SWE-bench_Verified|princeton-nlp\/SWE-bench|swebench\.harness|\/grades\/|report\.json|FAIL_TO_PASS|PASS_TO_PASS|gold patch|test_patch/i;
export function check(dir, task) {
  // reached: something outside the issue and its repository got into the run. Any one disqualifies the run.
  // attempted: the run tried (a refused host, a blocked web tool, an upstream URL in a command). Reported, not
  //   disqualifying: under the sandbox and the proxy nothing of it can arrive, which is the point of them.
  // recall: the model itself names the benchmark or its answer (training contamination; no harness can stop it).
  const reached = [], attempted = [], recall = [], notes = [];
  let text = "";
  for (const f of readdirSync(dir)) if (/\.(jsonl|log)$/.test(f) && f !== "network.log") text += decode(readFileSync(join(dir, f), "utf8")) + "\n";
  const issue = task.problem_statement;
  const body = text.split(JSON.stringify(issue).slice(1, -1)).join(" ").split(issue).join(" ");
  if (existsSync(join(dir, "network.log"))) {
    const seen = new Map();
    for (const l of readFileSync(join(dir, "network.log"), "utf8").trim().split("\n").filter(Boolean)) { const [, v, , h] = l.split(" "); seen.set(`${v} ${h}`, (seen.get(`${v} ${h}`) ?? 0) + 1); }
    for (const [k, n] of seen) {
      const [v, h] = k.split(" ");
      if (/pypi\.org|pythonhosted\.org/.test(h)) notes.push(`package index: ${h} (${n})`);
      else if (v === "allowed" && !PROVIDERS.test(h)) reached.push(`network: ${h} was let through`);
      else if (v === "REFUSED" && /mixpanel|sentry|statsig|datadog|segment|oaiusercontent\.com|googleusercontent\.com|^grok\.com$|mcp-proxy\.anthropic\.com|play\.googleapis\.com|aicode\.googleapis\.com/.test(h)) notes.push(`telemetry or asset host refused: ${h} (${n})`);
      else if (v === "REFUSED") attempted.push(`network: ${h} refused (${n})`);
    }
  }
  const w = body.match(WEB_TOOLS); if (w) attempted.push(`web tool called: ${w[2]}`);
  const [org, repo] = task.repo.split("/");
  const up = body.match(new RegExp(`github\\.com/${org}/${repo}/(pull|commit|compare)/[\\w.-]+`, "i")); if (up && !issue.includes(up[0])) attempted.push(`upstream URL: ${up[0]}`); // a link the issue itself carries is not a lookup
  // A benchmark file is reached only if its contents show up; its name alone is an attempt or a recollection.
  if (/"patch": "diff --git|FAIL_TO_PASS"\s*:\s*\[|"instance_id": "[a-z-]+__/.test(body)) reached.push("benchmark: dataset or grading contents in the run");
  const b = body.match(/verified-100\.json|tasks-heldout|ltb-tokenbench|swe-bench-public|\/grades\//); if (b) attempted.push(`benchmark path: ${b[0]}`);
  const r = body.match(/SWE-bench|gold patch|test_patch|princeton-nlp/i); if (r) recall.push(`names the benchmark: "${r[0]}"`);
  return { clean: reached.length === 0, reached, attempted, recall, notes };
}
