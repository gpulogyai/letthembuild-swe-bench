# Pre-registration: SWE-bench Verified, held-out 50, v2 harness

Written 2026-11-14 before any held-out run. Nothing below changes once the first held-out run starts; a change
afterwards is listed at the end with its date and reason.

## Question

How many tokens does the same model use as LetThemBuild's only seat, compared with running its own CLI directly,
on issues neither setup was tuned on, and does it solve a different number of them?

## Issues

The 50 issues of the seeded 100 that the first published run did not use (`tasks-heldout-50.txt`, sha256
prefix f23d4414a9fb5274): `random.Random(20261023)` over the sorted SWE-bench Verified ids, then the second 50 by
`sha256("letthembuild-swe-2026-11:" + id)`. LetThemBuild has never been run on them.

## Setups, frozen

| Setup | What runs |
|---|---|
| Claude Code alone | Claude Code 2.1.311, claude-opus-5-5, `--permission-mode auto`, a clean home folder (no plugins) |
| Codex alone | Codex CLI 0.167.0, gpt-6.1-sol |
| Antigravity alone | Antigravity CLI 1.5.9, gemini-4-argon-high |
| Grok alone | Grok CLI 1.0.70, grok-4.7 |
| LetThemBuild · each model | LetThemBuild bench build 8fa13171e (main 409a4a0fb plus the measurement hooks), that CLI as its one seat |

Two runs per setup per issue, a 40-minute limit, one Mac. Within each model the CLI alone and LetThemBuild run the
same issue one after the other.

## Isolation, the same for every setup

- The workspace holds the repository at the base commit and no later history.
- One kernel profile: the run sees only its workspace, a fresh home folder, the CLIs' programs and the login
  keychain. The benchmark's own files do not exist for it.
- Network only through a proxy that admits the model providers, LetThemBuild's account service and PyPI.
- Every CLI's web search and fetch are off; LetThemBuild's own web tools are off.

## Counting rules

- **Tokens:** each tool's own count, input, cache reads, cache writes and output, per call where the tool gives it.
- **Solved:** the official harness, `swebench` against SWE-bench Verified.
- **A run is excluded** when its contamination check finds anything outside the issue and its repository reached
  it. Excluded runs are listed by name. Attempts that the isolation refused are reported, not excluded.
- **A run cut short by a plan's usage limit** is discarded and run again after the reset. No other run is rerun.
- **A run without a token count is a failed run,** counted as unsolved and shown separately; never as zero tokens.
- **Model recall:** runs where the model names the benchmark or its answer are counted and reported.

## Analysis, fixed now

Per model: total tokens per setup (mean of the two runs), the change, and a 95% range from resampling the 50
issues 10,000 times with each issue's runs kept together; issues solved with a 95% interval; the difference read
as "no detectable difference" unless the interval excludes zero. All four models are reported whatever the result.

## Changes after the first held-out run

- 2026-11-14, driver only: run-all.sh takes a lock so a second copy cannot start. A second copy did start once; the five
  runs it touched were deleted and rerun.
- 2026-11-14, driver only: run.mjs exits once its result line is written. A provider connection left open by the CLI
  had kept one finished run's process alive for four hours, and its lane waited behind it. No run's result changed.
- 2026-11-14, added arm: LetThemBuild + Claude with a trimmed Claude Code lead brief (build a8cb60835), two runs on the
  same 50 issues under tags trim1 and trim2. The trim was chosen after this run's Claude results were seen, and tested
  first on 15 tuning issues; it is reported as an added, post-hoc arm beside the pre-registered ones, which are
  unchanged. Its Claude Code comparison is the pre-registered cc runs, made earlier the same day.
- 2026-11-15, driver only: run.mjs reads an optional SWE_DATA issue file, for a separate experiment on 25 other
  Verified issues. Unset, as in every pre-registered run, it reads the same 100 issues as before.
- 2026-11-17, reporting: the results for Claude and Codex are published while the Gemini and Grok runs, held by
  their plans' usage limits, continue. Those two are added when they finish, under the same analysis.
