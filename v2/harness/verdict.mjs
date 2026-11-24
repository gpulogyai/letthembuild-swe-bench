// node v2/harness/verdict.mjs <alone,alone-run2> <letthembuild,letthembuild-run2>   (from the repository root)
// The pre-registered analysis for one model: total tokens per setup (mean of the two runs), the change, a 95% range
// from resampling the issues 10,000 times with each issue's runs kept together (fixed seed), and issues solved with
// a 95% interval on the difference, from the same resamples. A run without a token count is a failed run, as
// pre-registered: counted as unsolved, left out of its issue's token mean, and listed. DATA=<folder> reads another
// data folder (v2/fresh-25/data).
import { readFileSync } from "node:fs";
import { join } from "node:path";
const DATA = process.env.DATA ?? join(import.meta.dirname, "..", "data");
const [aloneArg, ltbArg] = process.argv.slice(2);
const ids = readFileSync(join(DATA, "tasks.txt"), "utf8").trim().split("\n");
const solvedBy = (setup) => new Set(JSON.parse(readFileSync(join(DATA, "grades", setup + ".json"), "utf8")).resolved_ids);
const load = (setup) => ids.map((id) => JSON.parse(readFileSync(join(DATA, "runs", setup, id, "run.json"), "utf8")));
const side = (arg) => {
  const tags = arg.split(",");
  const runs = tags.map(load), solved = tags.map(solvedBy);
  const failed = (r, i) => !(r[i].tokens.total > 0);
  const tokens = ids.map((_, i) => { const ok = runs.filter((r) => !failed(r, i)); return ok.length ? ok.reduce((s, r) => s + r[i].tokens.total, 0) / ok.length : 0; });
  const won = (k, i) => solved[k].has(ids[i]) && !failed(runs[k], i);
  const wins = ids.map((_, i) => tags.reduce((s, _, k) => s + (won(k, i) ? 1 : 0), 0) / tags.length);
  const failures = tags.flatMap((t, k) => ids.filter((_, i) => failed(runs[k], i)).map((id) => `${t} ${id}`));
  return { tags, runs, tokens, wins, failures, perRun: runs.map((r) => r.reduce((s, x) => s + x.tokens.total, 0)), solvedPerRun: tags.map((_, k) => ids.filter((_, i) => won(k, i)).length) };
};
const A = side(aloneArg), B = side(ltbArg);
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
let seed = 20261114 >>> 0; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const ch = [], dw = [];
for (let k = 0; k < 10000; k++) { let a = 0, b = 0, w = 0; for (let j = 0; j < ids.length; j++) { const i = Math.floor(rnd() * ids.length); a += A.tokens[i]; b += B.tokens[i]; w += B.wins[i] - A.wins[i]; } ch.push(b / a - 1); dw.push(w); }
ch.sort((x, y) => x - y); dw.sort((x, y) => x - y);
const q = (xs, p) => xs[Math.floor(p * (xs.length - 1))];
const M = (n) => (n / 1e6).toFixed(2) + "M", P = (x) => (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x * 100).toFixed(1) + "%";
const fewer = ids.filter((_, i) => B.tokens[i] < A.tokens[i]).length;
for (const [name, s] of [["alone", A], ["ltb", B]]) console.log(`${name} ${s.tags.join(",")}: solved ${s.solvedPerRun.join(" · ")} (mean ${sum(s.wins)}), tokens ${s.perRun.map(M).join(" · ")}, mean ${M(sum(s.tokens))}`);
for (const s of [A, B]) if (s.failures.length) console.log(`failed runs, no token count (unsolved): ${s.failures.join(", ")}`);
console.log(`change ${P(sum(B.tokens) / sum(A.tokens) - 1)}, 95% range ${P(q(ch, 0.025))} to ${P(q(ch, 0.975))}, fewer tokens on ${fewer} of ${ids.length}`);
const d = sum(B.wins) - sum(A.wins);
console.log(`solved difference ${d >= 0 ? "+" : "−"}${Math.abs(d)} issues, 95% interval ${q(dw, 0.025)} to ${q(dw, 0.975)} → ${q(dw, 0.025) > 0 || q(dw, 0.975) < 0 ? "a detectable difference" : "no detectable difference"}`);
