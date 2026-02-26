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
openclaw gateway run --port 18789 --bind loopback --auth token
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

```bash
# Clone
git clone https://github.com/Yaircohenh/openclaw.git clawos
cd clawos

# Install OpenClaw
npm install -g openclaw

# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start gateway
openclaw gateway run --port 18789 --bind loopback --auth token

# Verify
openclaw doctor
openclaw agents list

# Run tests
node --test tests/configs.test.mjs
```

## Exported Apps

These apps were built by ClawOS agents and live in their own repos:

- [clawos-dashboard](https://github.com/Yaircohenh/clawos-dashboard) — Next.js control panel
- [redev-model](https://github.com/Yaircohenh/redev-model) — Real estate financial model
- [invoice-manager](https://github.com/Yaircohenh/invoice-manager) — Invoice management system

## License

Private. Built on [OpenClaw](https://github.com/nichochar/open-claw).
