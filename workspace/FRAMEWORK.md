# ClawOS Operational Framework

Master reference for the 6 systems that govern how agents delegate, verify, review, score, and learn.

## Quick Reference

| System | File(s) | Owner | Purpose |
|--------|---------|-------|---------|
| **Delegation** | `templates/handoff.yml`, `CAPABILITIES.md` | Tom | Route tasks to the right agent with full context |
| **Permission Tiers** | `TOOLS.md`, `security-policy.json` | Tom / Ops | Control what each agent can do |
| **Scoring** | `memory/agent-scores.json`, `scripts/log-score.sh` | Ops | Track agent reliability over time |
| **Verification** | `templates/verify.md` | All agents | Self-check before reporting done |
| **Peer Review** | `templates/peer-review.yml` | Ops (reviewer) | Cross-agent QA with structured findings |
| **Learning** | `scripts/learning-review.sh`, `cron/jobs.json` | Ops (cron) | Weekly insights from scores and progress |

## 1. Delegation

Tom uses the **handoff template** (`templates/handoff.yml`) every time a task is delegated. Before delegating:

1. **Capability check** — consult `CAPABILITIES.md` to confirm the target agent can handle it
2. **Fill handoff** — populate the template with task, context, permissions, escalation contact
3. **Log spawn** — record in `memory/YYYY-MM-DD.md` (task, agent, session ID, channel, timestamp)
4. **Context envelope** — for multi-agent chains, use `templates/context-envelope.yml` to pass prior work

Fallback chains are documented in `TOOLS.md` under "Fallback Chains."

## 2. Permission Tiers

Four tiers map to `security-policy.json`:

| Tier | Level | Actions | Policy |
|------|-------|---------|--------|
| 1 | Open | Read files, web search, memory read | `allow` |
| 2 | Logged | Write own workspace, npm install, preview deploy | `allow_with_logging` |
| 3 | Approval | Git push, prod deploy, email, financial actions | `require_approval` |
| 4 | Denied | sudo, rm -rf, calendar, social, billing | `deny` |

Every handoff includes a `permission_tier` field so the receiving agent knows its boundaries.

## 3. Scoring

Agent scores (0-100) live in `memory/agent-scores.json`. Updated by Ops after each RALHP step via:

```bash
workspace/scripts/log-score.sh <agent_id> <project> <step_id> <outcome> <cycles>
```

| Outcome | Delta |
|---------|-------|
| Pass on 1st try | +2 |
| Pass on 2nd try | +0 |
| Pass on 3rd try | -1 |
| Escalated (3x fail) | -3 |

Fields per agent: `score`, `completed`, `failed`, `avg_cycles`, `streak`, `last_updated`, `history[]`.

Alerts: score < 50 triggers escalation to Yair.

## 4. Verification

Every agent uses `templates/verify.md` before reporting completion:

1. Check each acceptance criterion
2. Run quality gates (compiles, tests, no secrets, correct format/location)
3. Self-assess: confidence (1-5), completeness (%), known issues
4. Flag if confidence < 3 or completeness < 80%

## 5. Peer Review

Ops reviews deliverables using `templates/peer-review.yml`:

- Criteria: functionality, security, performance, code quality, integration
- Verdicts: approved, changes_requested, rejected
- Findings include severity, location, issue, recommendation
- Score impact recorded per review

## 6. Learning Loop

Weekly cron job (`0 20 * * 0`) runs:

```bash
workspace/scripts/learning-review.sh
```

Output: `memory/learning-review-YYYY-MM-DD.md` with:
- Agent score rankings
- Top performers and struggling agents
- Failure patterns and cycle efficiency
- Project progress summaries
- Critical alerts (any score < 50)

## Escalation Rules

See `escalation-rules.md` for the complete trigger list:
- **Universal:** any agent → Tom (outside specialty, blocker, scope change, cost > $5)
- **RALHP:** Ops → Tom (3x fail, external blocker, scope drift, all-pass)
- **User:** Tom → Yair (security, financial, external comms, prod deploy, score < 50)
- **Auto-resolve:** reads, searches, memory updates, preview deploys

## Cost Monitoring

```bash
workspace/scripts/cost-report.sh [--date YYYY-MM-DD] [--agent <id>] [--format text|json]
```

Scans session data for token usage, applies model pricing, outputs per-agent cost table.
