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

# Copy agent configs
if [ -d agents ]; then
  cp -r agents/ "$OPENCLAW_DIR/agents/"
  echo "Installed agent configs"
fi

# Copy skills
if [ -d skills ]; then
  cp -r skills/ "$OPENCLAW_DIR/skills/"
  echo "Installed skills"
fi

# Copy cron jobs
if [ -d cron ]; then
  mkdir -p "$OPENCLAW_DIR/cron"
  cp -r cron/ "$OPENCLAW_DIR/cron/"
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
  cp -r completions/ "$OPENCLAW_DIR/completions/"
  echo "Installed shell completions"
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
