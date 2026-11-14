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

None.
