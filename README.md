<sub>LETTHEMBUILD BENCHMARK · SWE-BENCH VERIFIED · NOVEMBER 2026 · 50 HELD-OUT ISSUES · PRE-REGISTERED</sub>

# What a coding CLI costs as a LetThemBuild seat

LetThemBuild runs a model's own command-line tool as a seat in a room. This benchmark measures what that costs:
the same model, on the same issues, run once in its own CLI and once as LetThemBuild's only seat, running that same
CLI underneath. The issues come from [SWE-bench Verified](https://www.swebench.com/), and every patch is graded by
the official SWE-bench harness against the project's own tests.

The held-out run below was pre-registered: the issues, the frozen versions, the isolation and the analysis were
published in [`v2/PREREGISTRATION.md`](v2/PREREGISTRATION.md) before the first run, on 50 issues LetThemBuild had
never been run on. Every patch, transcript, token count and contamination check is in [`v2/data/`](v2/data), and
[`v2/harness/`](v2/harness) is the exact runner.

This is a 50-issue sample, two runs per setup, not a leaderboard result.

> **Claude and Codex are complete. Gemini and Grok are still running** and are added here when they finish, under
> the same analysis. Their plans' usage limits pace them.

## What we found

- **Claude used 35% fewer tokens as a LetThemBuild seat than in Claude Code** (95% range −40% to −30%), fewer on 46
  of the 50 issues.
- **Codex used 16% more tokens as a LetThemBuild seat than in the Codex CLI** (95% range +4% to +29%), more on 38 of
  the 50 issues.
- **Issues solved showed no detectable difference for either model.** Claude solved 47.5 against 49 for Claude Code
  (difference −1.5, 95% interval −4 to 0); Codex 44 against 43 for the Codex CLI (+1, interval 0 to +2.5). Both
  intervals reach zero, Claude's only just.
- **Fewer tokens did not mean lower cost for Claude.** At list prices the Claude seat cost 13% more (+7% to +18%):
  the saving was in cache reads, which are cheap, while the seat wrote more and said more, which is not.
- **A shorter brief, added after these results, closed the cost gap for Claude.** With it the seat used 50% fewer
  tokens than Claude Code (−53% to −46%), fewer on all 50 issues, at about the same cost (−3%, range −8% to +2%),
  and solved the same 47.5. This setup was chosen after seeing the results above, so it is reported apart from the
  pre-registered ones.

## Tokens

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/heldout-50-tokens-dark.svg">
  <img alt="Tokens for the 50 held-out issues, mean of two runs: Claude Code 13.2M, LetThemBuild with Claude 8.6M (−35%), with the trimmed brief 6.7M (−50%); Codex CLI 7.0M, LetThemBuild with Codex 8.2M (+16%)." src="charts/heldout-50-tokens-light.svg" width="820">
</picture>

Tokens are everything the model read and wrote: fresh input, cache reads, cache writes and output, as each tool
reports them.

## Issues solved

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/heldout-50-solved-dark.svg">
  <img alt="Issues solved out of 50 in each of two runs: Claude Code 49 and 49, LetThemBuild with Claude 47 and 48, with the trimmed brief 47 and 48; Codex CLI 43 and 43, LetThemBuild with Codex 44 and 44." src="charts/heldout-50-solved-light.svg" width="820">
</picture>

## Every setup

| Setup | Model | Solved, run 1 · run 2 | Tokens, run 1 · run 2 | Mean | Change | 95% range | Fewer tokens on | Time per run |
|---|---|---:|---:|---:|---:|---|---:|---:|
| Claude Code alone | claude-opus-5-5 | 49 · 49 | 12.82M · 13.65M | 13.24M | | | | 30 min |
| **LetThemBuild · Claude** | claude-opus-5-5 | **47 · 48** | **9.09M · 8.06M** | **8.57M** | **−35.2%** | −39.6% to −30.4% | 46 of 50 | 44 min |
| LetThemBuild · Claude, trimmed brief* | claude-opus-5-5 | 47 · 48 | 6.64M · 6.68M | 6.66M | −49.7% | −53.2% to −46.1% | 50 of 50 | 34 min |
| Codex CLI alone | gpt-6.1-sol | 43 · 43 | 7.21M · 6.86M | 7.03M | | | | 36 min |
| **LetThemBuild · Codex** | gpt-6.1-sol | **44 · 44** | **8.14M · 8.17M** | **8.16M** | **+16.0%** | +4.3% to +28.7% | 12 of 50 | 67 min |

\* Added after the pre-registered results were seen; see below. An issue's tokens are the mean of its two runs.
The ranges come from resampling the 50 issues 10,000 times, keeping each issue's runs together, with a fixed seed.
Time per run is the wall-clock time for all 50 issues, mean of the two runs.

### Issues solved, with intervals

| Model | Own CLI | LetThemBuild | Difference | 95% interval | Reading |
|---|---:|---:|---:|---|---|
| Claude | 49 | 47.5 | −1.5 | −4 to 0 | no detectable difference |
| Claude, trimmed brief* | 49 | 47.5 | −1.5 | −4 to 0 | no detectable difference |
| Codex | 43 | 44 | +1 | 0 to +2.5 | no detectable difference |

Mean of the two runs. The interval is from the same resampling as the token ranges; a difference counts as
detectable only when its interval excludes zero, as pre-registered.

### Cost, Claude only

| Setup | Cost per run of 50, list price | Change | 95% range | Cheaper on |
|---|---:|---:|---|---:|
| Claude Code alone | $8.04 | | | |
| LetThemBuild · Claude | $9.06 | +12.7% | +7.3% to +18.4% | 10 of 50 |
| LetThemBuild · Claude, trimmed brief* | $7.79 | −3.1% | −8.1% to +2.1% | 27 of 50 |

Cost is not a pre-registered outcome; it is here because tokens alone hide it. Prices per million tokens for
claude-opus-5-5: input $4, cache read $0.20, cache write $5 (the five-minute cache), output $20. Claude Code
writes to the one-hour cache, at $8 a million; at that price every setup costs more and the comparison barely moves.

## Why the two models went different ways

A LetThemBuild seat reads LetThemBuild's own brief with every call: how to check a change, how to report it to the
room. What that costs depends on what the CLI already carries.

- **Claude Code starts heavy, so the seat saves.** As a seat it starts without the tools and instructions the room
  already covers, and that saving is larger than the brief. It showed up as 8.1M cache reads against 12.1M in run 1.
- **But the brief made the Claude seat do more.** It made 954 tool calls over the two runs to Claude Code's 743, wrote
  87% more text between steps and gave answers 60% longer. Output and cache writes are the expensive tokens, so cost
  went up while tokens went down. The trimmed brief removes most of that: the step-by-step narration, a repeated
  account of how each change was checked, and repeated searches for a way to run tests that will not run here.
- **The Codex CLI already starts lean, so the brief is extra.** Over the two runs the Codex seat wrote about 50%
  more output and read more context than the Codex CLI alone, and took nearly twice as long, without a detectable
  difference in issues solved.

## The trimmed brief, added afterwards

The pre-registered LetThemBuild build carried the brief as it was on 14 November 2026. After the Claude results
above, the brief was shortened (build a8cb60835) and tested first on 15 issues from the earlier run, then run twice
on the same 50 held-out issues under the same harness. Its comparison is the pre-registered Claude Code runs, made
earlier the same day. Because it was chosen after seeing the results, it is reported as an added setup, and the
pre-registered figures above are unchanged. The trimmed brief is now LetThemBuild's brief for Claude Code seats.

## How the held-out run was isolated

The same for every setup, as pre-registered:

- The workspace holds the repository at the issue's base commit and no later history.
- One macOS kernel profile: the run sees only its workspace, a fresh home folder, the CLIs' programs and the login
  keychain. The benchmark's own files do not exist for it.
- Network only through a proxy that admits the model providers, LetThemBuild's account service and PyPI.
- Every CLI's web search and fetch are off, and so are LetThemBuild's own web tools.

Versions: Claude Code 2.1.311, Codex CLI 0.167.0, LetThemBuild bench build 8fa13171e (the trimmed setup a8cb60835),
claude-opus-5-5 and gpt-6.1-sol. One Apple M5 Mac, 14–15 November 2026, a 40-minute limit per run; no run reached
it. Within each model the CLI alone and LetThemBuild ran the same issue one after the other.

### Contamination checks

Every run carries a `contamination.json`: what reached it from outside the issue and its repository, what the
isolation refused, and whether the model named the benchmark.

- **Nothing outside the issue and its repository reached any of the 500 Claude and Codex runs.** No run is excluded.
- **Four flags for attempts, none of which reached a run.** One Claude Code run tried github.com and was refused;
  in three runs the check flagged a link to an upstream pull request that sits in a comment in the project's own
  code. Reported, as pre-registered, not excluded.
- **One flag for naming the benchmark, in nine runs of one issue,** matplotlib-23412: the word it matched was part of
  `test_patches.py`, the project's own test file, not the benchmark.

## Check it yourself

Print every figure above from the published data:

```bash
node v2/harness/verdict.mjs claude-code,claude-code-run2 letthembuild-claude,letthembuild-claude-run2
node v2/harness/verdict.mjs claude-code,claude-code-run2 letthembuild-claude-trimmed,letthembuild-claude-trimmed-run2
node v2/harness/verdict.mjs codex,codex-run2 letthembuild-codex,letthembuild-codex-run2
PRICE=claude node v2/harness/verdict.mjs claude-code,claude-code-run2 letthembuild-claude,letthembuild-claude-run2
node v2/harness/charts.mjs
```

Regrade the patches with the official harness (Docker, no model calls):

```bash
python -m venv .venv && .venv/bin/pip install swebench==5.0.2
.venv/bin/python -m swebench.harness.run_evaluation -d SWE-bench/SWE-bench_Verified -s test \
  -p v2/data/predictions/letthembuild-claude.jsonl -id regrade --max_workers 3
```

`v2/data/` has the same layout as `full-50/data/`, described at the end of this page, with a `contamination.json`
beside each run. Setups are `claude-code`, `codex`, `letthembuild-claude`, `letthembuild-claude-trimmed` and
`letthembuild-codex`, each with a `-run2`.

## What this does not show

- **Fifty issues, two runs each.** The ranges say how much runs vary; a solved difference of one or two issues is
  within that.
- **One seat only.** A room with reviewers reads the problem more than once and costs more; that is a different
  measurement.
- **One machine, one week's models and CLIs.** Results move as they change; versions and dates are above.
- **Gemini and Grok are not here yet.** They are pre-registered and will be reported whatever their result.

---

## The first run: 50 issues the brief was tuned on

Before the held-out run we measured Claude and Codex on the other 50 issues of the same seeded draw, between 4 and 8
November 2026. LetThemBuild's brief was tuned on those issues, Claude Code ran with the plugins and connectors
installed on a working developer's Mac, and the runs were not isolated from the network. The held-out run above is
the one to judge by. The first run is kept as published, with its data in [`full-50/`](full-50).

> **Gemini and Grok results withdrawn (14 November 2026).** We also ran Gemini and Grok. Their figures are withdrawn
> while we run them again with web access off and the workspace kept apart from the benchmark's own files. Their
> runs stay in `full-50/data` for reference, but they are not part of the results in this section.

### What we found

- **Both models used fewer tokens inside LetThemBuild than in their own CLI.** Claude −55% and Codex −9%, over all
  50 issues and both runs.
- **They solved about as many issues.** Across the two runs: Claude 43.5 against 43.5 for Claude Code, Codex 41.5
  against 41 for the Codex CLI. With 50 issues that means no detectable difference, not proof of equal quality.
- **For Claude the saving is beyond run-to-run variation.** The 95% range is −59% to −51%, and LetThemBuild with
  Claude used fewer tokens than Claude Code on 49 of the 50 issues.
- **For Codex it is smaller and less certain.** Its range, −17% to +0.3%, comes close to no difference.

### Tokens for the 50 issues

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/full-50-tokens-dark.svg">
  <img alt="Tokens for all 50 issues, mean of two runs: Claude Code 16.1M, LetThemBuild with Claude 7.2M (−55%); Codex CLI 14.6M, LetThemBuild with Codex 13.3M (−9%)." src="charts/full-50-tokens-light.svg" width="820">
</picture>

Each model's own CLI sits directly above LetThemBuild running that model. Each pair is drawn against its own CLI; the labels
carry the totals. Tokens are everything
the model read and wrote: fresh input, cache reads, cache writes and output, as each tool reports them.

### Issues solved

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/full-50-solved-dark.svg">
  <img alt="Issues solved out of 50 in each of two runs: Claude Code 45 and 42, LetThemBuild with Claude 43 and 44; Codex CLI 42 and 40, LetThemBuild with Codex 42 and 41." src="charts/full-50-solved-light.svg" width="820">
</picture>

### Every setup

| Setup | Model | Solved, run 1 · run 2 | Tokens, run 1 · run 2 | Mean | Change | 95% range | Fewer tokens on |
|---|---|---:|---:|---:|---:|---|---:|
| Claude Code alone | claude-opus-5-5 | 45 · 42 | 17.72M · 14.46M | 16.09M | | | |
| **LetThemBuild · Claude** | claude-opus-5-5 | **43 · 44** | **7.39M · 7.04M** | **7.22M** | **−55.1%** | −59.4% to −50.5% | 49 of 50 |
| Codex CLI alone | gpt-6.1-sol | 42 · 40 | 15.10M · 14.05M | 14.57M | | | |
| **LetThemBuild · Codex** | gpt-6.1-sol | **42 · 41** | **12.73M · 13.88M** | **13.30M** | **−8.7%** | −16.8% to +0.3% | 33 of 50 |

An issue's tokens are the mean of its two runs. The range comes from resampling the 50 issues 10,000 times,
keeping each issue's runs together, with a fixed seed.

### By difficulty

| SWE-bench difficulty | Issues | Claude | Codex |
|---|---:|---:|---:|
| Under 15 minutes | 21 | −55.5% | −3.5% |
| 15 minutes – 1 hour | 25 | −54.8% | −11.1% |
| 1 – 4 hours | 4 | −55.5% | −11.8% |

Change in tokens from the model's own CLI to LetThemBuild with that model. Difficulty is SWE-bench Verified's own
label, not anything measured here. Only four issues carry the 1–4 hour label, too few to read much into on their
own.

### Where the saving comes from

A coding CLI sends its own instructions and the description of every tool it has with each model call, and a fix
takes several calls, so that fixed part is read again and again. For Claude Code it was most of what the model read.

LetThemBuild starts a seat with what the room's work needs. For Claude Code that means the file, search and shell
tools and LetThemBuild's own brief, without the tools the room already covers and without the plugins and
connectors installed on the machine. Claude Code on this Mac began each call with about 45k tokens before the issue
was read; the same CLI as a LetThemBuild seat began with about 16k. Each issue took about seven calls either
way (7.4 as a seat, 6.7 alone), so the saving is in what each call carries, not in doing less work.

That 45k is Claude Code as it was installed here, with this developer's plugins and connectors; a fresh install
starts nearer 32k. Scaling Claude Code's runs to that figure would put Claude's saving at about −40% rather than
−55%. That is our estimate, not a measured run.

For Codex the difference is small either way.

### How the test was run

#### The issues

We drew 100 issues from SWE-bench Verified with a fixed seed (`random.Random(20261023)` over the sorted instance
ids), then took the first 50 ordered by `sha256("letthembuild-swe-2026-11:" + id)`; `harness/select_tasks.py`
rebuilds both lists. The 50 span nine projects and all three difficulty bands:
[`full-50/data/tasks.txt`](full-50/data/tasks.txt).

#### The prompt, the same for every run

> Resolve the GitHub issue below in this repository, which is checked out at the commit where it was reported.
> Change the source code so the issue is fixed. You do not need to add or change tests: the fix will be checked
> with the project's own tests. Make the change; do not ask questions.
>
> `<issue>` … the issue text from SWE-bench … `</issue>`

#### Conditions

| Setup | What ran | Permissions |
|---|---|---|
| Claude Code alone | Claude Code 2.1.311, `claude -p`, with the settings, plugins and connectors installed on the test Mac | `--permission-mode auto` |
| Codex CLI alone | Codex CLI 0.165.0, `codex exec` | `--sandbox workspace-write` |
| LetThemBuild · Codex | LetThemBuild desktop 1.1.369 with brief 2026-11-05.3, `run` in a terminal; its one seat runs that model's CLI | `--permission auto` |
| LetThemBuild · Claude | LetThemBuild desktop, the build after 1.1.369: brief 2026-11-08.1 and the lean start for Claude Code seats (a setting, on by default) | `--permission auto` |

Inside LetThemBuild the seat is the same CLI, on the same subscription and the same model, as the setup it is
compared with; what differs is what LetThemBuild sends it and how it starts it. The rooms had one seat, no
reviewers and ranking off, and ran a single round. Every run started from the same checkout at the issue's base
commit with a 40-minute limit, on one Apple M5 Mac (24 GB, macOS 26.3), between 4 and 8 November 2026. A run that
reached the limit would have been graded as it stood; no Claude or Codex run did. A run a subscription's usage limit
cut short was discarded and run again once the limit had reset.

#### Measurement

- **Tokens:** each tool's own count. Claude Code's final `modelUsage`, the sum of Codex's per-turn `usage`, and
  LetThemBuild's per-call record of what its seat's CLI reported
  (`usage.jsonl`). All include cache reads.
- **Solved:** the official harness, `swebench` 5.0.2, `run_evaluation` against `SWE-bench/SWE-bench_Verified`, in
  Docker 29.1.3. A run's patch is everything it changed against the base commit, minus the tools' own folders.
  Reports: [`full-50/data/grades/`](full-50/data/grades), and `report.json` beside each run.
- **Time:** wall-clock seconds from start to exit.

### What this does not show

- **Fifty issues, two runs each.** Agentic runs vary from run to run; the ranges above say how much. Codex's
  difference is within that variation or close to it.
- **Claude's comparison depends on what is installed.** Claude Code was measured as it runs on a working
  developer's Mac. On a machine with nothing added the gap is smaller; our estimate is above.
- **Two LetThemBuild builds.** Claude's seat ran a newer build than Codex's, with a shorter brief and the lean
  start. Codex has not been rerun on it.
- **One seat only.** These are single-seat rooms. A room with reviewers reads the problem more than once and costs
  more tokens; that is a different measurement.
- **One machine, one week's models.** Results will move as models and tools change; versions and dates are above.

### Check it yourself

Regrade our patches: no model calls, just Docker and the harness.

```bash
python -m venv .venv && .venv/bin/pip install swebench==5.0.2
.venv/bin/python -m swebench.harness.run_evaluation -d SWE-bench/SWE-bench_Verified -s test \
  -p full-50/data/predictions/letthembuild-claude.jsonl -id regrade --max_workers 3
```

On an Apple-silicon Mac, pull the x86 images first, for example
`docker pull --platform linux/amd64 swebench/sweb.eval.x86_64.django_1776_django-13023:latest`.

Print every figure in the tables above, and redraw the charts:

```bash
node harness/verdict.mjs full-50 claude-code,claude-code-run2 letthembuild-claude,letthembuild-claude-run2
node harness/verdict.mjs full-50 codex,codex-run2 letthembuild-codex,letthembuild-codex-run2
node harness/charts-full.mjs
```

Run it again from scratch:

```bash
export BENCH_DIR=$PWD/bench && mkdir -p $BENCH_DIR
python harness/prepare.py                         # the 100 issues and a mirror of each repository
cp full-50/data/tasks.txt $BENCH_DIR/
node harness/run.mjs cc django__django-13023      # setups: cc | agy | codex | grok | ltb-claude | ltb-gemini | …
node harness/grade-full.mjs                       # grades whatever is in $BENCH_DIR/runs
```

The LetThemBuild setups need the LetThemBuild desktop app (`LTB_DESKTOP` points at it). Our runs used two
measurement hooks that change none of what the model is sent: one fixes the room for a single run, the other writes
each model call's usage to a file.

### What is in this repository

```
full-50/data/
  tasks.txt                      the 50 issues
  difficulty.json                SWE-bench Verified's difficulty label for each issue
  results.csv                    one row per run: setup, issue, tokens, solved, seconds
  predictions/<setup>.jsonl      the patches, in the harness's input format
  grades/<setup>.json            the issues each setup solved
  runs/<setup>/<issue>/
    prompt.txt                   what the setup was given
    patch.diff                   what it changed
    run.json                     time, exit, files changed, solved, tokens by model
    report.json                  the harness's report for that one patch
    transcript.jsonl             the tool's own event stream: messages, commands, results, usage
    usage.jsonl                  LetThemBuild only: each model call's tokens
data/                            the same layout for the first seven issues (below)
charts/                          the charts, light and dark
harness/                         select_tasks.py, prepare.py, run.mjs, grade.mjs, grade-full.mjs, charts.mjs,
                                 charts-full.mjs, export-public.mjs, verdict.mjs
```

Setups are `claude-code`, `codex` and `letthembuild-<model>`, each with a `-run2` for its second run. The
`gemini`, `grok`, `letthembuild-gemini` and `letthembuild-grok` folders hold the withdrawn runs. Transcripts are the tools' own streams with machine details removed: home-folder paths and email addresses
are replaced, and the parts that describe the machine rather than the run (app settings, other conversations,
installed plugins, connectors and commands, a listing of the home folder or of the shell's environment) are left
out. `harness/export-public.mjs` is exactly what did that.

### The first seven issues

Before the full run we published a first look: seven of the 50 issues, Claude and Codex, one run each, on
4 November 2026 with LetThemBuild 1.1.369 and brief 2026-11-05.1. It is kept here as published, with its data in
[`data/`](data). In that batch Claude Code alone had some commands refused that LetThemBuild's seat was allowed;
the 50-issue run above gives every setup the same freedom, and is the one to judge by.

#### Tokens per solved issue

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/tokens-per-solved-issue-dark.svg">
  <img alt="Tokens per solved issue: Claude Code 588k, LetThemBuild with Claude 458k (−22%), Codex CLI 505k, LetThemBuild with Codex 385k (−24%)." src="charts/tokens-per-solved-issue-light.svg" width="820">
</picture>

Each model's own CLI sits directly above LetThemBuild running that model, with the difference in brackets. Tokens
are everything the model read and wrote: fresh input, cache reads, cache writes and output, as each tool reports
them.

#### Where the tokens went

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/tokens-solved-vs-not-dark.svg">
  <img alt="Total tokens across seven runs, split into tokens on solved and unsolved issues: Claude Code 2.94M (41% unsolved), LetThemBuild with Claude 2.75M (12%), Codex CLI 2.53M (48%), LetThemBuild with Codex 1.92M (34%)." src="charts/tokens-solved-vs-not-light.svg" width="820">
</picture>

#### Every setup

| Setup | Model | Issues solved | Tokens, 7 runs | Per solved issue | Median run | Time, 7 runs |
|---|---|---:|---:|---:|---:|---:|
| Claude Code alone | claude-opus-5-5 | 5 / 7 | 2.94M | 588k | 276k | 5 min 38 s |
| **LetThemBuild · Claude** | claude-opus-5-5 | **6 / 7** | **2.75M** | **458k (−22%)** | 392k | 7 min 17 s |
| Codex CLI alone | gpt-6.1-sol | 5 / 7 | 2.53M | 505k | 227k | 8 min 39 s |
| **LetThemBuild · Codex** | gpt-6.1-sol | **5 / 7** | **1.92M** | **385k (−24%)** | 243k | 7 min 46 s |

#### Every issue

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/every-issue-dark.svg">
  <img alt="Tokens for each of the seven issues and four setups, striped where the issue was not solved. Values are in the table below." src="charts/every-issue-light.svg" width="820">
</picture>

| Issue | SWE-bench difficulty | Claude Code | LTB · Claude | Codex CLI | LTB · Codex |
|---|---|---:|---:|---:|---:|
| [django-13023](data/runs/claude-code/django__django-13023) | < 15 min | ✅ 226k | ✅ 424k | ✅ 166k | ✅ 243k |
| [django-14315](data/runs/claude-code/django__django-14315) | < 15 min | ❌ 189k | ❌ 320k | ❌ 225k | ❌ 182k |
| [sympy-24539](data/runs/claude-code/sympy__sympy-24539) | < 15 min | ✅ 276k | ✅ 211k | ✅ 213k | ✅ 231k |
| [xarray-3305](data/runs/claude-code/pydata__xarray-3305) | 15 min – 1 h | ✅ 237k | ✅ 387k | ✅ 416k | ✅ 259k |
| [matplotlib-20826](data/runs/claude-code/matplotlib__matplotlib-20826) | 15 min – 1 h | ✅ 661k | ✅ 406k | ✅ 285k | ✅ 319k |
| [scikit-learn-14710](data/runs/claude-code/scikit-learn__scikit-learn-14710) | 15 min – 1 h | ✅ 341k | ✅ 392k | ✅ 227k | ✅ 220k |
| [sympy-14248](data/runs/claude-code/sympy__sympy-14248) | 1 – 4 h | ❌ 1,008k | ✅ 604k | ❌ 993k | ❌ 471k |

✅ solved, ❌ not solved, by the official harness. The links open Claude Code's run; every other setup's patch and transcript is under `data/runs/<setup>/` with the same name.

Why the pattern? Every LetThemBuild turn carries the same standing brief: how to work, how to check a change, how to
report. On a one-line fix that is a fixed cost you can see (django-13023: 424k against 226k). On a long problem it
pays for itself. The brief asks the model to prove a change with the cheapest check that settles it, using the
tests and environment the project already has, and to say plainly what it could not check. That keeps a hard issue
from turning into a long search.

## Next

- Gemini and Grok on the held-out 50, as pre-registered.
- Rooms: the same issues with a second and third model reviewing the first, on the isolated harness, to show what a
  second opinion costs and what it catches.

---

LetThemBuild is made by GPULogy AI LLC · [letthembuild.com](https://letthembuild.com)
