// node harness/charts-full.mjs
// Draws the 50-issue charts from full-50/data/results.csv into charts/, a light and a dark file each. Every setup ran
// twice; a model's figure is the mean of its two runs. Static SVG: GitHub shows images without scripts or web fonts.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rows = readFileSync(join(ROOT, "full-50/data/results.csv"), "utf8").trim().split("\n").slice(1).map((l) => {
  const [setup, id, tokens, resolved] = l.split(",");
  return { setup, id, tokens: +tokens, resolved: resolved === "true" };
});

const THEMES = {
  light: { bg: "#ffffff", fg: "#15181d", muted: "#59606b", rule: "#dde1e7", claude: "#e0773c", codex: "#10a37f", gemini: "#3aa7e6", grok: "#111111" },
  dark: { bg: "#1a1d22", fg: "#eceef1", muted: "#a9b0ba", rule: "#2c3138", claude: "#d96f32", codex: "#12a07c", gemini: "#3399d6", grok: "#e8e8e8" },
};
const MODELS = [
  { family: "claude", cli: "claude-code", ltb: "letthembuild-claude", cliName: "Claude Code", ltbName: "LTB · Claude" },
  { family: "gemini", cli: "gemini", ltb: "letthembuild-gemini", cliName: "Antigravity CLI", ltbName: "LTB · Gemini" },
  { family: "codex", cli: "codex", ltb: "letthembuild-codex", cliName: "Codex CLI", ltbName: "LTB · Codex" },
  { family: "grok", cli: "grok", ltb: "letthembuild-grok", cliName: "Grok CLI", ltbName: "LTB · Grok" },
];
const SANS = "-apple-system, 'Segoe UI', 'Instrument Sans', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const M = (n) => `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
const pct = (a, b) => { const d = Math.round((a / b - 1) * 100); return d === 0 ? "level" : `${d > 0 ? "+" : "−"}${Math.abs(d)}%`; };
const runs = (setup) => [setup, `${setup}-run2`].map((s) => rows.filter((r) => r.setup === s));
const tokens = (setup) => runs(setup).map((rs) => rs.reduce((t, r) => t + r.tokens, 0));
const solved = (setup) => runs(setup).map((rs) => rs.filter((r) => r.resolved).length);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// Rows of single bars in pairs: a model's own CLI (the family colour, lightened) above LetThemBuild with that model
// (the family colour, solid), a value label after each bar, and a dashed line between models.
function chart({ bars, max, step, tickFmt, note, left = 132, right = 190 }, t) {
  const W = 820, rowH = 40, barH = 22, top = 52, axisY = top + bars.length * rowH + 4, H = axisY + 30 + 26;
  const x = (v) => left + (v / max) * (W - left - right);
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" role="img">`, `<rect width="${W}" height="${H}" rx="14" fill="${t.bg}"/>`];
  out.push(`<rect x="20" y="16" width="14" height="14" rx="3" fill="${t.muted}" fill-opacity="0.4"/><text x="42" y="28" font-family="${SANS}" font-size="14" fill="${t.muted}">the model's own CLI</text>`);
  out.push(`<rect x="210" y="16" width="14" height="14" rx="3" fill="${t.muted}"/><text x="232" y="28" font-family="${SANS}" font-size="14" fill="${t.muted}">LetThemBuild, that model as its one seat</text>`);
  for (let v = 0; v <= max + 1e-9; v += step) {
    out.push(`<line x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${axisY}" stroke="${t.rule}"/>`);
    out.push(`<text x="${x(v)}" y="${axisY + 18}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.muted}">${tickFmt(v)}</text>`);
  }
  for (let i = 2; i < bars.length; i += 2) out.push(`<line x1="0" x2="${W}" y1="${top + i * rowH}" y2="${top + i * rowH}" stroke="${t.rule}" stroke-dasharray="3 4"/>`);
  bars.forEach((b, i) => {
    const y = top + i * rowH + (rowH - barH) / 2, w = Math.max(1, x(b.v) - x(0)), op = b.own ? ' fill-opacity="0.4"' : "";
    out.push(`<text x="${left - 12}" y="${y + barH / 2 + 5}" text-anchor="end" font-family="${SANS}" font-size="13.5" fill="${t.fg}">${esc(b.name)}</text>`);
    // Rounded at the data end only, as one shape so a lightened bar has no darker overlap.
    out.push(`<path d="M${x(0)},${y}H${x(0) + w - 4}a4,4 0 0 1 4,4V${y + barH - 4}a4,4 0 0 1 -4,4H${x(0)}Z" fill="${t[b.family]}"${op}/>`);
    out.push(`<text x="${x(b.v) + 8}" y="${y + barH / 2 + 4.5}" font-family="${MONO}" font-size="12.5" fill="${t.fg}"${b.own ? "" : ' font-weight="600"'}>${esc(b.label)}</text>`);
  });
  out.push(`<text x="20" y="${H - 14}" font-family="${SANS}" font-size="12.5" fill="${t.muted}">${esc(note)}</text>`, "</svg>");
  return out.join("\n");
}

const charts = {
  "full-50-tokens": {
    bars: MODELS.flatMap((m) => {
      const a = mean(tokens(m.cli)), b = mean(tokens(m.ltb));
      return [{ name: m.cliName, family: m.family, own: true, v: 100, label: M(a) }, { name: m.ltbName, family: m.family, v: (b / a) * 100, label: `${M(b)}  (${pct(b, a)})` }];
    }),
    max: 100, step: 25, tickFmt: (v) => `${v}%`,
    note: "Tokens for all 50 issues, mean of two runs. Bar length is relative to each model's own CLI; the labels are the totals.",
  },
  "full-50-solved": {
    bars: MODELS.flatMap((m) => [[m.cli, m.cliName, true], [m.ltb, m.ltbName, false]].map(([key, name, own]) => {
      const s = solved(key);
      return { name, family: m.family, own, v: mean(s), label: `${s[0]} and ${s[1]} of 50` };
    })),
    max: 50, step: 10, tickFmt: (v) => String(v),
    note: "Issues solved out of 50 in each of the two runs, graded by the official SWE-bench harness. Bar length is the mean.",
  },
};

mkdirSync(join(ROOT, "charts"), { recursive: true });
for (const [name, spec] of Object.entries(charts)) for (const [theme, t] of Object.entries(THEMES)) writeFileSync(join(ROOT, "charts", `${name}-${theme}.svg`), chart(spec, t) + "\n");
console.log(`${Object.keys(charts).length * 2} charts written to charts/`);
