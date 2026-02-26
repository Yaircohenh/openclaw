#!/bin/bash
# setup-clawos.sh — Clean beta installer for ClawOS
# Usage: curl -sL <url> | bash   OR   bash setup-clawos.sh
set -euo pipefail

# ── Colors & helpers ─────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
step() { echo -e "\n${BOLD}[$1/13] $2${NC}"; }

INSTALL_DIR="$HOME/Projects/clawos"
INFRA_DIR="$INSTALL_DIR/clawos-infra"
DASH_DIR="$INSTALL_DIR/dashboard"
OPENCLAW_DIR="$HOME/.openclaw"
DASH_PORT=3000
GW_PORT=18789

echo -e "\n${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     ClawOS Beta Installer v1.1       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}\n"

# ── Stage 1: Preflight checks ───────────────────────────────────
step 1 "Preflight checks"

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js not found"
  echo "    Install from: https://nodejs.org (v18+ required)"
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js v${NODE_MAJOR} is too old (need 18+)"
  echo "    Upgrade at: https://nodejs.org"
  exit 1
fi
ok "Node.js v$(node --version | tr -d v)"

if ! command -v npm >/dev/null 2>&1; then
  fail "npm not found (should come with Node.js)"
  exit 1
fi
ok "npm $(npm --version)"

# On macOS, git may be a stub that triggers Xcode CLT install dialog
if [[ "$(uname)" == "Darwin" ]] && ! xcode-select -p >/dev/null 2>&1; then
  fail "Xcode Command Line Tools not installed"
  echo "    Run: xcode-select --install"
  echo "    Then re-run this installer"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  fail "git not found"
  echo "    Install: xcode-select --install  (macOS)"
  exit 1
fi
ok "git $(git --version | awk '{print $3}')"

# GitHub auth (private repos)
GH_AUTHENTICATED=0
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  GH_AUTHENTICATED=1
  ok "GitHub CLI authenticated"
elif [ -n "${GITHUB_TOKEN:-}" ]; then
  GH_AUTHENTICATED=1
  git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
  ok "GitHub token configured"
else
  fail "GitHub access not configured"
  echo ""
  echo "    The ClawOS repos are private. You need one of:"
  echo ""
  echo "    Option 1 — GitHub CLI (recommended):"
  echo "      brew install gh"
  echo "      gh auth login"
  echo ""
  echo "    Option 2 — Personal access token:"
  echo "      1. Go to https://github.com/settings/tokens"
  echo "      2. Generate new token (classic) with 'repo' scope"
  echo "      3. Run: export GITHUB_TOKEN=ghp_your_token_here"
  echo "      4. Re-run this installer"
  echo ""
  exit 1
fi

# ── Stage 2: Kill existing OpenClaw ─────────────────────────────
step 2 "Stopping existing OpenClaw processes"

KILLED=0
if pkill -f "openclaw gateway" 2>/dev/null; then
  KILLED=1
  ok "Stopped openclaw gateway process"
fi

# Stop any existing dashboard (only next start processes, not Docker)
if pkill -f "next start" 2>/dev/null; then
  KILLED=1
  ok "Stopped dashboard process"
fi

if [ "$KILLED" -eq 1 ]; then
  sleep 2
else
  ok "No existing processes found"
fi

# ── Stage 3: Backup existing ~/.openclaw (preserve API keys) ─────
step 3 "Backing up existing config"

PRESERVED_KEYS=""
if [ -d "$OPENCLAW_DIR" ]; then
  # Preserve API keys from existing .env before wiping
  if [ -f "$INSTALL_DIR/.env" ]; then
    PRESERVED_KEYS=$(cat "$INSTALL_DIR/.env")
    ok "Preserved API keys from .env"
  fi
  BACKUP="$OPENCLAW_DIR.bak.$(date +%s)"
  mv "$OPENCLAW_DIR" "$BACKUP"
  ok "Backed up to $(basename "$BACKUP")"
else
  ok "No existing config to back up"
fi

