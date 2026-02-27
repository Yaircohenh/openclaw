#!/bin/bash
# upgrade.sh — Safe ClawOS upgrade (preserves memory, sessions, keys, config)
# Usage: cd ~/Projects/clawos/clawos-infra && bash upgrade.sh
set -euo pipefail

# ── Colors & helpers ─────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔${NC} $1"; }
fail() { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${CYAN}→${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
step() { echo -e "\n${BOLD}[$1/8] $2${NC}"; }

INSTALL_DIR="$HOME/Projects/clawos"
INFRA_DIR="$INSTALL_DIR/clawos-infra"
DASH_DIR="$INSTALL_DIR/dashboard"
OPENCLAW_DIR="$HOME/.openclaw"

echo -e "\n${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║      ClawOS Upgrade                  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}\n"

# ── Stage 1: Preflight checks ───────────────────────────────────
step 1 "Preflight checks"

ERRORS=0

if [ ! -d "$INFRA_DIR" ]; then
  fail "clawos-infra not found at $INFRA_DIR"
  echo "    Run setup-clawos.sh first to install ClawOS"
  ERRORS=1
fi

if [ ! -d "$DASH_DIR" ]; then
  fail "dashboard not found at $DASH_DIR"
  echo "    Run setup-clawos.sh first to install ClawOS"
  ERRORS=1
fi

if [ ! -d "$OPENCLAW_DIR" ]; then
  fail "~/.openclaw not found — no existing installation"
  echo "    Run setup-clawos.sh first to install ClawOS"
  ERRORS=1
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  fail "Preflight failed — upgrade requires an existing ClawOS installation"
  exit 1
fi

ok "ClawOS installation found at $INSTALL_DIR"

for cmd in node npm git openclaw; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "$cmd not found"
    exit 1
  fi
done
ok "Dependencies: node $(node --version | tr -d v), npm $(npm --version), git, openclaw"

# ── Stage 2: Stop ClawOS ─────────────────────────────────────────
step 2 "Stopping ClawOS"

KILLED=0
if [ -f "$INSTALL_DIR/stop.sh" ]; then
  bash "$INSTALL_DIR/stop.sh" 2>/dev/null && KILLED=1 || true
else
  # Manual kill (same pattern as setup-clawos.sh)
  pkill -f "openclaw gateway" 2>/dev/null && KILLED=1 || true
  pkill -f "next start" 2>/dev/null && KILLED=1 || true
  openclaw gateway stop 2>/dev/null || true
fi

if [ "$KILLED" -eq 1 ]; then
  sleep 2
  ok "ClawOS stopped"
else
  ok "Nothing was running"
fi

# ── Stage 3: Pull latest code ────────────────────────────────────
step 3 "Pulling latest code"

pull_repo() {
  local dir="$1"
  local name="$2"

  if ! git -C "$dir" diff --quiet 2>/dev/null || ! git -C "$dir" diff --cached --quiet 2>/dev/null; then
    fail "$name has uncommitted changes — commit or stash them first"
    echo "    cd $dir && git status"
    return 1
  fi

  local before
  before=$(git -C "$dir" rev-parse HEAD)

  if ! git -C "$dir" pull --ff-only 2>/dev/null; then
    fail "$name: pull --ff-only failed (branch may have diverged)"
    echo "    cd $dir && git pull"
    return 1
  fi

  local after
  after=$(git -C "$dir" rev-parse HEAD)

  if [ "$before" = "$after" ]; then
    ok "$name: already up to date"
  else
    local count
    count=$(git -C "$dir" rev-list "$before".."$after" --count)
    ok "$name: pulled $count new commit(s)"
  fi
}

PULL_FAILED=0
pull_repo "$INFRA_DIR" "clawos-infra" || PULL_FAILED=1
pull_repo "$DASH_DIR" "dashboard" || PULL_FAILED=1

if [ "$PULL_FAILED" -eq 1 ]; then
  fail "Pull failed — fix the issues above and re-run upgrade.sh"
  exit 1
fi

# ── Stage 4: Sync code to runtime ────────────────────────────────
step 4 "Syncing code to runtime"

SYNCED=0

cd "$INFRA_DIR"

# Agent prompts and configs
for agent_dir in agents/*/; do
  agent_id=$(basename "$agent_dir")

  # Create target dirs if needed (new agents added upstream)
  mkdir -p "$OPENCLAW_DIR/agents/$agent_id/prompts"

  # Sync system prompt
  if [ -f "$agent_dir/prompts/system.md" ]; then
    cp "$agent_dir/prompts/system.md" "$OPENCLAW_DIR/agents/$agent_id/prompts/"
    SYNCED=$((SYNCED + 1))
  fi

  # Sync agent config
  if [ -f "$agent_dir/config.json" ]; then
    cp "$agent_dir/config.json" "$OPENCLAW_DIR/agents/$agent_id/"
    SYNCED=$((SYNCED + 1))
  fi
done
ok "Agent prompts & configs synced"

# Workspace files (*.md + *.json at top level)
mkdir -p "$OPENCLAW_DIR/workspace"
for f in workspace/*.md workspace/*.json; do
  [ -f "$f" ] || continue
  cp "$f" "$OPENCLAW_DIR/workspace/"
  SYNCED=$((SYNCED + 1))
done
ok "Workspace docs synced"

# Workspace scripts
if [ -d workspace/scripts ]; then
  mkdir -p "$OPENCLAW_DIR/workspace/scripts"
  cp workspace/scripts/* "$OPENCLAW_DIR/workspace/scripts/" 2>/dev/null || true
  SYNCED=$((SYNCED + 1))
  ok "Workspace scripts synced"
fi

# Workspace templates
if [ -d workspace/templates ]; then
  mkdir -p "$OPENCLAW_DIR/workspace/templates"
  cp workspace/templates/* "$OPENCLAW_DIR/workspace/templates/" 2>/dev/null || true
  SYNCED=$((SYNCED + 1))
  ok "Workspace templates synced"
fi

# Cron jobs
if [ -f cron/jobs.json ]; then
  mkdir -p "$OPENCLAW_DIR/cron"
  cp cron/jobs.json "$OPENCLAW_DIR/cron/"
  SYNCED=$((SYNCED + 1))
  ok "Cron jobs synced"
fi

# Skill manifests (only manifest.json, not skill code)
for skill_dir in skills/*/; do
  skill_id=$(basename "$skill_dir")
  if [ -f "$skill_dir/manifest.json" ]; then
    mkdir -p "$OPENCLAW_DIR/skills/$skill_id"
    cp "$skill_dir/manifest.json" "$OPENCLAW_DIR/skills/$skill_id/"
    SYNCED=$((SYNCED + 1))
  fi
done
ok "Skill manifests synced"

info "$SYNCED file(s) synced to ~/.openclaw"

# ── Stage 5: Merge new agents ────────────────────────────────────
step 5 "Merging new agents"

MERGED=0
if [ -f "$INFRA_DIR/config.json" ] && [ -f "$OPENCLAW_DIR/openclaw.json" ]; then
  MERGED=$(node -e "
    const fs = require('fs');
    const infra = JSON.parse(fs.readFileSync('$INFRA_DIR/config.json', 'utf-8'));
    const oc = JSON.parse(fs.readFileSync('$OPENCLAW_DIR/openclaw.json', 'utf-8'));

    if (!oc.agents) oc.agents = {};
    if (!oc.agents.list) oc.agents.list = [];

    const existingIds = new Set(oc.agents.list.map(a => a.id));
    let added = 0;

    for (const agent of infra.agents.list) {
      if (!existingIds.has(agent.id)) {
        oc.agents.list.push(agent);
        added++;
      }
    }

    // Ensure main agent keeps subagents.allowAgents
    const main = oc.agents.list.find(a => a.id === 'main' || a.default);
    if (main) {
      if (!main.subagents) main.subagents = {};
      if (!main.subagents.allowAgents || !main.subagents.allowAgents.includes('*')) {
        main.subagents.allowAgents = ['*'];
      }
    }

    fs.writeFileSync('$OPENCLAW_DIR/openclaw.json', JSON.stringify(oc, null, 2) + '\n');
    console.log(added);
  ")

  if [ "$MERGED" -gt 0 ]; then
    ok "Added $MERGED new agent(s) to openclaw.json"
  else
    ok "All agents already registered"
  fi
else
  warn "Skipped agent merge (missing config files)"
fi

# ── Stage 6: Patch gateway ───────────────────────────────────────
step 6 "Patching OpenClaw gateway"

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
    ok "Patched: thinking blocks stripped from all providers"
  else
    ok "Thinking blocks patch already applied"
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
      ok "Patched: fallback retry returns body directly"
    else
      ok "Fallback retry patch already applied"
    fi
  fi

  if [ "$PATCHED" -gt 0 ]; then
    info "$PATCHED gateway patch(es) applied"
  fi
else
  warn "OpenClaw dist not found at $OPENCLAW_DIST — skipping patches"
fi

# ── Stage 7: Rebuild dashboard ───────────────────────────────────
step 7 "Rebuilding dashboard"

cd "$DASH_DIR"
info "Installing dependencies..."
npm install 2>&1 | tail -3
ok "Dependencies installed"

info "Building Next.js app..."
npm run build 2>&1 | tail -3
ok "Dashboard built"

# ── Stage 8: Restart + summary ───────────────────────────────────
step 8 "Restarting ClawOS"

if [ -f "$INSTALL_DIR/start.sh" ]; then
  bash "$INSTALL_DIR/start.sh"
else
  warn "start.sh not found — start ClawOS manually"
  info "cd $INSTALL_DIR && bash start.sh"
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       Upgrade complete!               ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Files synced:${NC}    $SYNCED"
echo -e "  ${BOLD}Agents merged:${NC}   $MERGED"
echo -e "  ${BOLD}Data preserved:${NC}  sessions, memory, API keys, openclaw.json"
echo ""
