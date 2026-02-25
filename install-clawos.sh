#!/bin/bash
# install-clawos.sh — Install ClawOS config from an export tarball
set -euo pipefail

echo "=== ClawOS Installer ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js is required. Install from https://nodejs.org"; exit 1; }

if ! command -v openclaw >/dev/null 2>&1; then
  echo "OpenClaw not found. Installing..."
  npm install -g openclaw
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

# Copy workspace persona files
if [ -d workspace ]; then
  for f in workspace/*.md workspace/*.json; do
    [ -f "$f" ] && cp "$f" "$WORKSPACE_DIR/"
  done
  echo "Installed workspace files"
fi

# Copy shell completions
if [ -d completions ]; then
  mkdir -p "$OPENCLAW_DIR/completions"
  cp completions/* "$OPENCLAW_DIR/completions/"
  echo "Installed shell completions"
fi

# Merge agents list from config.json into openclaw.json
if [ -f config.json ] && [ -f "$OPENCLAW_DIR/openclaw.json" ]; then
  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
      const oc = JSON.parse(fs.readFileSync('$OPENCLAW_DIR/openclaw.json', 'utf-8'));
      if (config.agents?.list) {
        oc.agents = oc.agents || {};
        oc.agents.list = config.agents.list;
        fs.writeFileSync('$OPENCLAW_DIR/openclaw.json', JSON.stringify(oc, null, 2) + '\n');
        console.log('Merged ' + config.agents.list.length + ' agents into openclaw.json');
      }
    " 2>&1 || echo "Warning: Could not merge agents list (non-fatal)"
  fi
fi

echo ""
echo "Running doctor to verify..."
openclaw doctor --repair 2>&1 || true

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