# ── Stage 4: Create install directory ────────────────────────────
step 4 "Creating install directory"

mkdir -p "$INSTALL_DIR"
ok "$INSTALL_DIR"

# ── Stage 5: Clone repos ────────────────────────────────────────
step 5 "Cloning repositories"

if [ -d "$INFRA_DIR" ]; then
  warn "clawos-infra/ already exists — pulling latest"
  git -C "$INFRA_DIR" pull --ff-only 2>/dev/null || warn "Pull failed, using existing"
else
  git clone https://github.com/Yaircohenh/openclaw.git "$INFRA_DIR" 2>&1 | tail -1
  ok "Cloned clawos-infra"
fi

if [ -d "$DASH_DIR" ]; then
  warn "dashboard/ already exists — pulling latest"
  git -C "$DASH_DIR" pull --ff-only 2>/dev/null || warn "Pull failed, using existing"
else
  git clone https://github.com/Yaircohenh/clawos-dashboard.git "$DASH_DIR" 2>&1 | tail -1
  ok "Cloned dashboard"
fi

# ── Stage 6: Clean test data from infra ─────────────────────────
step 6 "Cleaning test data from infra"

cd "$INFRA_DIR"

# Remove sqlite databases
find . -name "*.sqlite" -delete 2>/dev/null && ok "Removed sqlite files" || true

