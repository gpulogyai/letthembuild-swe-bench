// node harness/charts.mjs
// Draws the README's charts from data/results.csv into charts/, a light and a dark file each, so GitHub can show the
// one that matches the reader's theme. Static SVG: GitHub shows images without scripts or web fonts.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rows = readFileSync(join(ROOT, "data/results.csv"), "utf8").trim().split("\n").slice(1).map((l) => {
  const [setup, id, tokens, resolved, wall] = l.split(",");
  return { setup, id, tokens: +tokens, resolved: resolved === "true", wall: +wall };
});

const THEMES = {
  light: { bg: "#ffffff", fg: "#15181d", muted: "#59606b", rule: "#dde1e7", claude: "#e0773c", codex: "#10a37f", gemini: "#3aa7e6", grok: "#111111" },
  dark: { bg: "#1a1d22", fg: "#eceef1", muted: "#a9b0ba", rule: "#2c3138", claude: "#d96f32", codex: "#12a07c", gemini: "#3399d6", grok: "#e8e8e8" },
};
const SETUPS = [
  { key: "claude-code", name: "Claude Code", family: "claude" },
  { key: "letthembuild-claude", name: "LTB · Claude", family: "claude" },
  { key: "codex", name: "Codex CLI", family: "codex" },
  { key: "letthembuild-codex", name: "LTB · Codex", family: "codex" },
];
const LEGEND = [["claude", "Claude (claude-opus-5-5)"], ["codex", "Codex (gpt-6.1-sol)"]];
const SANS = "-apple-system, 'Segoe UI', 'Instrument Sans', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";

