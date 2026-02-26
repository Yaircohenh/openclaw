#!/usr/bin/env bash
# Generate per-agent cost breakdown from OpenClaw session data.
# Usage: cost-report.sh [--date YYYY-MM-DD] [--agent <id>] [--format text|json]
#
# Scans ~/.openclaw/sessions/ for token usage per agent.
# Applies approximate model pricing to estimate costs.

set -euo pipefail

# Defaults
DATE=""
AGENT_FILTER=""
FORMAT="text"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --date) DATE="$2"; shift 2 ;;
    --agent) AGENT_FILTER="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; echo "Usage: cost-report.sh [--date YYYY-MM-DD] [--agent <id>] [--format text|json]" >&2; exit 1 ;;
  esac
done

SESSIONS_DIR="$HOME/.openclaw/sessions"

if [ ! -d "$SESSIONS_DIR" ]; then
  if [ "$FORMAT" = "json" ]; then
    echo '{"error":"No session data found","sessions_dir":"'"$SESSIONS_DIR"'"}'
  else
    echo "No session data found at $SESSIONS_DIR"
    echo "The gateway may not have run yet, or sessions are stored elsewhere."
  fi
  exit 0
fi

# Use node to scan and aggregate session data
node -e "
const fs = require('fs');
const path = require('path');

const sessionsDir = '$SESSIONS_DIR';
const dateFilter = '$DATE';
const agentFilter = '$AGENT_FILTER';
const format = '$FORMAT';

// Model pricing per million tokens (input / output)
const pricing = {
  'claude-sonnet-4-6': { input: 3, output: 15, label: 'Sonnet 4.6' },
  'anthropic/claude-sonnet-4-6': { input: 3, output: 15, label: 'Sonnet 4.6' },
  'claude-haiku-4-5': { input: 0.80, output: 4, label: 'Haiku 4.5' },
  'anthropic/claude-haiku-4-5': { input: 0.80, output: 4, label: 'Haiku 4.5' },
  'xai/grok-4-1-fast': { input: 3, output: 15, label: 'Grok 4.1 Fast' },
  'default': { input: 3, output: 15, label: 'Unknown' }
};

function getPricing(model) {
  return pricing[model] || pricing['default'];
}

const agents = {};

try {
  const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          const agent = entry.agent || entry.agentId || 'unknown';
          const model = entry.model || 'default';
          const ts = entry.ts || entry.timestamp || '';

          // Date filter
          if (dateFilter && ts && !ts.startsWith(dateFilter)) continue;
          // Agent filter
          if (agentFilter && agent !== agentFilter) continue;

          if (!agents[agent]) {
            agents[agent] = { model, inputTokens: 0, outputTokens: 0, sessions: 0 };
          }

          agents[agent].inputTokens += (entry.inputTokens || entry.input_tokens || 0);
          agents[agent].outputTokens += (entry.outputTokens || entry.output_tokens || 0);
          agents[agent].sessions++;
          if (entry.model) agents[agent].model = entry.model;
        } catch (e) { /* skip unparseable lines */ }
      }
    } catch (e) { /* skip unreadable files */ }
  }
} catch (e) {
  if (format === 'json') {
    console.log(JSON.stringify({ error: 'Failed to read sessions directory' }));
  } else {
    console.log('Failed to read sessions directory: ' + e.message);
  }
  process.exit(0);
}

if (Object.keys(agents).length === 0) {
  if (format === 'json') {
    console.log(JSON.stringify({ agents: {}, total_cost: 0, note: 'No matching session data found' }));
  } else {
    console.log('No matching session data found.');
    if (dateFilter) console.log('Date filter: ' + dateFilter);
    if (agentFilter) console.log('Agent filter: ' + agentFilter);
  }
  process.exit(0);
}

// Calculate costs
let totalCost = 0;
const rows = [];

for (const [agent, data] of Object.entries(agents).sort((a, b) => a[0].localeCompare(b[0]))) {
  const p = getPricing(data.model);
  const inputCost = (data.inputTokens / 1000000) * p.input;
  const outputCost = (data.outputTokens / 1000000) * p.output;
  const cost = inputCost + outputCost;
  totalCost += cost;
  rows.push({ agent, model: p.label, inputTokens: data.inputTokens, outputTokens: data.outputTokens, cost, sessions: data.sessions });
}

if (format === 'json') {
  console.log(JSON.stringify({ agents: rows, total_cost: Math.round(totalCost * 10000) / 10000 }, null, 2));
} else {
  // Text table
  const header = 'Agent          | Model          | Input Tokens | Output Tokens | Est. Cost';
  const sep =    '---------------|----------------|--------------|---------------|----------';
  console.log(header);
  console.log(sep);
  for (const r of rows) {
    const agent = r.agent.padEnd(14);
    const model = r.model.padEnd(14);
    const input = r.inputTokens.toLocaleString().padStart(12);
    const output = r.outputTokens.toLocaleString().padStart(13);
    const cost = ('\$' + r.cost.toFixed(4)).padStart(9);
    console.log(agent + ' | ' + model + ' | ' + input + ' | ' + output + ' | ' + cost);
  }
  console.log(sep);
  console.log('Total'.padEnd(14) + ' | ' + ''.padEnd(14) + ' | ' + ''.padStart(12) + ' | ' + ''.padStart(13) + ' | \$' + totalCost.toFixed(4));
}
"
