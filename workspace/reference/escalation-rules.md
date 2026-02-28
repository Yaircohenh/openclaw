# Escalation Rules

Centralized escalation triggers for all ClawOS agents. Referenced by Tom's delegation checklist and individual agent prompts.

## Universal Triggers (Any Agent → Tom)

Any agent MUST escalate back to Tom when:
- Task is **outside their specialty** (see CAPABILITIES.md)
- They **need input from another domain** (e.g., Ninja needs legal review)
- They hit a **blocker** requiring user input or external access
- **Scope has changed** significantly from the original request
- Task involves a **security-sensitive action** (see security-policy.json)
- Estimated cost for a single operation **exceeds $5**

## RALHP Triggers (Ops → Tom)

During RALHP builds, Ops escalates to Tom when:
- An agent **fails the same step 3 times** (qa_cycles >= 3)
- A step is **blocked by an external dependency** (API key, service, user decision)
- The build **scope has drifted** from the original plan
- **All steps pass** — final report ready for user

## User Escalation (Tom → Yair)

Tom MUST escalate to Yair (never auto-resolve) when:
- **Security violation** detected or suspected
- **Financial action** required (payment, transfer, billing change)
- **External communication** to be sent (email, social post, message on Yair's behalf)
- **Production deployment** requested
- Any agent's **score drops below 50** (reliability concern)
- **Destructive action** requested (delete repo, drop data, revoke access)
- **New agent or skill** installation requested

## Auto-Resolve (No Escalation Needed)

These actions are safe and do NOT require escalation:
- Reading files within workspace
- Web searches and research
- Memory reads and updates (within own scope)
- Preview deployments (ninja, ops only)
- Installing npm packages (ninja, ops, cto)
- Running tests
- Generating reports from existing data
- Updating agent-scores.json after QA