# Remove nested test workspaces (e.g. workspace/ninja/workspace/)
for d in workspace/*/workspace/; do
  [ -d "$d" ] && rm -rf "$d"
done

# Remove workspace-state.json files
find . -name "workspace-state.json" -delete 2>/dev/null || true

# Remove .pi directories
find . -name ".pi" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove projects directory (test artifacts)
rm -rf projects/ 2>/dev/null || true

# Remove device identity (contains private keys)
rm -f identity/device.json 2>/dev/null || true

# Remove dev container env
rm -f .devcontainer/.env 2>/dev/null || true

# Reset agent-scores.json to clean template
if [ -f memory/agent-scores.json ]; then
  node -e "
    const fs = require('fs');
    const scores = JSON.parse(fs.readFileSync('memory/agent-scores.json', 'utf-8'));
    for (const id of Object.keys(scores)) {
      scores[id] = { score: 80, completed: 0, failed: 0, avg_cycles: 0, streak: 0, last_updated: null, history: [] };
    }
    fs.writeFileSync('memory/agent-scores.json', JSON.stringify(scores, null, 2) + '\n');
  "
fi

ok "Infra cleaned"

# ── Stage 7: Clean test data from dashboard ──────────────────────
step 7 "Cleaning dashboard build artifacts"

cd "$DASH_DIR"
rm -f .env.local 2>/dev/null || true
rm -rf .next/ node_modules/ 2>/dev/null || true
ok "Dashboard cleaned"

# ── Stage 8: Install OpenClaw CLI ────────────────────────────────
step 8 "Installing OpenClaw CLI"

if command -v openclaw >/dev/null 2>&1; then
  ok "OpenClaw already installed ($(openclaw --version 2>/dev/null || echo 'unknown version'))"
else
  info "Installing openclaw via npm..."
  # Check if npm global prefix is writable (stock macOS Node needs sudo)
  NPM_PREFIX="$(npm config get prefix)"
  if [ -w "$NPM_PREFIX/lib" ] 2>/dev/null; then
    npm install -g openclaw 2>&1 | tail -1
  else
    info "Global npm directory requires sudo..."
    sudo npm install -g openclaw 2>&1 | tail -1
  fi
  if command -v openclaw >/dev/null 2>&1; then
    ok "OpenClaw $(openclaw --version 2>/dev/null || echo 'installed')"
  else
    fail "OpenClaw install failed"
    echo "    Try: sudo npm install -g openclaw"
    exit 1
  fi
fi

# ── Stage 9: Install ClawOS config ──────────────────────────────
step 9 "Installing ClawOS config to ~/.openclaw"

cd "$INFRA_DIR"
bash install-clawos.sh 2>&1 | while IFS= read -r line; do
  echo "    $line"
done
ok "Config installed"

# Set gateway mode (required since OpenClaw v2026.2.24+, belt-and-suspenders)
openclaw config set gateway.mode local 2>/dev/null || true
ok "Gateway mode set to local"

# Unload the LaunchAgent that doctor installed (start.sh manages the gateway)
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
ok "Disabled gateway LaunchAgent (start.sh manages it)"

# ── Stage 10: Persist API keys ────────────────────────────────────
step 10 "Persisting API keys"

ENV_FILE="$INSTALL_DIR/.env"

# Re-inject preserved keys from previous install
if [ -n "$PRESERVED_KEYS" ]; then
  echo "$PRESERVED_KEYS" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok "Restored API keys from previous install"
fi

# Save keys from current environment if not already in .env
save_key_if_set() {
  local key_name="$1"
  local key_val="${!key_name:-}"
  if [ -n "$key_val" ]; then
    # Create file if missing
    [ -f "$ENV_FILE" ] || touch "$ENV_FILE"
    # Remove existing line, append new
    grep -v "^${key_name}=" "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || true
    echo "${key_name}=${key_val}" >> "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
}

save_key_if_set "ANTHROPIC_API_KEY"
save_key_if_set "XAI_API_KEY"
save_key_if_set "OPENAI_API_KEY"

if [ -f "$ENV_FILE" ] && [ -s "$ENV_FILE" ]; then
  KEY_COUNT=$(wc -l < "$ENV_FILE" | tr -d ' ')
  ok "Saved $KEY_COUNT key(s) to $ENV_FILE (chmod 600)"
else
  warn "No API keys found in environment"
  info "You can add them later:  echo 'ANTHROPIC_API_KEY=sk-ant-...' >> $ENV_FILE"
fi

# ── Stage 11: Install & build dashboard ─────────────────────────
step 11 "Building dashboard"

cd "$DASH_DIR"
info "Installing dependencies (this may take a minute)..."
npm install 2>&1 | tail -3
ok "Dependencies installed"

info "Building Next.js app..."
npm run build 2>&1 | tail -3
ok "Dashboard built"

# ── Stage 12: Generate launcher scripts ─────────────────────────
step 12 "Creating launcher scripts"

# ── start.sh ──
cat > "$INSTALL_DIR/start.sh" << 'STARTEOF'
#!/bin/bash
# start.sh — Start ClawOS gateway + dashboard
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$INSTALL_DIR/.clawos.pids"
GW_PORT=18789
DASH_PORT=3000

# Source API keys from .env if present
ENV_FILE="$INSTALL_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Check API key
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo -e "${RED}ERROR:${NC} ANTHROPIC_API_KEY is not set."
  echo ""
  echo "  Option 1:  echo 'ANTHROPIC_API_KEY=sk-ant-...' >> $ENV_FILE"
  echo "  Option 2:  export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
  echo "  Then: bash start.sh"
  exit 1
fi

echo -e "${BOLD}Starting ClawOS...${NC}\n"

# Stop any existing gateway (handles LaunchAgent + manual processes)
openclaw gateway stop 2>/dev/null || true
pkill -f "openclaw gateway" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1

# Ensure gateway mode is set (required since OpenClaw v2026.2.24+)
openclaw config set gateway.mode local 2>/dev/null || true

# Unload LaunchAgent if present (we manage the gateway ourselves)
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true

# Start gateway directly
openclaw gateway run --port $GW_PORT --bind loopback --auth token --allow-unconfigured > "$INSTALL_DIR/gateway.log" 2>&1 &
GW_PID=$!
echo "$GW_PID" > "$PID_FILE"
sleep 3

if kill -0 $GW_PID 2>/dev/null; then
  echo -e "  ${GREEN}✔${NC} Gateway running on port $GW_PORT (PID $GW_PID)"
else
  echo -e "  ${RED}✘${NC} Gateway failed to start — check gateway.log"
  cat "$INSTALL_DIR/gateway.log" | tail -5
  exit 1
fi

# Start dashboard (pass CLAWOS_ENV_FILE so the dashboard can find keys)
cd "$INSTALL_DIR/dashboard"
CLAWOS_ENV_FILE="$ENV_FILE" npx next start -p $DASH_PORT > "$INSTALL_DIR/dashboard.log" 2>&1 &
DASH_PID=$!
echo "$DASH_PID" >> "$PID_FILE"
sleep 2

if kill -0 $DASH_PID 2>/dev/null; then
  echo -e "  ${GREEN}✔${NC} Dashboard running on port $DASH_PORT (PID $DASH_PID)"
else
  echo -e "  ${RED}✘${NC} Dashboard failed to start — check dashboard.log"
fi

echo ""
echo -e "${BOLD}ClawOS is running!${NC}"
echo ""
echo -e "  Dashboard:  ${CYAN}http://localhost:${DASH_PORT}${NC}"
echo -e "  Password:   ${CYAN}clawos${NC}"
echo -e "  Gateway:    ${CYAN}ws://127.0.0.1:${GW_PORT}${NC}"
echo ""
echo "  Logs: gateway.log, dashboard.log"
echo "  Stop: bash stop.sh"
STARTEOF
chmod +x "$INSTALL_DIR/start.sh"
ok "Created start.sh"

# ── stop.sh ──
cat > "$INSTALL_DIR/stop.sh" << 'STOPEOF'
#!/bin/bash
# stop.sh — Stop ClawOS gateway + dashboard
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; BOLD='\033[1m'; NC='\033[0m'
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$INSTALL_DIR/.clawos.pids"
GW_PORT=18789
DASH_PORT=3000

echo -e "${BOLD}Stopping ClawOS...${NC}\n"

STOPPED=0

# Kill by PID file
if [ -f "$PID_FILE" ]; then
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && STOPPED=1
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Also kill by process name (safety net — only ClawOS processes, not Docker)
openclaw gateway stop 2>/dev/null && STOPPED=1 || true
pkill -f "openclaw gateway" 2>/dev/null && STOPPED=1 || true
pkill -f "next start" 2>/dev/null && STOPPED=1 || true

# Unload LaunchAgent if present
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true

if [ "$STOPPED" -eq 1 ]; then
  echo -e "  ${GREEN}✔${NC} ClawOS stopped"
else
  echo -e "  ${GREEN}✔${NC} Nothing was running"
fi
STOPEOF
chmod +x "$INSTALL_DIR/stop.sh"
ok "Created stop.sh"

# ── Stage 13: Welcome message ───────────────────────────────────
step 13 "Done!"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       ClawOS v1.1 installed!         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Location:${NC}  $INSTALL_DIR"
if [ -f "$INSTALL_DIR/.env" ] && [ -s "$INSTALL_DIR/.env" ]; then
  echo -e "  ${BOLD}API keys:${NC}  $INSTALL_DIR/.env"
else
  echo ""
  echo -e "  ${BOLD}Step 1 — Add your API key:${NC}"
  echo -e "  ${CYAN}echo 'ANTHROPIC_API_KEY=sk-ant-...' >> $INSTALL_DIR/.env${NC}"
fi
echo ""
echo -e "  ${BOLD}Start ClawOS:${NC}"
echo -e "  ${CYAN}cd $INSTALL_DIR && bash start.sh${NC}"
echo ""
echo -e "  ${BOLD}Open the dashboard:${NC}"
echo -e "  ${CYAN}http://localhost:$DASH_PORT${NC}"
echo -e "  Password: ${CYAN}clawos${NC}"
echo ""
echo -e "  ${BOLD}Stop:${NC}  ${CYAN}cd $INSTALL_DIR && bash stop.sh${NC}"
echo -e "  ${BOLD}Edit keys:${NC}  ${CYAN}nano $INSTALL_DIR/.env${NC}"
echo ""
echo -e "  Logs are in: $INSTALL_DIR/gateway.log & dashboard.log"
echo ""
