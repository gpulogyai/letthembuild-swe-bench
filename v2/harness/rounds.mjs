// node v2/harness/rounds.mjs <setup,setup-run2>   (from the repository root)
// Tokens per round and per seat for a two-seat room. Each turn's usage line (usage.jsonl) is matched in order to the
// turn's start in the room's transcript, which names the round, the speaker and the lead. The lead's turn after the
// last review is the closing summary. Per-run figures count a run that did not reach a round as zero, so the rows
// add up to the setup's tokens per run.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const DATA = process.env.DATA ?? join(import.meta.dirname, "..", "data");
const setups = process.argv[2].split(",");
const ids = readFileSync(join(DATA, "tasks.txt"), "utf8").trim().split("\n");
const lines = (f) => readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const rows = new Map(), reached = {}; let runs = 0, total = 0;
for (const setup of setups) for (const id of ids) {
  const dir = join(DATA, "runs", setup, id); runs++;
  const usage = lines(join(dir, "usage.jsonl")).filter((u) => u.kind === "cli-turn");
  let round = 0, lead = null; const turns = [];
  for (const e of lines(join(dir, "transcript.jsonl"))) {
    if (e.type === "round") { round = e.round; lead = e.lead; }
    if (e.type === "message_start" && e.speaker) {
      const last = turns[turns.length - 1];
      turns.push({ round, speaker: e.speaker, role: e.speaker !== lead ? "review" : last?.round === round && last.role === "review" ? "summary" : "lead" });
    }
  }
  if (turns.length !== usage.length || turns.some((t, i) => t.speaker !== usage[i].provider)) throw new Error(`${setup} ${id}: turns and usage lines do not match`);
  const top = Math.max(...turns.map((t) => t.round)); reached[top] = (reached[top] ?? 0) + 1;
  turns.forEach((t, i) => {
    const u = usage[i], key = t.role === "summary" ? `9|summary|${u.model}` : `${t.round}|${t.role}|${u.model}`;
    const r = rows.get(key) ?? { turns: 0, tokens: 0, output: 0 };
    r.turns++; r.tokens += u.tokens; r.output += u.usage.outputTokens; rows.set(key, r); total += u.tokens;
  });
}
const k = (n) => `${Math.round(n / 1000)}k`;
console.log(`${setups.join(", ")}: ${runs} runs; last round reached ${Object.entries(reached).map(([r, n]) => `${r}: ${n} runs`).join(", ")}; ${k(total / runs)} tokens per run`);
console.log("turn                model             turns   per turn   per run   output per turn");
for (const [key, r] of [...rows].sort()) {
  const [round, role, model] = key.split("|");
  console.log(`${(round === "9" ? "closing summary" : `round ${round} ${role}`).padEnd(20)}${model.padEnd(18)}${String(r.turns).padStart(5)}${k(r.tokens / r.turns).padStart(11)}${k(r.tokens / runs).padStart(10)}${String(Math.round(r.output / r.turns)).padStart(18)}`);
}
