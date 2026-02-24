# ClawOS Security Decisions

## Accepted Risks

### 1. Haiku Model Tier for Budget Agents (ACCEPTED)

**Warning:** `models.weak_tier` — Haiku 4.5 agents (accounting, finance, marketing) flagged as more susceptible to prompt injection.

**Decision:** ACCEPT. This is a deliberate cost-tier choice per AGENTS.md.

**Mitigations:**
- These agents have restricted tool access (no shell, no deploy, no git)
- Security-policy.json denylist blocks destructive actions for all agents
- File access scoped to each agent's own workspace directory only
- All financial actions require explicit user approval (riskScore: 1.0)
- All external communications require approval (riskScore: 0.7+)

**Review trigger:** Upgrade to Sonnet if any agent gains tool access or untrusted inbox exposure.

### 2. Trusted Proxies Not Configured (ACCEPTED)

**Warning:** `gateway.trusted_proxies_missing` — Reverse proxy headers not trusted.

**Decision:** ACCEPT while gateway is local-only (loopback bind).

**Action required:** If gateway is ever exposed through a reverse proxy (nginx, Caddy, Cloudflare), set `gateway.trustedProxies` to the proxy IP(s).

### 3. Agent Sandbox Disabled (PLANNED)

**Current state:** Sandbox mode is `off` for all agents. Docker is not available inside the dev container.

**Production plan:**
- Enable Docker on the production host
- Run `openclaw sandbox` for all specialist agents (not main)
- Main agent runs unsandboxed as it needs orchestration access
- Each sandboxed agent gets: read-only workspace mount, no network except gateway, limited CPU/memory

**Config to apply on production:**
```bash
openclaw config set agents.defaults.sandbox.enabled true
openclaw config set agents.defaults.sandbox.network none
openclaw sandbox recreate --all
```

## Rate Limiting

Rate limits configured in `workspace/security-policy.json`:
- Global: 30 req/min, 500K tokens/hr
- Per-agent default: 10 req/min, 100K tokens/hr
- Elevated for main (15 req/min) and ninja (15 req/min) due to higher workload

## Input Validation

Anti-prompt-injection patterns configured in `workspace/security-policy.json`:
- Max message length: 10,000 characters
- HTML stripped from channel inputs
- Deny patterns block common prompt injection phrases
- File upload limit: 50MB (matches channel config)
