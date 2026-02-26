#!/usr/bin/env bash
# Log progress for a RALHP build step.
# Usage: AGENT_ID=ops log-progress.sh <project> <step_id> <status> <message>
# Appends a JSON line to workspace/ops/projects/<project>/progress.jsonl

set -euo pipefail

PROJECT="${1:?Usage: log-progress.sh <project> <step_id> <status> <message>}"
STEP_ID="${2:?Missing step_id}"
STATUS="${3:?Missing status}"
MESSAGE="${4:?Missing message}"
AGENT="${AGENT_ID:-unknown}"

# Validate status
case "$STATUS" in
  pending|in_progress|review|passed|failed|escalated) ;;
  *) echo "ERROR: Invalid status '$STATUS'. Must be: pending|in_progress|review|passed|failed|escalated" >&2; exit 1 ;;
esac

# Resolve project dir relative to repo root
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PROJECT_DIR="$REPO_ROOT/workspace/ops/projects/$PROJECT"
mkdir -p "$PROJECT_DIR"

LOGFILE="$PROJECT_DIR/progress.jsonl"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Escape message for JSON (handle quotes and backslashes)
ESCAPED_MSG=$(printf '%s' "$MESSAGE" | sed 's/\\/\\\\/g; s/"/\\"/g')

echo "{\"ts\":\"$TIMESTAMP\",\"agent\":\"$AGENT\",\"step\":\"$STEP_ID\",\"status\":\"$STATUS\",\"msg\":\"$ESCAPED_MSG\"}" >> "$LOGFILE"

echo "Logged: [$STATUS] step $STEP_ID — $MESSAGE"
