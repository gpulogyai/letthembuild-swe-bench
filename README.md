<sub>LETTHEMBUILD BENCHMARK · SWE-BENCH VERIFIED · NOVEMBER 2026 · FIRST 7 ISSUES</sub>

# Same model, fewer tokens per fix: LetThemBuild against each model's own CLI

We gave Claude and Codex the same real GitHub issues two ways: in their own command-line tool, and in LetThemBuild
with that model as the only seat, running the same CLI underneath. The issues come from
[SWE-bench Verified](https://www.swebench.com/), the benchmark coding agents are measured on, and every patch was
graded by the official SWE-bench harness against the project's own tests. This is how many issues each setup
solved, and how many tokens it took. Every patch, transcript and token count is in this repository, so you can check
the numbers yourself.

## What we found

- **The same model in LetThemBuild fixes issues for fewer tokens than on its own.** Counting every token spent,
  failures included, per issue solved: Claude −22% against Claude Code (<code>458k</code> against
  <code>588k</code>), Codex −24% against Codex CLI (<code>385k</code> against <code>505k</code>).
- **It solved as many issues or more.** LetThemBuild with Claude solved 6 of 7, against 5 for Claude Code;
  LetThemBuild with Codex solved 5, the same as Codex CLI.
- **The gap is widest where the work is hardest.** On the one issue SWE-bench rates at 1–4 hours, both CLIs on
  their own spent about a million tokens and did not fix it. LetThemBuild with Claude fixed it for
  <code>604k</code>; LetThemBuild with Codex stopped at <code>471k</code>, under half the CLI's spend.
- **Less is spent on runs that go nowhere.** 41% of Claude Code's tokens and 48% of Codex CLI's went on issues they
  did not solve; inside LetThemBuild that was 12% and 34%.
- **On a short fix LetThemBuild costs a little more.** Every turn carries LetThemBuild's standing brief, and on a
  one-line fix that shows: the median run is higher inside LetThemBuild for both models.

## Tokens per solved issue

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/tokens-per-solved-issue-dark.svg">
  <img alt="Tokens per solved issue: Claude Code 588k, LetThemBuild with Claude 458k (−22%), Codex CLI 505k, LetThemBuild with Codex 385k (−24%)." src="charts/tokens-per-solved-issue-light.svg" width="820">
</picture>

Each model's own CLI sits directly above LetThemBuild running that model, with the difference in brackets. Tokens
are everything the model read and wrote: fresh input, cache reads, cache writes and output, as each tool reports
them.

## Where the tokens went

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="charts/tokens-solved-vs-not-dark.svg">
  <img alt="Total tokens across seven runs, split into tokens on solved and unsolved issues: Claude Code 2.94M (41% unsolved), LetThemBuild with Claude 2.75M (12%), Codex CLI 2.53M (48%), LetThemBuild with Codex 1.92M (34%)." src="charts/tokens-solved-vs-not-light.svg" width="820">
</picture>

## Every setup

| Setup | Model | Issues solved | Tokens, 7 runs | Per solved issue | Median run | Time, 7 runs |
|---|---|---:|---:|---:|---:|---:|
| Claude Code alone | claude-opus-5-5 | 5 / 7 | 2.94M | 588k | 276k | 5 min 38 s |
| **LetThemBuild · Claude** | claude-opus-5-5 | **6 / 7** | **2.75M** | **458k (−22%)** | 392k | 7 min 17 s |
| Codex CLI alone | gpt-6.1-sol | 5 / 7 | 2.53M | 505k | 227k | 8 min 39 s |
| **LetThemBuild · Codex** | gpt-6.1-sol | **5 / 7** | **1.92M** | **385k (−24%)** | 243k | 7 min 46 s |

## Every issue

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

## How the test was run

### The issues

We drew 100 issues from SWE-bench Verified with a fixed seed (`random.Random(20261023)` over the sorted instance
ids), then took the first 50 ordered by `sha256("letthembuild-swe-2026-11:" + id)`; `harness/select_tasks.py`
rebuilds both lists. This first batch is seven of those 50, spanning six projects and all three difficulty bands:
[`data/tasks.txt`](data/tasks.txt).

### The prompt, the same for every run

> Resolve the GitHub issue below in this repository, which is checked out at the commit where it was reported.
> Change the source code so the issue is fixed. You do not need to add or change tests: the fix will be checked
> with the project's own tests. Make the change; do not ask questions.
>
> `<issue>` … the issue text from SWE-bench … `</issue>`

### Conditions

| Setup | What ran | Permissions |
|---|---|---|
| Claude Code alone | Claude Code 2.1.311, `claude -p` | edits accepted; read, search, git-inspect and Python/pytest commands allowed; others refused |
| Codex CLI alone | Codex CLI 0.165.0, `codex exec` | `--sandbox workspace-write` |
| LetThemBuild · Claude | LetThemBuild desktop 1.1.369, brief 2026-11-05.1, `run` in a terminal; its one seat runs Claude Code | `--permission auto` |
| LetThemBuild · Codex | the same; its one seat runs the Codex CLI | `--permission auto` |

Inside LetThemBuild the seat is the same CLI, on the same subscription and the same model, as the setup it is
compared with; what differs is what LetThemBuild sends it and how it runs the work. The LetThemBuild rooms had one
seat, no reviewers and ranking off, and ran a single round. Every setup started from the same checkout at the
issue's base commit, with a 40-minute limit (none reached it), on one Apple M5 Mac (24 GB, macOS 26.3), on
4 November 2026.

### Measurement

- **Tokens:** each tool's own count. Claude Code's final `modelUsage`, the sum of Codex's per-turn `usage`, and
  LetThemBuild's per-call record of what its seat's CLI reported (`usage.jsonl`). All include cache reads.
- **Solved:** the official harness, `swebench` 5.0.2, `run_evaluation` against `SWE-bench/SWE-bench_Verified`, in
  Docker 29.1.3. A run's patch is everything it changed against the base commit, minus the tools' own folders.
  Reports: [`data/grades/`](data/grades).
- **Time:** wall-clock seconds from start to exit.

## What this does not show

- **Seven issues is a first look, not a verdict.** One run per setup per issue, and agentic runs vary from run to
  run, so a single issue's difference is noisy. The 50-issue run is the one to judge by.
- **Much of the saving is one issue.** Without sympy-14248, LetThemBuild with Claude used more tokens than Claude
  Code on the other six (2.14M against 1.93M), while LetThemBuild with Codex still used fewer than Codex CLI
  (1.45M against 1.53M). We show it because hard issues are where a fix costs most.
- **Permissions were not identical.** Claude Code alone had 13 commands refused across its seven runs, seven of them
  on sympy-14248, while LetThemBuild's seat ran in auto mode. The full run gives every setup the same freedom.
- **One machine, one week's models.** Results will move as models and tools change; versions and the date are
  above.

## Check it yourself

Regrade our patches: no model calls, just Docker and the harness.

```bash
python -m venv .venv && .venv/bin/pip install swebench==5.0.2
.venv/bin/python -m swebench.harness.run_evaluation -d SWE-bench/SWE-bench_Verified -s test \
  -p data/predictions/letthembuild-claude.jsonl -id regrade --max_workers 3
```

On an Apple-silicon Mac, pull the x86 images first, for example
`docker pull --platform linux/amd64 swebench/sweb.eval.x86_64.django_1776_django-13023:latest`.

Run it again from scratch:

```bash
export BENCH_DIR=$PWD/bench && mkdir -p $BENCH_DIR
python harness/prepare.py                         # the 100 issues and a mirror of each repository
cp data/tasks.txt $BENCH_DIR/
node harness/run.mjs cc django__django-13023      # setups: cc | codex | ltb-claude | ltb-codex | …
node harness/grade.mjs cc tasks.txt               # grades whatever is in $BENCH_DIR/runs/cc
node harness/charts.mjs                           # redraws the charts from data/results.csv
```

The LetThemBuild setups need the LetThemBuild desktop app (`LTB_DESKTOP` points at it). Our runs used two
measurement hooks that change none of what the model is sent: one fixes the room for a single run, the other writes
each model call's usage to a file.

## What is in this repository

```
data/
  tasks.txt                      the seven issues
  results.csv                    one row per run: setup, issue, tokens, solved, seconds
  predictions/<setup>.jsonl      the patches, in the harness's input format
  grades/<setup>.json            the harness's report for each setup
  runs/<setup>/<issue>/
    prompt.txt                   what the setup was given
    patch.diff                   what it changed
    run.json                     time, exit, files changed, solved, tokens by model
    transcript.jsonl             the tool's own event stream: messages, commands, results, usage
    usage.jsonl                  LetThemBuild only: each model call's tokens
charts/                          the charts above, light and dark
harness/                         select_tasks.py, prepare.py, run.mjs, grade.mjs, charts.mjs, export-public.mjs
```

Transcripts are the tools' own streams with machine details removed: home-folder paths and email addresses are
replaced, and the parts that describe the machine rather than the run (app settings, other conversations,
installed plugins and connectors, a listing of the home folder) are left out. `harness/export-public.mjs` is
exactly what did that.

## Next

The full run: all 50 issues, with Gemini 4 Argon High (Antigravity) and Grok 4.7 on their own and as LetThemBuild's
only seat, plus a room where Claude leads and GPT-6.1 Sol reviews, to show what a second opinion costs and what it
catches.

---

LetThemBuild is made by GPULogy AI LLC · [letthembuild.com](https://letthembuild.com)
