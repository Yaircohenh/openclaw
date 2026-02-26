#!/usr/bin/env bash
# Update agent performance score after a RALHP step completes.
# Usage: log-score.sh <agent_id> <project> <step_id> <outcome> <cycles>
#   outcome: pass | fail | escalated
#   cycles: number of QA cycles (1, 2, 3+)
#
# Score delta: +2 (1 cycle), +0 (2 cycles), -1 (3 cycles), -3 (escalated)
# Scores are clamped to 0-100.

set -euo pipefail

AGENT_ID="${1:?Usage: log-score.sh <agent_id> <project> <step_id> <outcome> <cycles>}"
PROJECT="${2:?Missing project}"
STEP_ID="${3:?Missing step_id}"
OUTCOME="${4:?Missing outcome (pass|fail|escalated)}"
CYCLES="${5:?Missing cycles count}"

# Resolve paths
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCORES_FILE="$REPO_ROOT/memory/agent-scores.json"

# Validate agent
KNOWN_AGENTS="main ninja ops cto accounting finance legal marketing"
if ! echo "$KNOWN_AGENTS" | grep -qw "$AGENT_ID"; then
  echo "ERROR: Unknown agent '$AGENT_ID'. Known agents: $KNOWN_AGENTS" >&2
  exit 1
fi

# Validate outcome
case "$OUTCOME" in
  pass|fail|escalated) ;;
  *) echo "ERROR: Invalid outcome '$OUTCOME'. Must be: pass|fail|escalated" >&2; exit 1 ;;
esac

# Validate cycles is a number
if ! [[ "$CYCLES" =~ ^[0-9]+$ ]]; then
  echo "ERROR: cycles must be a positive integer, got '$CYCLES'" >&2
  exit 1
fi

# Calculate delta
if [ "$OUTCOME" = "escalated" ]; then
  DELTA=-3
elif [ "$CYCLES" -eq 1 ]; then
  DELTA=2
elif [ "$CYCLES" -eq 2 ]; then
  DELTA=0
else
  DELTA=-1
fi

# Check scores file exists
if [ ! -f "$SCORES_FILE" ]; then
  echo "ERROR: Scores file not found at $SCORES_FILE" >&2
  exit 1
fi

# Update scores via node
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

node -e "
const fs = require('fs');
const scores = JSON.parse(fs.readFileSync('$SCORES_FILE', 'utf8'));
const agent = scores['$AGENT_ID'];

// Update score (clamp 0-100)
agent.score = Math.max(0, Math.min(100, agent.score + ($DELTA)));

// Update counters
if ('$OUTCOME' === 'pass') {
  agent.completed++;
  agent.streak = Math.max(0, agent.streak) + 1;
} else if ('$OUTCOME' === 'fail') {
  agent.failed++;
  agent.streak = Math.min(0, agent.streak) - 1;
} else {
  agent.failed++;
  agent.streak = Math.min(0, agent.streak) - 1;
}

// Update avg_cycles
const total = agent.completed + agent.failed;
if (total > 0 && '$OUTCOME' === 'pass') {
  agent.avg_cycles = Math.round(((agent.avg_cycles * (agent.completed - 1)) + $CYCLES) / agent.completed * 100) / 100;
}

// Timestamp
agent.last_updated = '$TIMESTAMP';

// Append history entry
agent.history.push({
  ts: '$TIMESTAMP',
  project: '$PROJECT',
  step: '$STEP_ID',
  outcome: '$OUTCOME',
  cycles: $CYCLES,
  delta: $DELTA
});

// Keep last 50 history entries per agent
if (agent.history.length > 50) {
  agent.history = agent.history.slice(-50);
}

fs.writeFileSync('$SCORES_FILE', JSON.stringify(scores, null, 2) + '\n');
"

echo "Score updated: $AGENT_ID $OUTCOME (cycles=$CYCLES, delta=$DELTA)"
