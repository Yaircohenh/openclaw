#!/bin/bash
# setup-clawos.sh — ClawOS installer
# Usage: curl -sL <url> | bash   OR   bash setup-clawos.sh
set -euo pipefail

# ── Colors & helpers ─────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
step() { echo -e "\n${BOLD}[$1/14] $2${NC}"; }

INSTALL_DIR="$HOME/Projects/clawos"
INFRA_DIR="$INSTALL_DIR/clawos-infra"
DASH_DIR="$INSTALL_DIR/dashboard"
OPENCLAW_DIR="$HOME/.openclaw"
DASH_PORT=3005
GW_PORT=18789

echo -e "\n${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║        ClawOS Installer v1.6         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}\n"

# ── Stage 1: Preflight checks ───────────────────────────────────
step 1 "Checking requirements"

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
  ok "GitHub authenticated"
elif [ -n "${GITHUB_TOKEN:-}" ]; then
  GH_AUTHENTICATED=1
  git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
  ok "GitHub token configured"
else
  fail "GitHub access not configured"
  echo ""
  echo "    ClawOS repos are private. You need one of:"
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

# ── Stage 2: Stop existing processes ─────────────────────────────
step 2 "Stopping existing processes"

KILLED=0
if pkill -f "openclaw gateway" 2>/dev/null; then
  KILLED=1
  ok "Stopped gateway"
fi

if pkill -f "next start" 2>/dev/null; then
  KILLED=1
  ok "Stopped dashboard"
fi

if [ "$KILLED" -eq 1 ]; then
  sleep 2
else
  ok "No existing processes found"
fi

# ── Stage 3: Backup existing config ─────────────────────────────
step 3 "Backing up existing config"

PRESERVED_KEYS=""
if [ -d "$OPENCLAW_DIR" ]; then
  if [ -f "$INSTALL_DIR/.env" ]; then
    PRESERVED_KEYS=$(cat "$INSTALL_DIR/.env")
    ok "Preserved API keys from .env"
  fi
  BACKUP="$OPENCLAW_DIR.bak.$(date +%s)"
  mv "$OPENCLAW_DIR" "$BACKUP"
  ok "Backed up to $(basename "$BACKUP")"
else
  ok "Fresh install — no config to back up"
fi

# ── Stage 4: Create install directory ────────────────────────────
step 4 "Creating install directory"

mkdir -p "$INSTALL_DIR"
ok "$INSTALL_DIR"

# ── Stage 5: Clone repos ────────────────────────────────────────
step 5 "Downloading ClawOS"

if [ -d "$INFRA_DIR" ]; then
  info "Updating infrastructure..."
  git -C "$INFRA_DIR" pull --ff-only 2>/dev/null || warn "Pull failed, using existing"
else
  git clone https://github.com/Yaircohenh/openclaw.git "$INFRA_DIR" 2>&1 | tail -1
  ok "Infrastructure downloaded"
fi

if [ -d "$DASH_DIR" ]; then
  info "Updating dashboard..."
  git -C "$DASH_DIR" pull --ff-only 2>/dev/null || warn "Pull failed, using existing"
else
  git clone https://github.com/Yaircohenh/clawos-dashboard.git "$DASH_DIR" 2>&1 | tail -1
  ok "Dashboard downloaded"
fi

# ── Stage 6: Clean test data ────────────────────────────────────
step 6 "Cleaning workspace"

cd "$INFRA_DIR"

