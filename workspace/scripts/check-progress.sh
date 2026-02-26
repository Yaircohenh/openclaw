#!/usr/bin/env bash
# Check progress for a RALHP build project.
# Usage: check-progress.sh <project> [step_id]
#   No step_id: shows latest status per step (summary)
#   With step_id: shows full history for that step

set -euo pipefail

PROJECT="${1:?Usage: check-progress.sh <project> [step_id]}"
STEP_ID="${2:-}"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGFILE="$REPO_ROOT/workspace/ops/projects/$PROJECT/progress.jsonl"

if [ ! -f "$LOGFILE" ]; then
  echo "No progress log found for project '$PROJECT'."
  exit 0
fi

if [ -z "$STEP_ID" ]; then
  # Summary: show latest entry per step
  echo "=== Progress Summary: $PROJECT ==="
  echo ""
  # Use mawk-compatible approach (no asorti)
  awk -F'"' '
    /\"step\"/ {
      step=""; status=""; msg=""; ts=""
      for (i=1; i<=NF; i++) {
        if ($i == "step" && $(i+1) == ":") step = $(i+2)
        if ($i == "status" && $(i+1) == ":") status = $(i+2)
        if ($i == "msg" && $(i+1) == ":") msg = $(i+2)
        if ($i == "ts" && $(i+1) == ":") ts = $(i+2)
      }
      if (step != "") {
        latest_status[step] = status
        latest_msg[step] = msg
        latest_ts[step] = ts
        if (!(step in order)) {
          order[step] = NR
          steps[++count] = step
        }
      }
    }
    END {
      for (i=1; i<=count; i++) {
        s = steps[i]
        printf "  [%-11s] %s — %s (%s)\n", latest_status[s], s, latest_msg[s], latest_ts[s]
      }
      if (count == 0) print "  (no entries)"
    }
  ' "$LOGFILE"
else
  # Full history for a specific step
  echo "=== History: $PROJECT / step $STEP_ID ==="
  echo ""
  awk -F'"' -v target="$STEP_ID" '
    /\"step\"/ {
      step=""; status=""; msg=""; ts=""; agent=""
      for (i=1; i<=NF; i++) {
        if ($i == "step" && $(i+1) == ":") step = $(i+2)
        if ($i == "status" && $(i+1) == ":") status = $(i+2)
        if ($i == "msg" && $(i+1) == ":") msg = $(i+2)
        if ($i == "ts" && $(i+1) == ":") ts = $(i+2)
        if ($i == "agent" && $(i+1) == ":") agent = $(i+2)
      }
      if (step == target) {
        printf "  %s [%-11s] (%s) %s\n", ts, status, agent, msg
      }
    }
  ' "$LOGFILE"
fi