const k = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`;
const pct = (a, b) => { const d = Math.round((a / b - 1) * 100); return d === 0 ? "level" : `${d > 0 ? "+" : "−"}${Math.abs(d)}%`; };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const by = (key) => rows.filter((r) => r.setup === key);
const sum = (rs) => rs.reduce((t, r) => t + r.tokens, 0);

// One chart: rows of bars, each made of segments { v, family, hatched }, a value label, and dashed lines between groups.
function chart({ bars, max, step, tickFmt, groupEvery, legend, note, left = 130, right = 150 }, t) {
  const W = 820, rowH = 44, barH = 24, legendH = legend ? 44 : 8;
  const top = legendH + 8, axisY = top + bars.length * rowH + 4, H = axisY + 30 + (note ? 26 : 0);
  const x = (v) => left + (v / max) * (W - left - right);
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" role="img">`);
  out.push(`<defs>${Object.keys(LEGEND_COLORS(t)).map((f) => `<pattern id="h-${f}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${t[f]}" fill-opacity="0.28"/><rect width="3" height="7" fill="${t[f]}"/></pattern>`).join("")}</defs>`);
  out.push(`<rect width="${W}" height="${H}" rx="14" fill="${t.bg}"/>`);
  if (legend) {
    let lx = 20;
    for (const [f, label, hatched] of legend) {
      out.push(`<rect x="${lx}" y="16" width="14" height="14" rx="3" fill="${hatched ? `url(#h-${f})` : t[f]}"/>`);
      out.push(`<text x="${lx + 22}" y="28" font-family="${SANS}" font-size="14" fill="${t.muted}">${esc(label)}</text>`);
      lx += 22 + label.length * 7.4 + 26;
    }
  }
  for (let v = 0; v <= max + 1; v += step) {
    out.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${axisY}" stroke="${t.rule}"/>`);
    out.push(`<text x="${x(v)}" y="${axisY + 18}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.muted}">${tickFmt(v)}</text>`);
  }
  for (let i = groupEvery; i < bars.length; i += groupEvery) out.push(`<line x1="0" x2="${W}" y1="${top + i * rowH}" y2="${top + i * rowH}" stroke="${t.rule}" stroke-dasharray="3 4"/>`);
  bars.forEach((b, i) => {
    const y = top + i * rowH + (rowH - barH) / 2;
    out.push(`<text x="${left - 12}" y="${y + barH / 2 + 5}" text-anchor="end" font-family="${SANS}" font-size="13.5" fill="${t.fg}">${esc(b.name)}</text>`);
    let acc = 0;
    b.segs.forEach((s, j) => {
      const x0 = x(acc), x1 = x(acc + s.v); acc += s.v;
      const last = j === b.segs.length - 1, w = Math.max(1, x1 - x0 - (last ? 0 : 2));
      const fill = s.hatched ? `url(#h-${s.family})` : t[s.family];
      // Rounded at the data end only: a full rounded bar, with its left corners squared off by a plain rect.
      out.push(`<rect x="${x0}" y="${y}" width="${w}" height="${barH}" rx="${last ? 4 : 0}" fill="${fill}"/>`);
      if (last && w > 4) out.push(`<rect x="${x0}" y="${y}" width="4" height="${barH}" fill="${fill}"/>`);
    });
    out.push(`<text x="${x(acc) + 8}" y="${y + barH / 2 + 4.5}" font-family="${MONO}" font-size="12.5" fill="${t.fg}">${esc(b.label)}</text>`);
  });
  if (note) out.push(`<text x="20" y="${H - 14}" font-family="${SANS}" font-size="12.5" fill="${t.muted}">${esc(note)}</text>`);
  out.push("</svg>");
  return out.join("\n");
}
const LEGEND_COLORS = (t) => ({ claude: t.claude, codex: t.codex });
const tickM = (v) => v === 0 ? "0" : v >= 1e6 ? `${(v / 1e6).toFixed(2).replace(/0$/, "")}M` : `${v / 1000}k`;

const perSolved = Object.fromEntries(SETUPS.map((s) => [s.key, sum(by(s.key)) / by(s.key).filter((r) => r.resolved).length]));
const charts = {
  "tokens-per-solved-issue": {
    bars: SETUPS.map((s, i) => ({ name: s.name, segs: [{ v: perSolved[s.key], family: s.family }],
      label: `${k(perSolved[s.key])}${i % 2 ? `  (${pct(perSolved[s.key], perSolved[SETUPS[i - 1].key])})` : ""}` })),
    max: 700000, step: 100000, tickFmt: tickM, groupEvery: 2, legend: LEGEND,
    note: "All tokens a setup spent on the seven issues, failures included, divided by the issues it solved.",
  },
  "tokens-solved-vs-not": {
    bars: SETUPS.map((s) => {
      const rs = by(s.key), solved = sum(rs.filter((r) => r.resolved)), not = sum(rs.filter((r) => !r.resolved));
      return { name: s.name, segs: [{ v: solved, family: s.family }, { v: not, family: s.family, hatched: true }],
        label: `${k(solved + not)}  · ${Math.round((not / (solved + not)) * 100)}% unsolved` };
    }),
    max: 3000000, step: 500000, tickFmt: tickM, groupEvery: 2, right: 215,
    legend: [["claude", "on issues solved"], ["claude", "on issues not solved", true]],
    note: "Tokens across all seven runs. Solid: spent on issues the setup solved. Striped: spent on issues it did not.",
  },
  "every-issue": {
    bars: [...new Set(rows.map((r) => r.id))].flatMap((id) => SETUPS.map((s, j) => {
      const r = rows.find((x) => x.setup === s.key && x.id === id);
      return { name: j === 0 ? `${id.split("__")[1]} · ${s.name}` : s.name, segs: [{ v: r.tokens, family: s.family, hatched: !r.resolved }],
        label: `${k(r.tokens)}  ${r.resolved ? "✓ solved" : "✗ not solved"}` };
    })),
    max: 1100000, step: 250000, tickFmt: tickM, groupEvery: 4, left: 250, legend: [...LEGEND, ["claude", "not solved", true]],
    note: "One run per setup per issue, graded by the official SWE-bench harness. Striped bars did not solve the issue.",
  },
};

mkdirSync(join(ROOT, "charts"), { recursive: true });
for (const [name, spec] of Object.entries(charts)) for (const [theme, t] of Object.entries(THEMES)) writeFileSync(join(ROOT, "charts", `${name}-${theme}.svg`), chart(spec, t) + "\n");
console.log(`${Object.keys(charts).length * 2} charts written to charts/`);
