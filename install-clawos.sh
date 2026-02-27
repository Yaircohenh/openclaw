#!/bin/bash
# install-clawos.sh — Install ClawOS config from an export tarball
set -euo pipefail

echo "=== ClawOS Installer ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required. Install from https://nodejs.org"; exit 1; }

if ! command -v openclaw >/dev/null 2>&1; then
  echo "OpenClaw not found. Installing..."
  NPM_PREFIX="$(npm config get prefix)"
  if [ -w "$NPM_PREFIX/lib" ] 2>/dev/null; then
    npm install -g openclaw
  else
    echo "  (requires sudo for global npm install)"
    sudo npm install -g openclaw
  fi
fi

OPENCLAW_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
WORKSPACE_DIR="${OPENCLAW_DIR}/workspace"

echo "Installing to: $OPENCLAW_DIR"
echo ""

# Ensure directories exist
mkdir -p "$OPENCLAW_DIR" "$WORKSPACE_DIR"

# Copy root config
if [ -f config.json ]; then
  if [ -f "$OPENCLAW_DIR/config.json" ]; then
    cp "$OPENCLAW_DIR/config.json" "$OPENCLAW_DIR/config.json.bak"
    echo "Backed up existing config.json"
  fi
  cp config.json "$OPENCLAW_DIR/"
  echo "Installed config.json"
fi

# Copy agent configs (merge into existing dir, don't nest)
if [ -d agents ]; then
  mkdir -p "$OPENCLAW_DIR/agents"
  for agent_dir in agents/*/; do
    [ -d "$agent_dir" ] && cp -r "$agent_dir" "$OPENCLAW_DIR/agents/"
  done
  echo "Installed agent configs"
fi

# Copy skills (merge into existing dir, don't nest)
if [ -d skills ]; then
  mkdir -p "$OPENCLAW_DIR/skills"
  for skill_dir in skills/*/; do
    [ -d "$skill_dir" ] && cp -r "$skill_dir" "$OPENCLAW_DIR/skills/"
  done
  echo "Installed skills"
fi

# Copy cron jobs
if [ -d cron ]; then
  mkdir -p "$OPENCLAW_DIR/cron"
  cp cron/* "$OPENCLAW_DIR/cron/"
  echo "Installed cron jobs"
fi

# Copy full workspace tree (persona files, scripts, templates, ops/projects)
if [ -d workspace ]; then
  cp -r workspace/* "$WORKSPACE_DIR/"
  echo "Installed workspace files"
fi

# Copy memory dir (agent-scores.json etc.)
if [ -d memory ]; then
  mkdir -p "$OPENCLAW_DIR/memory"
  cp memory/* "$OPENCLAW_DIR/memory/" 2>/dev/null || true
  echo "Installed memory files"
fi

# Copy shell completions
if [ -d completions ]; then
  mkdir -p "$OPENCLAW_DIR/completions"
  cp completions/* "$OPENCLAW_DIR/completions/"
  echo "Installed shell completions"
fi

# Ensure openclaw.json exists before merging agents
if [ ! -f "$OPENCLAW_DIR/openclaw.json" ]; then
  echo "Creating openclaw.json..."
  openclaw doctor --repair 2>/dev/null || true
  if [ ! -f "$OPENCLAW_DIR/openclaw.json" ]; then
    echo '{}' > "$OPENCLAW_DIR/openclaw.json"
  fi
fi

# Set gateway mode BEFORE any doctor calls that try to start the gateway
openclaw config set gateway.mode local 2>/dev/null || {
  # Fallback: inject directly into openclaw.json
  node -e "
    const fs = require('fs');
    const p = '$OPENCLAW_DIR/openclaw.json';
    const c = JSON.parse(fs.readFileSync(p, 'utf-8'));
    c.gateway = c.gateway || {};
    c.gateway.mode = 'local';
    fs.writeFileSync(p, JSON.stringify(c, null, 2) + '\n');
  " 2>/dev/null || true
}
echo "Set gateway.mode = local"

# Merge agents list from config.json into openclaw.json
if [ -f config.json ]; then
  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
      const oc = JSON.parse(fs.readFileSync('$OPENCLAW_DIR/openclaw.json', 'utf-8'));
      if (config.agents?.list) {
        oc.agents = oc.agents || {};
        oc.agents.list = config.agents.list.map(a => {
          // Fix: use 'model' not 'defaultModel'
          if (a.defaultModel && !a.model) {
            a.model = a.defaultModel;
            delete a.defaultModel;
          }
          return a;
        });
        // Ensure main agent can delegate to subagents
        const main = oc.agents.list.find(a => a.id === 'main');
        if (main) {
          if (!main.subagents) main.subagents = {};
          if (!main.subagents.allowAgents) main.subagents.allowAgents = ['*'];
          if (!main.subagents.maxConcurrent) main.subagents.maxConcurrent = 10;
        }
        fs.writeFileSync('$OPENCLAW_DIR/openclaw.json', JSON.stringify(oc, null, 2) + '\n');
        console.log('Merged ' + oc.agents.list.length + ' agents into openclaw.json');
      }
    " 2>&1 || echo "Warning: Could not merge agents list (non-fatal)"
  fi
fi

echo ""
echo "Running doctor to verify..."
openclaw doctor --repair 2>&1 || true

# Kill any gateway that doctor may have started — start.sh manages it
openclaw gateway stop 2>/dev/null || true
pkill -f "openclaw gateway" 2>/dev/null || true
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
echo "Cleaned up stale gateway processes"

# Verification step
echo ""
echo "Verifying installation..."
AGENT_COUNT=0
PROMPT_MISSING=0
if [ -d "$OPENCLAW_DIR/agents" ]; then
  for agent_dir in "$OPENCLAW_DIR/agents"/*/; do
    [ -d "$agent_dir" ] || continue
    AGENT_COUNT=$((AGENT_COUNT + 1))
    agent_name=$(basename "$agent_dir")
    if [ ! -f "$agent_dir/prompts/system.md" ]; then
      echo "  Warning: $agent_name missing prompts/system.md"
      PROMPT_MISSING=$((PROMPT_MISSING + 1))
    fi
  done
fi
echo "  Agents installed: $AGENT_COUNT"
if [ "$PROMPT_MISSING" -gt 0 ]; then
  echo "  Warning: $PROMPT_MISSING agents missing system prompts"
fi

echo ""
echo "Registered agents:"
openclaw agents list 2>&1 || true

echo ""
echo "=== Installation complete ==="
echo ""
echo "Next steps:"
echo "  1. Set ANTHROPIC_API_KEY in your environment"
echo "  2. Run: openclaw configure  (for interactive setup)"
echo "  3. Run: openclaw gateway run  (to start the gateway)"
echo "  4. Run: openclaw status --all  (to verify everything)"
