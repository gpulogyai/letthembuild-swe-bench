#!/usr/bin/env bash
# Two-seat rooms on the held-out 50 (2026-11-18, added after the pre-registered run): Claude leads with Codex
# reviewing, and Codex leads with Claude reviewing, two runs each. Build bench-v2-pair = LetThemBuild bbc845bba (the
# briefs LetThemBuild ships) plus the bench hooks. Claude Code 2.1.311 and Codex 0.167.0, as frozen, first on PATH;
# the same models. Usage: ./pair-ho.sh <arm> <tag> [<tag> ...]   e.g. ./pair-ho.sh pair-claude-codex p1 p2
set -u
cd "$(dirname "$0")"
[ -f local.env ] && set -a && . ./local.env && set +a
# The Codex seat runs as it does under LetThemBuild's own sandbox, as in letthembuild-codex; the CLIs' own session
# logs are kept, so each turn's count can be checked against them.
export KEEP_CLI_SESSIONS=1 LTB_BENCH_CODEX_EXTERNAL=1
export LTB_DESKTOP="${LTB_DESKTOP%/bench-v2/desktop}/bench-v2-pair/desktop"
[ "$(codex --version)" = "codex-cli 0.167.0" ] || { echo "Codex CLI 0.167.0 must be first on PATH"; exit 1; }
[ "$(claude --version)" = "2.1.311 (Claude Code)" ] || { echo "Claude Code 2.1.311 must be first on PATH"; exit 1; }
arm=$1; shift
mkdir -p logs
if ! mkdir "logs/pair-$arm.lock" 2>/dev/null; then echo "pair-ho.sh $arm is already running"; exit 1; fi
trap 'rmdir "logs/pair-$arm.lock" 2>/dev/null' EXIT
for rep in "$@"; do
  while read -r id; do
    [ -f "runs/$arm@$rep/$id/run.json" ] && continue
    while :; do
      node run.mjs "$arm@$rep" "$id" 2>&1 | tail -1
      wait_s=$(node quota.mjs "$arm@$rep" "$id")
      [ "$wait_s" -gt 0 ] || break
      echo "$(date -u +%FT%TZ) $arm@$rep $id: plan limit reached, waiting ${wait_s}s"
      sleep "$wait_s"
    done
  done < tasks-heldout-50.txt
done
echo "$(date -u +%FT%TZ) pair-ho $arm done"
