// node harness/verdict.mjs [folder] [setupA] [setupB] — paired comparison of two setups on the same issues.
// Reads <folder>/data/results.csv and <folder>/data/difficulty.json (SWE-bench Verified's own labels). Prints total
// tokens, the change from A to B with a 95% bootstrap range (10,000 resamples of issues, fixed seed, so every run of
// this script prints the same range), the split by difficulty, and issues solved with tokens per solved issue.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const [dir = "full-50", A = "codex", B = "letthembuild-codex"] = process.argv.slice(2);
const root = resolve(import.meta.dirname, "..", dir, "data");
const rows = readFileSync(join(root, "results.csv"), "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
const level = JSON.parse(readFileSync(join(root, "difficulty.json"), "utf8"));
const by = (setup) => Object.fromEntries(rows.filter((r) => r[0] === setup).map((r) => [r[1], { tokens: +r[2], resolved: r[3] === "true" }]));
const a = by(A), b = by(B);
const ids = Object.keys(a).filter((id) => b[id]);
// mulberry32: a small seeded generator, so the range is reproducible.
let seed = 20261104;
const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function range(pairs, n = 10000) {
  const r = [];
  for (let k = 0; k < n; k++) { let x = 0, y = 0; for (let i = 0; i < pairs.length; i++) { const [p, q] = pairs[(rand() * pairs.length) | 0]; x += p; y += q; } r.push(y / x - 1); }
  r.sort((p, q) => p - q); return [r[Math.floor(n * 0.025)], r[Math.floor(n * 0.975)]];
}
const pct = (x) => (x >= 0 ? "+" : "") + (x * 100).toFixed(1) + "%";
const M = (t) => (t / 1e6).toFixed(2) + "M";
console.log(`${A} vs ${B}, ${ids.length} issues paired`);
const groups = [["all", () => true], ...[...new Set(Object.values(level))].sort().map((l) => [l, (id) => level[id] === l])];
for (const [name, keep] of groups) {
  const pairs = ids.filter(keep).map((id) => [a[id].tokens, b[id].tokens]);
  const x = pairs.reduce((s, p) => s + p[0], 0), y = pairs.reduce((s, p) => s + p[1], 0);
  const [lo, hi] = range(pairs);
  console.log(`${name.padEnd(16)} n=${String(pairs.length).padStart(2)}  ${A} ${M(x)}  ${B} ${M(y)}  ${pct(y / x - 1)}  95% range ${pct(lo)} to ${pct(hi)}  ${B} fewer on ${pairs.filter((p) => p[1] < p[0]).length}`);
}
for (const [s, r] of [[A, a], [B, b]]) {
  const solved = ids.filter((id) => r[id].resolved).length, total = ids.reduce((t, id) => t + r[id].tokens, 0);
  console.log(`${s.padEnd(20)} solved ${solved}/${ids.length}, ${M(total / solved)} tokens per solved issue`);
}
