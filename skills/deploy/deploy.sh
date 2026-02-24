#!/bin/bash
# Deploy Skill — Vercel deployment with safety checks
set -euo pipefail

INPUT="$1"
MODE=$(echo "$INPUT" | jq -r '.mode // "preview"')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.projectDir // "."')

if [ ! -d "$PROJECT_DIR" ]; then
  echo '{"error":"Project directory not found","dir":"'"$PROJECT_DIR"'"}'
  exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Verify build
echo '{"step":"build","status":"running"}'
if ! npm run build 2>&1; then
  echo '{"error":"Build failed — deployment aborted"}'
  exit 1
fi
echo '{"step":"build","status":"passed"}'

# Step 2: Deploy
if [ "$MODE" = "production" ]; then
  echo '{"step":"deploy","mode":"production","status":"running","note":"REQUIRES USER APPROVAL"}'
  DEPLOY_URL=$(vercel --yes --prod 2>&1)
else
  echo '{"step":"deploy","mode":"preview","status":"running"}'
  DEPLOY_URL=$(vercel --yes 2>&1)
fi

if [ $? -eq 0 ]; then
  echo '{"step":"deploy","status":"success","url":"'"$DEPLOY_URL"'","mode":"'"$MODE"'"}'
else
  echo '{"error":"Deployment failed","output":"'"$DEPLOY_URL"'"}'
  exit 1
fi
