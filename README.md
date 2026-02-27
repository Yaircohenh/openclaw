# ClawOS

A multi-agent AI operating system built on [OpenClaw](https://github.com/nichochar/open-claw). ClawOS turns a single-agent assistant into a vertically integrated company — one orchestrator, seven specialists, structured workflows, and a real-time dashboard.

## What OpenClaw Gives You

OpenClaw is the foundation: a self-hosted AI gateway with multi-channel messaging, session management, agent runtime, and extensibility.

- **WebSocket Gateway** — local control plane for sessions, channels, tools
- **Multi-Channel** — WhatsApp, Telegram, Slack, Discord, Signal, Teams, and more
- **Agent Runtime** — tool streaming, model failover, workspace isolation
- **51 Bundled Skills** — coding-agent, github, weather, healthcheck, etc.
- **ClawHub** — community skill registry (`clawhub explore`)
- **Cron Scheduler** — background job scheduling
- **Media Pipeline** — image, audio, video transcription
- **Security** — DM pairing, approval gates, input validation

## What ClawOS Adds

Everything below is built on top of OpenClaw — no core patches, no forks.

### 8-Agent Roster

| Agent | ID | Model | Specialty |
|-------|----|-------|-----------|
| Tom | `main` | Sonnet 4.6 | Master orchestrator — all requests flow through Tom |
| Ninja | `ninja` | Sonnet 4.6 | Software development, data extraction, CLI tools |
| Ops | `ops` | Sonnet 4.6 | DevOps, deployment, RALHP planning & QA |
| CTO | `cto` | Sonnet 4.6 | Architecture review, tech stack, security assessment |
| Accounting | `accounting` | Haiku 4.5 | Invoicing, expense tracking, reports |
| Finance | `finance` | Haiku 4.5 | Budgeting, financial modeling, deal analysis |
| Legal | `legal` | Sonnet 4.6 | Contract review, compliance, risk assessment |
| Marketing | `marketing` | Haiku 4.5 | Content creation, market research, copywriting |

Tom is the single front door. Users talk to Tom; Tom delegates to specialists via OpenClaw's subagent system. Agents never talk to each other directly — all coordination goes through Tom.

### RALHP Build Workflow

**RALHP** (Reason, Act, Learn, Hypothesize, Plan) is a structured multi-agent build loop for non-trivial projects:

1. User requests a build → Tom asks: RALHP or direct?
2. Tom → Ops: create plan with phases, steps, acceptance criteria
3. Tom → Ninja: execute each step per Ops' instructions
4. Tom → Ops: QA review every deliverable (no exceptions)
5. Ops: PASS → next step, FAIL → specific feedback back to Ninja
6. Repeat until all steps pass → final report to user

Each step is logged (`progress.jsonl`), scored, and tracked. Max 3 QA cycles before escalation.

### Operational Framework

Six systems govern how agents work:

| System | Files | Purpose |
|--------|-------|---------|
| Delegation | `CAPABILITIES.md`, `templates/handoff.yml` | Route tasks with full context |
| Escalation | `escalation-rules.md` | When to escalate to Tom or the user |
| Permission Tiers | `TOOLS.md`, `security-policy.json` | 4-tier access control (Open → Denied) |
| Scoring | `memory/agent-scores.json`, `scripts/log-score.sh` | Track agent reliability (0-100) |
| Verification | `templates/verify.md` | Self-check before reporting done |
| Learning | `scripts/learning-review.sh` | Weekly performance insights |

**Permission Tiers:**
- **Tier 1 Open** — reads, searches, memory
- **Tier 2 Logged** — writes, npm install, preview deploys
- **Tier 3 Approval** — git push, prod deploy, email, financial actions
- **Tier 4 Denied** — sudo, rm -rf, calendar, social media, billing

**Scoring:** +2 (pass 1st try), +0 (2nd), -1 (3rd), -3 (escalated). Score < 50 triggers user alert.

### Dashboard

A Next.js 16 control panel with 15 pages:

| Page | What It Does |
|------|-------------|
| Chat | Talk to Tom via SSE streaming |
| Monitor | Real-time agent activity grid |
| Agents | Manage agents — model, name, emoji, score, files |
| Models | CRUD model configurations with fallback chains |
| Sessions | View active gateway sessions |
| Approvals | Review pending actions with risk scores |
| Memory | QMD semantic search across agent memory |
| Channels | WhatsApp/Telegram/Gmail status and pairing |
| Costs | Per-agent token breakdown with estimated spend |
| Health | System health, disk, memory, channel status |
| Skills | Bundled + ClawHub skill discovery |
| Plugins | Loaded gateway plugins |
| Jobs | Cron job management |
| Keys | API keys and integrations hub |
| Logs | Live log streaming |

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Sonner for toasts. Auth via password gate (set `DASHBOARD_PASSWORD` env). All API routes use `execFileSync` with array args for shell safety.

**Repo:** [github.com/Yaircohenh/clawos-dashboard](https://github.com/Yaircohenh/clawos-dashboard)

### Custom Skills

5 HTTP bridge skills connecting agents to external apps:

| Skill | Used By | Integration |
|-------|---------|-------------|
| `invoice-manager-bridge` | Accounting | Invoice Manager API (port 3001) |
| `financial-model-bridge` | Finance | RE Financial Model API (port 3000) |
| `deploy` | Ops | Vercel deployment automation |
| `content-writer` | Marketing | AI content generation |
| `re-om-extractor` | Ninja | PDF/document data extraction |

### QMD Memory Backend

Local hybrid search for agent memory — no external API keys needed.

- **BM25 + vector + reranking** (70% vector / 30% keyword)
- MMR diversity scoring, temporal decay (30-day half-life)
- Session export with 30-day retention
- Per-agent memory directories

### Cron Jobs

| Job | Agent | Schedule | Status |
|-----|-------|----------|--------|
| Daily Memory Review | main | `0 22 * * *` | Enabled |
| System Health Check | ops | `0 */6 * * *` | Enabled |
| Gateway Health Probe | ops | `*/15 * * * *` | Enabled |
| Daily Cost Snapshot | accounting | `0 23 * * *` | Enabled |
| Morning News Brief | main | `0 8 * * *` | Enabled |
| Weekly Learning Review | ops | `0 20 * * 0` | Enabled |
| Weekly Expense Summary | accounting | `0 9 * * 1` | Disabled |

### Templates

Standardized formats for agent operations:

- **`handoff.yml`** — task delegation with context, permissions, escalation
- **`verify.md`** — acceptance criteria check + quality gates + self-assessment
- **`peer-review.yml`** — QA review with findings, verdicts, score impact
- **`context-envelope.yml`** — agent-to-agent context transfer for multi-step chains
- **`plan.yml`** — RALHP project plan with phases and steps

### Scripts

| Script | Purpose |
|--------|---------|
| `log-score.sh` | Update agent score after QA (validates input, clamps 0-100) |
| `cost-report.sh` | Per-agent token cost breakdown (text or JSON) |
| `learning-review.sh` | Weekly performance report with alerts |
| `log-progress.sh` | Log RALHP step progress |
| `check-progress.sh` | Check RALHP step status |

### Testing & CI

- **7 config validation tests** (`node --test tests/configs.test.mjs`)
  - Valid agent configs, security policy, cron jobs, skill manifests, no leaked secrets
- **3 behavioral tests** — security refusal, delegation, multi-agent coordination
- **CI pipeline** (`.github/workflows/ci.yml`) — JSON validation, prompt checks, secret scanning, dashboard build, Docker build

### Production Deployment

```bash
# Quick start
ANTHROPIC_API_KEY=sk-... docker compose -f docker-compose.prod.yml up -d

# Or manual
openclaw gateway run --port 18789 --bind lan --auth token
```

- `Dockerfile.prod` — gateway image
- `docker-compose.prod.yml` — gateway + dashboard stack
- `install-clawos.sh` — automated installation from tarball
- `export-clawos.sh` — portable export (~80K)

## Repository Structure

```
ClawOS/
├── agents/                    # 7 specialist agent configs + prompts
│   ├── ninja/
│   ├── ops/
│   ├── cto/
│   ├── accounting/
│   ├── finance/
│   ├── legal/
│   └── marketing/
├── workspace/                 # Orchestrator workspace (Tom)
│   ├── TOOLS.md               # Delegation matrix, fallback chains, permissions
│   ├── AGENTS.md              # Workspace rules, RALHP roles
│   ├── FRAMEWORK.md           # Operational framework hub
│   ├── CAPABILITIES.md        # Agent capability registry
│   ├── escalation-rules.md    # Escalation triggers
│   ├── templates/             # Handoff, verify, review, context, plan
│   ├── scripts/               # Score, cost, learning, progress
│   └── security-policy.json   # 4-tier permission rules
├── skills/                    # 5 HTTP bridge skills
├── cron/                      # 7 scheduled jobs
├── memory/                    # Agent scores + operational memory
├── tests/                     # Config validation tests
├── docs/                      # Security decisions, memory setup
├── projects/                  # Agent-built tools (clawos-status)
├── config.json                # Main agent roster (8 agents)
├── Dockerfile.prod            # Production gateway image
├── docker-compose.prod.yml    # Full-stack deployment
├── install-clawos.sh          # Automated installer
└── export-clawos.sh           # Portable export script
```

## Requirements

- Node.js 22+
- OpenClaw CLI (`npm install -g openclaw`)
- `ANTHROPIC_API_KEY` environment variable
- Optional: `XAI_API_KEY` for Grok models

## Quick Start

### Install

**Step 0 — GitHub access** (private repo, one-time):

```bash
# Option A: GitHub CLI (recommended)
brew install gh
gh auth login

# Option B: Personal access token
# 1. Go to https://github.com/settings/tokens
# 2. Generate new token (classic) → check "repo" scope
# 3. Export it:
export GITHUB_TOKEN=ghp_your_token_here
```

**Step 1 — Run the installer:**

```bash
# If using gh CLI:
curl -fsSL "$(gh api repos/Yaircohenh/openclaw/contents/setup-clawos.sh --jq .download_url)" | bash

# If using token:
curl -fsSL -H "Authorization: token $GITHUB_TOKEN" \
  https://raw.githubusercontent.com/Yaircohenh/openclaw/main/setup-clawos.sh | bash
```

**Step 2 — Configure OpenClaw (first time only):**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
openclaw setup
```

This creates `~/.openclaw/openclaw.json` with gateway settings. You only need to do this once.

**Step 3 — Start it:**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
cd ~/Projects/clawos && bash start.sh
```

Dashboard at `http://localhost:3000` (password: `clawos`). Stop with `bash stop.sh`.

### Manual Install

```bash
git clone https://github.com/Yaircohenh/openclaw.git clawos
cd clawos
npm install -g openclaw
export ANTHROPIC_API_KEY=sk-ant-...
openclaw setup
openclaw gateway run --port 18789 --bind lan --auth token
```

Verify: `openclaw doctor && openclaw agents list`

### Run Tests

```bash
node --test tests/configs.test.mjs
```

## Troubleshooting

### Gateway failed to start

```
Missing config. Run `openclaw setup` or set gateway.mode=local
```

**Fix:** Run `openclaw setup` first — the gateway needs `~/.openclaw/openclaw.json` to exist. If you've already run setup and it still fails, try:

```bash
openclaw gateway run --port 18789 --bind lan --auth token --allow-unconfigured
```

Check `~/Projects/clawos/gateway.log` for detailed errors.

### Installer backed up my ~/.openclaw

The installer moves your existing `~/.openclaw` to `~/.openclaw.bak.<timestamp>` before installing fresh configs. To restore:

```bash
# Stop ClawOS first
cd ~/Projects/clawos && bash stop.sh

# Restore your original config
rm -rf ~/.openclaw
mv ~/.openclaw.bak.<timestamp> ~/.openclaw
```

### Dashboard shows ERR_CONNECTION_REFUSED

1. Make sure the gateway is running: `lsof -i :18789`
2. Make sure the dashboard is running: `lsof -i :3000`
3. If neither is running: `cd ~/Projects/clawos && bash start.sh`
4. Check logs: `cat ~/Projects/clawos/gateway.log` and `cat ~/Projects/clawos/dashboard.log`

### Someone messaged my WhatsApp and got a response

By default, ClawOS sets all channels to `dmPolicy: "allowlist"` — only approved senders can interact with the bot. Unknown senders are silently blocked.

If you accidentally changed the DM policy, reset it:

```bash
openclaw config set channels.whatsapp.dmPolicy allowlist
openclaw config set channels.telegram.dmPolicy allowlist
```

To approve a new sender (after they message the bot):

```bash
openclaw devices list           # see pending requests
openclaw devices approve <code> # approve a specific sender
```

**Never use `dmPolicy: "pairing"` or `"open"`** — these will cause the bot to send automated responses to strangers.

### Port already in use

```bash
# Kill whatever is on port 3000
lsof -ti:3000 | xargs kill -9

# Kill whatever is on port 18789
lsof -ti:18789 | xargs kill -9

# Restart
cd ~/Projects/clawos && bash start.sh
```

### Claude Code auth stuck in container

If `claude` or `cc` tries browser login inside the Dev Container and gets stuck:

```bash
# The ANTHROPIC_API_KEY env var should bypass browser auth
echo $ANTHROPIC_API_KEY  # verify it's set

# Use print mode for one-shot tasks (always uses API key)
claude -p --dangerously-skip-permissions "your task here"

# For interactive mode, check auth status
claude auth status
```

### API overloaded errors

Anthropic occasionally has capacity issues. Check https://status.anthropic.com. The system will retry automatically, but during outages you may see `529 Overloaded` errors in agent logs.

## Development

### Dev Container (Claude Code Sandbox)

The repo includes a `.devcontainer/` setup for autonomous Claude Code development:

1. Open the repo in VS Code
2. Click "Reopen in Container" (or `Cmd+Shift+P` → Dev Containers: Reopen)
3. Inside the container: `cc` (alias for `claude --dangerously-skip-permissions`)

Claude Code runs with full permissions inside the container. The container has Node.js 22, Python 3, Git, and GitHub CLI pre-installed.

Ports 3000-3004 are forwarded via `appPort` in devcontainer.json.

### Adding a New Agent

```bash
openclaw agents add <name> --model anthropic/claude-sonnet-4-6 --workspace ~/.openclaw/workspace/<name> --non-interactive
openclaw agents set-identity --agent <name> --name "<Name>" --emoji "<emoji>"
```

Then create:
- `agents/<name>/config.json` — model, workspace, skills
- `agents/<name>/prompts/system.md` — system prompt
- Update `workspace/CAPABILITIES.md` with the agent's strengths/weaknesses
- Update `workspace/TOOLS.md` agent roster table
- Update `config.json` agents list

### Project Conventions

- Apps built by agents go in their **own GitHub repos**, not in this one
- This repo is **infrastructure only** — agent configs, templates, scripts, docs
- All shell commands in dashboard API routes use `execFileSync` with array args (never string interpolation)
- API keys and secrets are **never** committed — use `.env` files (gitignored) or env vars
- Agent scoring data lives in `memory/agent-scores.json`

## Exported Apps

These apps were built by ClawOS agents and live in their own repos:

| App | Repo | Description |
|-----|------|-------------|
| Dashboard | [clawos-dashboard](https://github.com/Yaircohenh/clawos-dashboard) | Next.js control panel with 15 pages |
| Redev Model | [redev-model](https://github.com/Yaircohenh/redev-model) | Multifamily real estate financial model |
| Invoice Manager | [invoice-manager](https://github.com/Yaircohenh/invoice-manager) | Invoice management + cash flow dashboard |

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                    User                          │
│         (WhatsApp / Telegram / Web UI)           │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│              OpenClaw Gateway                     │
│         (WebSocket, port 18789)                   │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│              Tom 🚀 (Orchestrator)               │
│     Routes tasks, relays results, logs scores    │
└──┬────┬────┬────┬────┬────┬────┬────────────────┘
   │    │    │    │    │    │    │
   ▼    ▼    ▼    ▼    ▼    ▼    ▼
  Ops  Ninja CTO  Acc  Fin  Leg  Mkt
  🏗️   🥷   🧠   📊   💰   ⚖️   📣
   │    ▲
   │    │  (RALHP Loop)
   └────┘  Plan → Build → Review → Fix → Deploy
```

## Changelog

### v1.2.0-beta (2026-02-26)
- Fix gateway startup failures on macOS
- Fix dashboard path resolution (cross-platform — no more hardcoded `/home/node/`)
- Remove stale `apps/dashboard` references (dashboard lives in its own repo)
- docker-compose now gateway-only
- CI pipeline cleaned up (removed dashboard build job)
- Version numbers aligned across all files

### v1.1 (2026-02-25)
- macOS installer fixes (sudo for npm, Xcode CLT check)
- Beta installer (`setup-clawos.sh`) with 13-stage setup
- Start/stop launcher scripts

### v1.0 (2026-02-24)
- Initial release: 8 agents, 5 skills, gateway, dashboard, operational framework

## License

Private. Built on [OpenClaw](https://github.com/nichochar/open-claw).