- 2026-11-17, LetThemBuild · Codex run again: the harness's profile was meant to stand in for every seat's sandbox,
  and Codex alone ran with its own sandbox off for that reason. The LetThemBuild · Codex seat instead kept Codex's own
  sandbox, which macOS cannot run inside the harness's, so each of its commands went to Codex's guardian reviewer,
  a second model whose tokens the count did not include. The setup is run again, two runs on the same 50 issues
  (`letthembuild-codex-rerun`), with one change: the seat runs as it does under LetThemBuild's own sandbox, with
  Codex 0.167.0 as frozen and Codex's own session logs kept so every session is counted. The Codex-alone runs are
  unchanged. The first LetThemBuild · Codex figures are kept and shown beside the new ones.
- 2026-11-18, analysis: verdict.mjs and charts.mjs now apply the failed-run rule above (a run without a token count
  is unsolved and left out of its issue's token mean). It changes no published figure; it applies to one rerun.
- 2026-11-18, added experiment, not pre-registered: Codex alone against LetThemBuild · Codex with the short lead
  brief Claude Code seats use, the seat run as in the rerun, on 25 other Verified issues (`v2/fresh-25/`), two runs
  each, Codex CLI 0.169.0 for both. The brief was chosen on 15 issues of the first run before this test.
- 2026-11-18, reporting: the README reports LetThemBuild · Claude with the brief LetThemBuild ships (the arm added on
  2026-11-14, now published as `letthembuild-claude`). The pre-registered build's Claude runs are published unchanged
  as `letthembuild-claude-first-brief`, and their figures are given beside it.
- 2026-11-18, added arm and reporting: LetThemBuild · Codex with the brief LetThemBuild ships for Codex seats (build
  c5ae2f964: the short lead brief, each of the room's tools and rules named once), the seat run as in the rerun,
  Codex 0.167.0 as frozen, two runs on the same 50 issues under tags lean1 and lean2. Chosen after the results above
  were seen, on 15 issues of the first run. The README now reports it as `letthembuild-codex`, one comparison per
  model. The earlier Codex setups are published unchanged under new names: the first runs as
  `letthembuild-codex-first-run`, the rerun as `letthembuild-codex-full-brief`.
- 2026-11-18, added experiment, not pre-registered: two-seat rooms on the same 50 held-out issues, two runs each,
  with the build and briefs LetThemBuild ships (bbc845bba), Claude Code 2.1.311 and Codex 0.167.0 as frozen, the
  same models: Claude leading with Codex reviewing (`letthembuild-claude-codex-review`) and Codex leading with Claude
  reviewing (`letthembuild-codex-claude-review`), one round limit as LetThemBuild runs it, the Codex seat run as in
  `letthembuild-codex`. Each is compared, under the analysis above, with its lead's CLI alone and with LetThemBuild
  with the lead as its one seat; tokens in each round are from `v2/harness/rounds.mjs`. In these rooms Claude Code's
  own web fetch was available to the Claude seat; it was called five times and the proxy refused each call.
- 2026-11-19, data: transcripts are scrubbed value by value, so every line of every v2 transcript is valid JSON. 56
  lines in earlier setups' transcripts changed where a code escape had been read as part of an address; no figure
  changed.
- 2026-11-19, data: the transcripts in `full-50/data`, `v2/data` and `v2/fresh-25/data` are rewritten from the raw
  runs, scrubbed value by value with the end-of-value rule kept, so every line parses as JSON and code such as a
  `@decorator` after a line break reads as written. Only transcript lines change; no patch, grade or figure does.
- 2026-11-19, reporting: cost at list price, already given for Claude, is given for every setup, each model at its own
  price (gpt-6.1-sol input $2, cached input $0.10, output $10 per million tokens). `verdict.mjs` takes `PRICE=list`
  (`PRICE=claude` still works and prints the same figures for Claude), and `rounds.mjs` gives each turn's cost.
- 2026-11-24, reporting: the README reports tokens and issues solved, the outcomes pre-registered above, and no
  longer gives cost; `verdict.mjs` and `rounds.mjs` no longer price tokens. The per-type token counts in each
  `run.json` (`tokens.bySource`) are unchanged. No run, patch, grade or token figure changed.