find . -name "*.sqlite" -delete 2>/dev/null || true
for d in workspace/*/workspace/; do
  [ -d "$d" ] && rm -rf "$d"
done
find . -name "workspace-state.json" -delete 2>/dev/null || true
find . -name ".pi" -type d -exec rm -rf {} + 2>/dev/null || true
rm -rf projects/ 2>/dev/null || true
rm -f identity/device.json 2>/dev/null || true
rm -f .devcontainer/.env 2>/dev/null || true

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

ok "Workspace cleaned"

# ── Stage 7: Clean dashboard build ──────────────────────────────
step 7 "Preparing dashboard"

cd "$DASH_DIR"
rm -f .env.local 2>/dev/null || true
rm -rf .next/ node_modules/ 2>/dev/null || true
ok "Dashboard prepared"

# ── Stage 8: Install ClawOS engine ──────────────────────────────
step 8 "Installing ClawOS engine"

if command -v openclaw >/dev/null 2>&1; then
  ok "Engine already installed ($(openclaw --version 2>/dev/null || echo 'unknown version'))"
else
  info "Installing engine via npm..."
  NPM_PREFIX="$(npm config get prefix)"
  if [ -w "$NPM_PREFIX/lib" ] 2>/dev/null; then
    npm install -g openclaw 2>&1 | tail -1
  else
    info "Requires sudo for global install..."
    sudo npm install -g openclaw 2>&1 | tail -1
  fi
  if command -v openclaw >/dev/null 2>&1; then
    ok "Engine installed ($(openclaw --version 2>/dev/null || echo 'ok'))"
  else
    fail "Engine install failed"
    echo "    Try: sudo npm install -g openclaw"
    exit 1
  fi
fi

# ── Stage 9: Patch gateway bugs ──────────────────────────────────
step 9 "Patching known gateway issues"

OPENCLAW_DIST="$(npm root -g)/openclaw/dist"
if [ -d "$OPENCLAW_DIST" ]; then
  PATCHED=0

  # Patch 1: Strip thinking blocks from ALL session history
  THINKING_FILES=$(grep -rl 'const dropThinkingBlocks = provider === "github-copilot"' "$OPENCLAW_DIST" 2>/dev/null || true)
  if [ -n "$THINKING_FILES" ]; then
    echo "$THINKING_FILES" | while read -r f; do
      perl -pi -e 's/provider === "github-copilot" && modelId\.toLowerCase\(\)\.includes\("claude"\)/true/g' "$f"
    done
    PATCHED=$((PATCHED + 1))
    ok "Patched: thinking blocks stripped from session history"
  else
    ok "Thinking blocks patch not needed"
  fi

  # Patch 2: resolveFallbackRetryPrompt must always return params.body
  FALLBACK_FILES=$(grep -rl 'function resolveFallbackRetryPrompt' "$OPENCLAW_DIST" 2>/dev/null || true)
  if [ -n "$FALLBACK_FILES" ]; then
    NEEDS_PATCH=0
    for f in $FALLBACK_FILES; do
      if ! grep -A1 'function resolveFallbackRetryPrompt' "$f" | grep -q 'return params.body;'; then
        perl -0777 -pi -e 's/function resolveFallbackRetryPrompt\(params\) \{[^}]*\}/function resolveFallbackRetryPrompt(params) {\n\treturn params.body;\n}/g' "$f"
        NEEDS_PATCH=1
      fi
    done
    if [ "$NEEDS_PATCH" -eq 1 ]; then
      PATCHED=$((PATCHED + 1))
      ok "Patched: fallback retry prompt fixed"
    else
      ok "Fallback retry patch not needed"
    fi
  fi

  if [ "$PATCHED" -gt 0 ]; then
    info "$PATCHED patch(es) applied"
  fi
else
  warn "Engine dist not found — skipping patches"
fi

# ── Stage 10: Configure ClawOS ───────────────────────────────────
step 10 "Configuring ClawOS"

cd "$INFRA_DIR"

# Copy agents (prompts + config)
for agent_dir in agents/*/; do
  agent_id=$(basename "$agent_dir")
  mkdir -p "$OPENCLAW_DIR/agents/$agent_id/prompts"
  [ -f "$agent_dir/prompts/system.md" ] && cp "$agent_dir/prompts/system.md" "$OPENCLAW_DIR/agents/$agent_id/prompts/"
  [ -f "$agent_dir/config.json" ] && cp "$agent_dir/config.json" "$OPENCLAW_DIR/agents/$agent_id/"
done
ok "8 agents configured"

