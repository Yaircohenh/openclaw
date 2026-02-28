#!/bin/bash
# uninstall-clawos.sh — Cleanly remove ClawOS from this machine
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

INSTALL_DIR="$HOME/Projects/clawos"

echo -e "\n${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     ClawOS Uninstaller               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}\n"

# Confirmation
echo -e "This will remove:"
echo -e "  • $INSTALL_DIR (infra, dashboard, scripts, logs)"
echo -e "  • ~/.openclaw (config, agents, memory, sessions)"
echo -e "  • ClawOS engine (npm global)"
echo ""
read -p "Are you sure? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""

# ── Stop processes ──────────────────────────────────────────────
echo -e "${BOLD}[1/4] Stopping ClawOS processes${NC}"

if [ -f "$INSTALL_DIR/stop.sh" ]; then
  bash "$INSTALL_DIR/stop.sh" 2>/dev/null || true
  ok "Ran stop.sh"
else
  openclaw gateway stop 2>/dev/null || true
  pkill -f "openclaw gateway" 2>/dev/null || true
  pkill -f "next start" 2>/dev/null || true
  ok "Killed processes"
fi

# Unload LaunchAgent if present (macOS)
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
sleep 1

# ── Remove install directory ────────────────────────────────────
echo -e "${BOLD}[2/4] Removing install directory${NC}"

if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  ok "Removed $INSTALL_DIR"
else
  ok "Not found (already removed)"
fi

# ── Remove config directory ─────────────────────────────────────
echo -e "${BOLD}[3/4] Removing config directory${NC}"

if [ -d "$HOME/.openclaw" ]; then
  rm -rf "$HOME/.openclaw"
  ok "Removed ~/.openclaw"
else
  ok "Not found (already removed)"
fi

# ── Remove CLI ──────────────────────────────────────────────────
echo -e "${BOLD}[4/4] Removing ClawOS engine${NC}"

if command -v openclaw >/dev/null 2>&1; then
  NPM_PREFIX="$(npm config get prefix)"
  if [ -w "$NPM_PREFIX/lib" ] 2>/dev/null; then
    npm uninstall -g openclaw 2>/dev/null || true
  else
    sudo npm uninstall -g openclaw 2>/dev/null || true
  fi
  ok "Engine uninstalled"
else
  ok "Engine not found (already removed)"
fi

echo ""
echo -e "${BOLD}ClawOS has been removed.${NC}"
echo ""
