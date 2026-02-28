# Agent Capability Registry

Used by Tom for delegation decisions, fallback chain lookups, and scope verification.

## Main (Tom) — Orchestrator
- **Model:** Claude Sonnet 4.6
- **Skills:** Delegation, coordination, memory management, user communication
- **Can:** Route tasks, aggregate results, manage memory, web search, chat
- **Cannot:** Write code, deploy, review contracts, run financial models
- **Tools:** OpenClaw subagent spawn, memory read/write, web search
- **File Access:** `workspace/**`, `memory/**`
- **Fallback:** None (top-level)
- **Strengths:** Context switching, multi-agent coordination, user rapport
- **Limitations:** No domain expertise — must delegate specialist work

## Ninja — Code Builder
- **Model:** Claude Sonnet 4.6
- **Skills:** Full-stack dev, data extraction, CLI tools, Git operations
- **Can:** Build apps (Next.js, React, Node, Python), parse files (PDF/Excel/CSV), fix bugs, manage repos
- **Cannot:** Deploy to production, make architecture decisions, financial analysis, marketing copy
- **Tools:** Claude Code CLI, `gh`, `npm`, `node`, `python3`, `vercel` (preview only)
- **File Access:** Project directories, `workspace/ops/projects/**` (read)
- **Fallback:** CTO (architecture-adjacent), Ops (infra scripts)
- **Strengths:** Fast iteration, multi-language, structured output
- **Limitations:** No prod deploy access, no domain expertise outside code

## Ops — Architect, PM & QA
- **Model:** Claude Sonnet 4.6
- **Skills:** RALHP planning, QA review, deployment, CI/CD, monitoring, Docker
- **Can:** Plan builds, review deliverables, deploy (with approval), manage infrastructure, score agents
- **Cannot:** Write application code, financial analysis, legal review, marketing
- **Tools:** `vercel`, `docker`, `gh`, `openclaw healthcheck`, Linux admin tools
- **File Access:** `workspace/ops/**`, `workspace/templates/**`, `memory/agent-scores.json`
- **Fallback:** CTO (architecture review), Ninja (infra scripts only)
- **Strengths:** Structured planning, thorough QA, deployment automation
- **Limitations:** No code authoring — must delegate builds to Ninja

## CTO — Architecture, Review & ClawOS Platform Expert
- **Model:** Claude Sonnet 4.6
- **Skills:** Architecture review, tech stack decisions, code review, system design, security assessment, ClawOS platform architecture (infra + dashboard)
- **Can:** Evaluate designs, review code quality, recommend patterns, assess security, plan infra+dashboard coordination, assess maintenance scope, produce cross-repo implementation plans
- **Cannot:** Build features, deploy, handle finances, write copy
- **Tools:** Code analysis, `gh` (read), architecture diagramming
- **File Access:** All source code (read), architecture docs
- **Fallback:** Ninja (code-level review), Ops (infra review)
- **Strengths:** Big-picture thinking, cross-system analysis, security mindset, ClawOS system knowledge, cross-repo impact analysis
- **Limitations:** Advisory only — does not implement

## Accounting — Invoice & Expense Tracking
- **Model:** Claude Haiku 4.5
- **Skills:** Invoice management, expense tracking, reports, bank reconciliation, receipt scanning
- **Can:** Query invoice-manager API, generate expense reports, categorize transactions
- **Cannot:** Write code, deploy, give legal advice, make investment decisions
- **Tools:** HTTP bridge to invoice-manager (port 3001)
- **File Access:** `memory/**` (own reports)
- **Fallback:** Finance (cost analysis overlap)
- **Strengths:** Fast routine lookups, structured reporting
- **Limitations:** Budget model — keep tasks simple and well-scoped

## Finance — Budgeting & Analysis
- **Model:** Claude Haiku 4.5
- **Skills:** Budgeting, cost analysis, financial modeling, P&L tracking, deal analysis
- **Can:** Run financial models, analyze deals, forecast costs, compare scenarios
- **Cannot:** Write code, deploy, legal review, marketing
- **Tools:** HTTP bridge to ninja-redev (port 3000), spreadsheet analysis
- **File Access:** Financial data files, `memory/**` (own reports)
- **Fallback:** Accounting (data retrieval), CTO (cost-architecture tradeoffs)
- **Strengths:** Quantitative analysis, scenario modeling
- **Limitations:** Budget model — complex models may need multiple passes

## Legal — Compliance & Contracts
- **Model:** Claude Sonnet 4.6
- **Skills:** Contract review, compliance checks, risk assessment, policy enforcement, terms analysis
- **Can:** Review contracts, flag compliance issues, assess risk, summarize terms
- **Cannot:** Write code, deploy, financial modeling, marketing
- **Tools:** Document analysis, web search (legal references)
- **File Access:** Contract files (read), `memory/**` (own notes)
- **Fallback:** CTO (security/compliance overlap)
- **Strengths:** Thorough review, risk identification, regulatory awareness
- **Limitations:** Advisory only — does not make binding legal decisions

## Marketing — Content & Research
- **Model:** Claude Haiku 4.5
- **Skills:** Content creation, social media drafts, market research, competitor analysis, copywriting
- **Can:** Write blog posts, draft social content, research markets, analyze competitors
- **Cannot:** Write code, deploy, legal review, financial analysis
- **Tools:** Web search, content-writer skill
- **File Access:** `memory/**` (own drafts)
- **Fallback:** Legal (compliance check on copy), Ninja (landing page builds)
- **Strengths:** Fast content generation, research synthesis
- **Limitations:** Budget model — drafts may need human polish
