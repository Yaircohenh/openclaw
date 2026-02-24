# ClawOS Memory System Setup

## Current State (Phase 2)
- **memory-core** plugin: ACTIVE — file-backed full-text search (FTS) across all 8 agent workspaces
- **memory-lancedb** plugin: DISABLED — requires OpenAI API key for vector embeddings

## FTS Search (Works Now)
```bash
# Search across all agent memories
openclaw memory search --query "invoice management"

# Check index status
openclaw memory status

# Force re-index
openclaw memory index --force
```

## Enable Semantic Search (Vector Embeddings)

When you have an OpenAI API key:

```bash
# 1. Set the API key
export OPENAI_API_KEY="sk-your-key-here"

# 2. Update the config
openclaw config set plugins.entries.memory-lancedb.enabled true
openclaw config set plugins.entries.memory-lancedb.config.embedding.apiKey "$OPENAI_API_KEY"
openclaw config set plugins.entries.memory-lancedb.config.embedding.model "text-embedding-3-small"
openclaw config set plugins.entries.memory-lancedb.config.autoCapture true
openclaw config set plugins.entries.memory-lancedb.config.autoRecall true

# 3. Restart gateway
openclaw gateway stop && openclaw gateway run --auth token

# 4. Re-index with embeddings
openclaw memory index --force

# 5. Verify
openclaw memory status  # Should show vector: ready
openclaw memory search --query "how does the financial model work"
```

## Memory Architecture
Each agent has its own memory scope:
- `~/.openclaw/memory/<agent>.sqlite` — SQLite database with FTS index
- `workspace/<agent>/memory/YYYY-MM-DD.md` — Daily session logs
- `workspace/MEMORY.md` — Orchestrator long-term memory (main session only)

## Auto-Capture (with LanceDB)
When enabled, the system automatically captures and indexes:
- Significant decisions and context from conversations
- Task completions and outcomes
- File changes and their context

## Auto-Recall (with LanceDB)
When enabled, the system automatically retrieves relevant memories before each agent response, providing context from past interactions.
