# CLAUDE.md - ClawOS Platform

## What This Is
ClawOS is a multi-agent AI orchestration platform built on OpenClaw. Tom is the master orchestrator; specialist agents (Ninja, Ops, CTO, Accounting, Finance, Legal, Marketing) handle domain tasks.

## Structure
- `agents/` — Agent configurations (config.json + prompts/system.md per agent)
- `workspace/` — Orchestrator workspace (Tom's identity, tools, memory rules)
- `skills/` — HTTP bridge skills (invoice-manager, financial-model, deploy, content-writer, re-om-extractor)
- `cron/` — Scheduled jobs (health probes, memory review, cost snapshots)
- `memory/` — Operational memory store
- `docs/` — Security decisions and setup guides
- `.devcontainer/` — Docker dev environment for Claude Code

## Development
- Run Claude Code inside the dev container for autonomous development
- Apps built by agents belong in their OWN GitHub repos, not here
- This repo is infrastructure only
- `ANTHROPIC_API_KEY` must be set in the environment

## Key Commands
- `openclaw gateway run` — start the gateway
- `openclaw agents list` — show registered agents
- `openclaw doctor` — health check
- `node --test tests/configs.test.mjs` — validate configs

## Git
- Main branch: `main`
- Commit freely. Push when work is complete.