# Copy workspace files
mkdir -p "$OPENCLAW_DIR/workspace/scripts" "$OPENCLAW_DIR/workspace/templates"
cp workspace/*.md workspace/*.json "$OPENCLAW_DIR/workspace/" 2>/dev/null || true
cp workspace/scripts/* "$OPENCLAW_DIR/workspace/scripts/" 2>/dev/null || true
cp workspace/templates/* "$OPENCLAW_DIR/workspace/templates/" 2>/dev/null || true
ok "Workspace files installed"

# Copy cron, skills, memory
mkdir -p "$OPENCLAW_DIR/cron" "$OPENCLAW_DIR/memory"
[ -f cron/jobs.json ] && cp cron/jobs.json "$OPENCLAW_DIR/cron/"
[ -f memory/agent-scores.json ] && cp memory/agent-scores.json "$OPENCLAW_DIR/memory/"
for skill_dir in skills/*/; do
  skill_id=$(basename "$skill_dir")
  mkdir -p "$OPENCLAW_DIR/skills/$skill_id"
  [ -f "$skill_dir/manifest.json" ] && cp "$skill_dir/manifest.json" "$OPENCLAW_DIR/skills/$skill_id/"
done
ok "Skills, cron jobs, and memory installed"

# Merge agents into openclaw.json
openclaw setup >/dev/null 2>&1 || true
if [ -f "$OPENCLAW_DIR/openclaw.json" ]; then
  node -e "
    const fs = require('fs');
    const infra = JSON.parse(fs.readFileSync('$INFRA_DIR/config.json', 'utf-8'));
    const oc = JSON.parse(fs.readFileSync('$OPENCLAW_DIR/openclaw.json', 'utf-8'));
    if (!oc.agents) oc.agents = {};
    if (!oc.agents.list) oc.agents.list = [];
    const existingIds = new Set(oc.agents.list.map(a => a.id));
    for (const agent of infra.agents.list) {
      if (!existingIds.has(agent.id)) oc.agents.list.push(agent);
    }
    const main = oc.agents.list.find(a => a.id === 'main' || a.default);
    if (main) {
      if (!main.subagents) main.subagents = {};
      main.subagents.allowAgents = ['*'];
    }
    // Strip keys that the engine rejects
    for (const agent of oc.agents.list) {
      delete agent.enabled;
      if (agent.subagents) delete agent.subagents.maxConcurrent;
    }
    fs.writeFileSync('$OPENCLAW_DIR/openclaw.json', JSON.stringify(oc, null, 2) + '\n');
  "
  ok "Agent roster merged"
fi

# Clean up any remaining invalid config keys
openclaw doctor --fix >/dev/null 2>&1 || true
ok "Config validated"

# Kill any gateway that doctor may have started
openclaw gateway stop >/dev/null 2>&1 || true
pkill -f "openclaw gateway" 2>/dev/null || true
sleep 1

# Security: lock DM policy to allowlist
openclaw config set channels.whatsapp.dmPolicy allowlist >/dev/null 2>&1 || true
openclaw config set channels.telegram.dmPolicy allowlist >/dev/null 2>&1 || true
ok "Security: DM policy set to allowlist"

# Gateway configuration
openclaw config set gateway.mode local >/dev/null 2>&1 || true

GW_TOKEN=$(openssl rand -hex 32)
openclaw config set gateway.auth.mode token >/dev/null 2>&1 || true
openclaw config set gateway.auth.token "$GW_TOKEN" >/dev/null 2>&1 || true
ok "Gateway auth token generated"

openclaw config set gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback true >/dev/null 2>&1 || true

# Unload the LaunchAgent (start.sh manages the gateway)
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
ok "Gateway configured"

# ── Stage 11: Set up API keys ────────────────────────────────────
step 11 "Setting up API keys"

ENV_FILE="$INSTALL_DIR/.env"

# Re-inject preserved keys from previous install
if [ -n "$PRESERVED_KEYS" ]; then
  echo "$PRESERVED_KEYS" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok "Restored keys from previous install"
fi

