# clawos-status

A zero-dependency Node.js CLI that reads OpenClaw agent configs and prints a
formatted status dashboard — as a table or JSON.

---

## What it does

`clawos-status` scans `<baseDir>/agents/*/config.json`, extracts key fields
from each agent's config, and displays them in an aligned table (or as a JSON
array with `--json`).

It is intentionally minimal: no npm deps, no build step, runs with plain
`node` on Node.js 18+.

---

## Installation

No `npm install` required — just clone/copy the project and run directly:

```bash
git clone <repo-url> clawos-status
cd clawos-status
chmod +x bin/clawos-status.js   # first time only
```

Or link it globally:

```bash
npm link   # makes `clawos-status` available on PATH
```

---

## Usage

```
clawos-status [baseDir] [options]

Arguments:
  baseDir      Path to the agents root directory (default: cwd)

Options:
  --json       Output agents as a JSON array (pretty-printed)
  --help, -h   Show this help message and exit
```

### Table output (default)

Run from a directory that contains an `agents/` subdirectory:

```bash
node bin/clawos-status.js
```

Example output:

```
Name        | Emoji | Model       | Skills | Paths
------------+-------+-------------+--------+------
Alpha Agent | 🤖    | gpt-4       | 2      | 1
Beta Agent  | 🦾    | claude-3    | 1      | 2

2 agents registered, 3 total skills
```

### JSON output

```bash
node bin/clawos-status.js --json
```

Example output:

```json
[
  {
    "name": "Alpha Agent",
    "emoji": "🤖",
    "model": "gpt-4",
    "skillsCount": 2,
    "pathsCount": 1,
    "raw": { ... }
  }
]
```

### Custom agents root path

```bash
node bin/clawos-status.js /home/user/.openclaw/workspace
node bin/clawos-status.js /some/path --json
```

---

## Config schema

Each agent must have a directory under `<baseDir>/agents/` containing a
`config.json` file with the following shape:

```json
{
  "name": "My Agent",
  "emoji": "🚀",
  "model": "gpt-4o",
  "skills": ["coding", "search", "weather"],
  "fileAccessPaths": ["/home/user/workspace", "/tmp"]
}
```

| Field             | Type     | Required | Default       | Notes                           |
|-------------------|----------|----------|---------------|---------------------------------|
| `name`            | string   | yes      | _(dir name)_  | Display name shown in table     |
| `emoji`           | string   | no       | `🤖`          | Single emoji for visual ID      |
| `model`           | string   | no       | `(unknown)`   | LLM model identifier            |
| `skills`          | string[] | no       | `[]`          | `skillsCount = skills.length`   |
| `fileAccessPaths` | string[] | no       | `[]`          | `pathsCount = fileAccessPaths.length` |

Agents with a missing or malformed `config.json` are **skipped with a warning**
to stderr — they do not crash the tool.

---

## Running tests

Tests use Node.js built-in `node:test` — no test framework to install.

```bash
npm test
# or directly:
node --test test/clawos-status.test.js
```

The 6 test cases cover:

1. Table output with 2 valid agents
2. JSON output with 2 valid agents
3. Graceful skip of a malformed JSON config
4. Graceful skip when `agents/` directory is missing
5. Empty `agents/` directory returns `[]`
6. Summary line accuracy (`X agents registered, Y total skills`)

All fixtures are created in `os.tmpdir()` and cleaned up after each test.

---

## Project structure

```
clawos-status/
├── bin/
│   └── clawos-status.js   # CLI entrypoint
├── lib/
│   ├── readConfigs.js      # Scans agents/ and parses config.json files
│   └── formatTable.js      # Formats agent list as an aligned table string
├── test/
│   └── clawos-status.test.js
├── package.json
└── README.md
```

---

## Design notes

- **Unix-clean:** data goes to stdout, errors/warnings go to stderr
- **Exit codes:** 0 on success, 1 on unrecoverable error
- **No external deps:** uses only `fs`, `path`, `os`, and `node:test`
- **CJS modules:** `require`/`module.exports` for broadest Node.js compat
