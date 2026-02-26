# ClawOS Memory System Setup

## Current State
- **QMD backend**: ACTIVE — local-first BM25 + vector + reranking via GGUF models
- **memory-core** plugin: LOADED (fallback if QMD fails)
- **memory-lancedb** plugin: DISABLED (not needed with QMD)

## QMD Memory (Active)

QMD provides semantic search over all agent memory files, running fully locally
with no external API keys needed for search.

### What's indexed
- `MEMORY.md` — long-term curated memory (per agent workspace)
- `memory/**/*.md` — daily logs and topic files
- Session transcripts (opt-in, 30-day retention)

### Search features
- Hybrid BM25 + vector search (70% vector, 30% keyword)
- MMR diversity re-ranking (lambda: 0.7) — reduces near-duplicate results
- Temporal decay (half-life: 30 days) — recent memories rank higher
- Embedding cache (up to 50K entries)
- Auto-citations in search results

### Agent tools
- `memory_search` — semantic recall over indexed snippets
- `memory_get` — read specific memory file/line range

### Config location
`~/.openclaw/openclaw.json` under `memory` and `agents.defaults.memorySearch` keys.

### QMD data directories
Each agent has its own isolated QMD state:
```
~/.openclaw/agents/<agentId>/qmd/
  xdg-config/    — QMD config
  xdg-cache/qmd/ — SQLite index + GGUF models
  sessions/      — exported session transcripts
```

### Manual operations
```bash
# Pre-warm QMD index for an agent
export XDG_CONFIG_HOME="$HOME/.openclaw/agents/main/qmd/xdg-config"
export XDG_CACHE_HOME="$HOME/.openclaw/agents/main/qmd/xdg-cache"
qmd update && qmd embed

# Test a search
qmd query "Dana accountant" -c memory-root --json
```

### Dependencies
- **Bun** v1.3+ (`~/.bun/bin/bun`)
- **QMD** v1.1.0 (`~/.bun/bin/qmd` — wrapper script)
- **node:sqlite** (Node.js 22 built-in)

### Gateway restart
QMD needs bun on the gateway's PATH:
```bash
PATH="$HOME/.bun/bin:$PATH" \
  XAI_API_KEY="..." ANTHROPIC_API_KEY="..." \
  openclaw gateway run --port 18789 --bind loopback --auth token &
```

## Memory Architecture
Each agent has its own memory scope:
- `~/.openclaw/agents/<agent>/qmd/xdg-cache/qmd/index.sqlite` — QMD semantic index
- `~/.openclaw/memory/<agent>.sqlite` — Legacy SQLite FTS index (fallback)
- `workspace/<agent>/memory/YYYY-MM-DD.md` — Daily session logs
- `workspace/MEMORY.md` — Orchestrator long-term memory (main session only)

## Previous Setup (for reference)
The LanceDB plugin is no longer needed. If you want to re-enable it:
```bash
export OPENAI_API_KEY="sk-your-key-here"
openclaw config set plugins.entries.memory-lancedb.enabled true
```