# Save keys from current environment
save_key_if_set() {
  local key_name="$1"
  local key_val="${!key_name:-}"
  if [ -n "$key_val" ]; then
    [ -f "$ENV_FILE" ] || touch "$ENV_FILE"
    grep -v "^${key_name}=" "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || true
    echo "${key_name}=${key_val}" >> "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
  fi
}

save_key_if_set "ANTHROPIC_API_KEY"
save_key_if_set "XAI_API_KEY"
save_key_if_set "OPENAI_API_KEY"
save_key_if_set "GOOGLE_API_KEY"

# Register API keys with gateway auth system
AUTH_DIR="$OPENCLAW_DIR/agents/main/agent"
mkdir -p "$AUTH_DIR"
AUTH_FILE="$AUTH_DIR/auth-profiles.json"
node -e "
  const fs = require('fs');
  const store = { version: 1, profiles: {} };
  const keys = {
    ANTHROPIC_API_KEY: 'anthropic',
    XAI_API_KEY: 'xai',
    OPENAI_API_KEY: 'openai',
    GOOGLE_API_KEY: 'google'
  };
  for (const [envKey, provider] of Object.entries(keys)) {
    const val = process.env[envKey] || '';
    if (val) {
      store.profiles[provider + ':manual'] = { type: 'api_key', provider, key: val };
    }
  }
  if (Object.keys(store.profiles).length > 0) {
    fs.writeFileSync('$AUTH_FILE', JSON.stringify(store, null, 2) + '\n');
  }
"
if [ -f "$AUTH_FILE" ]; then
  PROFILE_COUNT=$(node -e "const s=JSON.parse(require('fs').readFileSync('$AUTH_FILE','utf-8'));console.log(Object.keys(s.profiles).length)")
  ok "Registered $PROFILE_COUNT provider key(s) with gateway"
fi

# Save gateway token to .env
if [ -n "${GW_TOKEN:-}" ]; then
  [ -f "$ENV_FILE" ] || touch "$ENV_FILE"
  grep -v "^OPENCLAW_GATEWAY_TOKEN=" "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || true
  echo "OPENCLAW_GATEWAY_TOKEN=${GW_TOKEN}" >> "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

if [ -f "$ENV_FILE" ] && [ -s "$ENV_FILE" ]; then
  KEY_COUNT=$(wc -l < "$ENV_FILE" | tr -d ' ')
  ok "$KEY_COUNT key(s) saved to .env"
else
  info "No API keys yet — you'll add them in the setup wizard"
fi

# ── Stage 12: Build dashboard ────────────────────────────────────
step 12 "Building dashboard"

cd "$DASH_DIR"
info "Installing dependencies (this may take a minute)..."
npm install 2>&1 | tail -3
ok "Dependencies installed"

info "Building dashboard..."
npm run build 2>&1 | tail -3
ok "Dashboard built"

# ── Stage 13: Generate launcher scripts ──────────────────────────
step 13 "Creating launcher scripts"

# ── start.sh ──
cat > "$INSTALL_DIR/start.sh" << 'STARTEOF'
#!/bin/bash
# start.sh — Start ClawOS (gateway + dashboard)
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$INSTALL_DIR/.clawos.pids"
GW_PORT=18789
DASH_PORT=3005

