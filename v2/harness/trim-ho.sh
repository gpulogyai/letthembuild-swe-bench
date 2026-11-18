#!/usr/bin/env bash
# An added arm on the held-out 50 (2026-11-14, after the frozen run began): LetThemBuild + Claude with the trimmed
# Claude Code lead brief (PR #857, bench build bench-v2-trim), two runs each, under tags trim1 and trim2.
# Same harness, issues and counting as the pre-registered arms; reported as an added, post-hoc arm.
set -u
cd "$(dirname "$0")"
[ -f local.env ] && set -a && . ./local.env && set +a
export LTB_DESKTOP="${LTB_DESKTOP%/bench-v2/desktop}/bench-v2-trim/desktop"
[ -d "$LTB_DESKTOP/node_modules/electron" ] || { echo "no build at $LTB_DESKTOP"; exit 1; }
mkdir -p logs
if ! mkdir logs/trim-ho.lock 2>/dev/null; then echo "trim-ho.sh is already running"; exit 1; fi
trap 'rmdir logs/trim-ho.lock 2>/dev/null' EXIT
for rep in trim1 trim2; do
  while read -r id; do
    [ -f "runs/ltb-claude@$rep/$id/run.json" ] && continue
    while :; do
      node run.mjs "ltb-claude@$rep" "$id" 2>&1 | tail -1
      wait_s=$(node quota.mjs "ltb-claude@$rep" "$id")
      [ "$wait_s" -gt 0 ] || break
      echo "$(date -u +%FT%TZ) ltb-claude@$rep $id: plan limit reached, waiting ${wait_s}s"
      sleep "$wait_s"
    done
  done < tasks-heldout-50.txt
done
echo "$(date -u +%FT%TZ) trim-ho done"
