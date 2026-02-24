#!/bin/bash
# export-clawos.sh — Package ClawOS config for installation on any OpenClaw instance
set -euo pipefail

DATE=$(date +%Y-%m-%d)
EXPORT_DIR="/tmp/clawos-export-${DATE}"
TARBALL="/workspace/clawos-config-${DATE}.tar.gz"

echo "=== ClawOS Export Script ==="
echo "Packaging configuration for external installation..."
echo ""

# Clean previous export
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

# 1. Root config
cp /workspace/config.json "$EXPORT_DIR/"

# 2. Agent configs and prompts
cp -r /workspace/agents "$EXPORT_DIR/"

# 3. Skills (with manifests)
cp -r /workspace/skills "$EXPORT_DIR/"

# 4. Cron jobs
cp -r /workspace/cron "$EXPORT_DIR/"

# 5. Workspace persona and policy files (NOT the apps, NOT identity)
mkdir -p "$EXPORT_DIR/workspace"
for f in IDENTITY.md SOUL.md USER.md AGENTS.md TOOLS.md MEMORY.md HEARTBEAT.md; do
  if [ -f "/workspace/workspace/$f" ]; then
    cp "/workspace/workspace/$f" "$EXPORT_DIR/workspace/"
  fi
done

# Security policy
if [ -f "/workspace/workspace/security-policy.json" ]; then
  cp /workspace/workspace/security-policy.json "$EXPORT_DIR/workspace/"
fi

# 6. Shell completions
cp -r /workspace/completions "$EXPORT_DIR/"

# 7. INSTALL instructions
cat > "$EXPORT_DIR/INSTALL.md" << 'INSTALL_EOF'
# ClawOS Installation Guide

## Prerequisites
- OpenClaw CLI installed (`npm install -g openclaw`)
- Node.js 22+
- An Anthropic API key (set as ANTHROPIC_API_KEY)

## Installation Steps

### 1. Copy files to your OpenClaw workspace
```bash
# Copy agent configs
cp -r agents/ ~/.openclaw/agents/ 2>/dev/null || cp -r agents/ /path/to/openclaw/agents/

# Copy skills
cp -r skills/ ~/.openclaw/skills/ 2>/dev/null || cp -r skills/ /path/to/openclaw/skills/

# Copy root config (BACKUP existing first!)
cp config.json ~/.openclaw/config.json

# Copy workspace persona files
cp workspace/*.md ~/.openclaw/workspace/
cp workspace/security-policy.json ~/.openclaw/workspace/

# Copy cron jobs
cp cron/jobs.json ~/.openclaw/cron/jobs.json

# Copy shell completions
cp completions/* ~/.openclaw/completions/ 2>/dev/null || true
```

### 2. Run OpenClaw setup
```bash
openclaw doctor --repair
openclaw agents list  # Should show all 8 agents
openclaw skills list  # Should show new skills
```

### 3. Configure API keys
```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY="your-key-here"

# Optionally configure other providers for fallbacks
export XAI_API_KEY="your-xai-key"  # For Grok fallback
```

### 4. Verify installation
```bash
openclaw status --all
openclaw doctor --deep
```

## Agent Roster
| Agent | Role | Model |
|-------|------|-------|
| main (Tom) | Master Orchestrator | Claude Opus 4.6 |
| ninja | Code Builder | Claude Sonnet 4.6 |
| ops | Operations/DevOps | Claude Sonnet 4.6 |
| cto | Tech Architect | Claude Sonnet 4.6 |
| accounting | Invoice Management | Claude Haiku 4.5 |
| finance | Financial Analysis | Claude Haiku 4.5 |
| legal | Compliance/Contracts | Claude Sonnet 4.6 |
| marketing | Content/Strategy | Claude Haiku 4.5 |

## Services (install separately)
The following apps are NOT included in this export. Install them separately:
- **ninja-redev** — Real estate financial model (Next.js app on port 3000)
- **invoice-manager** — Invoice management dashboard (Next.js app on port 3001)

## Security
- Review `workspace/security-policy.json` and adjust to your needs
- All external actions require user approval by default
- See `workspace/AGENTS.md` for full security rules
INSTALL_EOF

# 8. Create tarball (exclude secrets, identity, and app code)
echo ""
echo "Contents to export:"
find "$EXPORT_DIR" -type f | sort | sed "s|$EXPORT_DIR/||"

echo ""
cd /tmp
tar -czf "$TARBALL" -C /tmp "clawos-export-${DATE}"

echo ""
echo "=== Export complete ==="
echo "Tarball: $TARBALL"
echo "Size: $(du -h "$TARBALL" | cut -f1)"
echo ""
echo "NOT included (by design):"
echo "  - identity/device.json (device-specific keys)"
echo "  - .devcontainer/ (Docker-specific)"
echo "  - workspace/invoice-manager/ (app code)"
echo "  - workspace/ninja-redev/ (app code)"
echo "  - API keys and secrets"

# Cleanup
rm -rf "$EXPORT_DIR"
