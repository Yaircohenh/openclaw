# Output Verification Checklist

Complete this before reporting a task as done.

## Task Reference
- **Task/Step ID:** ___
- **Agent:** ___
- **Date:** ___

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | ___ | [ ] | |
| 2 | ___ | [ ] | |
| 3 | ___ | [ ] | |

## Quality Gates

- [ ] **Compiles/runs** — No syntax errors, application starts
- [ ] **Tests pass** — All existing tests still green, new tests if applicable
- [ ] **No secrets** — No API keys, passwords, or tokens in committed code
- [ ] **Correct format** — Output matches expected format (JSON, YAML, etc.)
- [ ] **Correct location** — Files are in the right directory

## Self-Assessment

| Item | Value |
|------|-------|
| **Confidence** (1-5) | ___ |
| **Completeness** (%) | ___ |
| **Known issues** | ___ |
| **Time spent** | ___ |
| **Escalation needed?** | Yes / No |

> If confidence < 3 or completeness < 80%, flag this in your report to Tom.

## Deliverables

- [ ] ___ (file/artifact 1)
- [ ] ___ (file/artifact 2)

## Proof Artifacts (MANDATORY)

> Reports without proof artifacts are automatically rejected. Paste actual command output below — narration is not proof.

### File Listing
```
# Paste output of: find <project-dir>/src -type f | head -40
```

### Git Diff
```
# Paste output of: git diff --stat HEAD~1
```

### Build Output
```
# Paste output of: cd <project-dir> && npm run build 2>&1 | tail -20
```

### Key File Content
```
# Paste output of: cat <main-file> (at least one key file)
```

## Sign-off

- **Agent:** ___
- **Status:** Ready for review / Needs escalation
- **Summary:** ___