# Load environment
ENV_FILE="$INSTALL_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Check for API keys
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -z "${XAI_API_KEY:-}" ] && [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${GOOGLE_API_KEY:-}" ]; then
  echo -e "  ${YELLOW}!${NC} No API keys configured — add them in the dashboard setup wizard"
fi

echo -e "${BOLD}Starting ClawOS...${NC}\n"

# Stop any existing processes
openclaw gateway stop >/dev/null 2>&1 || true
pkill -f "openclaw gateway" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1

# Configure gateway
openclaw config set gateway.mode local >/dev/null 2>&1 || true
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true

# Start gateway
openclaw gateway run --port $GW_PORT --bind lan --auth token --allow-unconfigured > "$INSTALL_DIR/gateway.log" 2>&1 &
GW_PID=$!
echo "$GW_PID" > "$PID_FILE"
sleep 3

if kill -0 $GW_PID 2>/dev/null; then
  echo -e "  ${GREEN}✔${NC} Gateway running (port $GW_PORT)"
else
  echo -e "  ${RED}✘${NC} Gateway failed to start — check gateway.log"
  cat "$INSTALL_DIR/gateway.log" | tail -5
  exit 1
fi

# Start dashboard
cd "$INSTALL_DIR/dashboard"
CLAWOS_ENV_FILE="$ENV_FILE" npx next start -p $DASH_PORT > "$INSTALL_DIR/dashboard.log" 2>&1 &
DASH_PID=$!
echo "$DASH_PID" >> "$PID_FILE"
sleep 2

if kill -0 $DASH_PID 2>/dev/null; then
  echo -e "  ${GREEN}✔${NC} Dashboard running (port $DASH_PORT)"
else
  echo -e "  ${RED}✘${NC} Dashboard failed to start — check dashboard.log"
fi

echo ""
echo -e "${BOLD}  ClawOS is running${NC}"
echo ""
echo -e "  ${CYAN}http://localhost:${DASH_PORT}${NC}  (password: clawos)"
echo ""
echo -e "  Stop:     ${CYAN}bash stop.sh${NC}"
echo -e "  Logs:     gateway.log, dashboard.log"
STARTEOF
chmod +x "$INSTALL_DIR/start.sh"
ok "start.sh"

# ── stop.sh ──
cat > "$INSTALL_DIR/stop.sh" << 'STOPEOF'
#!/bin/bash
# stop.sh — Stop ClawOS
set -euo pipefail

GREEN='\033[0;32m'; BOLD='\033[1m'; NC='\033[0m'
INSTALL_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$INSTALL_DIR/.clawos.pids"

echo -e "${BOLD}Stopping ClawOS...${NC}\n"

STOPPED=0

if [ -f "$PID_FILE" ]; then
  while IFS= read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && STOPPED=1
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

openclaw gateway stop >/dev/null 2>&1 && STOPPED=1 || true
pkill -f "openclaw gateway" 2>/dev/null && STOPPED=1 || true
pkill -f "next start" 2>/dev/null && STOPPED=1 || true
launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true

if [ "$STOPPED" -eq 1 ]; then
  echo -e "  ${GREEN}✔${NC} ClawOS stopped"
else
  echo -e "  ${GREEN}✔${NC} Nothing was running"
fi
STOPEOF
chmod +x "$INSTALL_DIR/stop.sh"
ok "stop.sh"

# ── Stage 14: Start ClawOS ───────────────────────────────────────
step 14 "Starting ClawOS"

info "Starting gateway + dashboard..."
bash "$INSTALL_DIR/start.sh"

# Open browser (macOS only)
if [[ "$(uname)" == "Darwin" ]]; then
  open "http://localhost:$DASH_PORT" 2>/dev/null || true
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       ClawOS is ready!               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Dashboard${NC}   ${CYAN}http://localhost:${DASH_PORT}${NC}"
echo -e "  ${BOLD}Password${NC}    ${CYAN}clawos${NC}"
echo ""
if [ ! -f "$INSTALL_DIR/.env" ] || [ ! -s "$INSTALL_DIR/.env" ]; then
  echo -e "  ${BOLD}Next step${NC}   Add your API keys in the setup wizard"
  echo ""
fi
echo -e "  ${BOLD}Location${NC}    $INSTALL_DIR"
echo -e "  ${BOLD}Stop${NC}        ${CYAN}cd $INSTALL_DIR && bash stop.sh${NC}"
echo -e "  ${BOLD}Restart${NC}     ${CYAN}cd $INSTALL_DIR && bash start.sh${NC}"
echo -e "  ${BOLD}Uninstall${NC}   ${CYAN}bash <(curl -sL https://raw.githubusercontent.com/Yaircohenh/openclaw/main/uninstall-clawos.sh)${NC}"
echo ""
