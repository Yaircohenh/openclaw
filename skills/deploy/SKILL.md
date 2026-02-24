# Deploy Skill

Deployment skill for the Ops agent. Handles Vercel deployments with built-in approval gates.

## Usage
Used by the Ops agent to deploy applications to Vercel.

## Commands
- `preview` — Deploy to a preview URL (no approval needed)
- `production` — Deploy to production (REQUIRES user approval)

## Configuration
- Requires `vercel` CLI to be installed
- Project must have a valid `vercel.json` or be linked to Vercel

## Safety
- Production deployments ALWAYS require explicit user approval
- Preview deployments are logged but auto-approved
- Builds are verified before deployment
