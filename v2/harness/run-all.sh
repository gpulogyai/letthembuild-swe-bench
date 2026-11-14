#!/usr/bin/env bash
# The v2 run: the 50 held-out issues, every setup, two runs each, one lane per model family so a family's plan limit
# pauses only its own lane. Within a lane the CLI alone and LetThemBuild with that CLI run the same issue one after
# the other, so both meet the same model on the same day. Finished runs are skipped; start it again after a stop.
#   ./run-all.sh            all four lanes        ONLY=claude ./run-all.sh    one lane
set -u
cd "$(dirname "$0")"
# Machine-specific settings (LTB_DESKTOP), kept out of the repository.
[ -f local.env ] && set -a && . ./local.env && set +a
one() { # one <arm@tag> <id>
  local armTagged=$1 id=$2
  [ -f "runs/$armTagged/$id/run.json" ] && return
  while :; do
    node run.mjs "$armTagged" "$id" 2>&1 | tail -1
    wait_s=$(node quota.mjs "$armTagged" "$id")
    [ "$wait_s" -gt 0 ] || break
    echo "$(date -u +%FT%TZ) $armTagged $id: plan limit reached, waiting ${wait_s}s"
    sleep "$wait_s"
  done
}
lane() { # lane <cli-arm> <ltb-arm>
  for rep in r1 r2; do
    while read -r id; do one "$1@$rep" "$id"; one "$2@$rep" "$id"; done < tasks-heldout-50.txt
  done
  echo "$(date -u +%FT%TZ) lane $1 done"
}
mkdir -p logs
for pair in "cc ltb-claude" "codex ltb-codex" "agy ltb-gemini" "grok ltb-grok"; do
  set -- $pair
  case $1 in cc) fam=claude ;; codex) fam=codex ;; agy) fam=gemini ;; grok) fam=grok ;; esac
  if [ -n "${ONLY:-}" ] && [ "$ONLY" != "$fam" ]; then continue; fi
  lane "$1" "$2" >> "logs/lane-$fam.log" 2>&1 &
done
wait
echo "$(date -u +%FT%TZ) all lanes done"
