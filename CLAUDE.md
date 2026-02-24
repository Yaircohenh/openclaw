# CLAUDE.md - Ninja Dev Container

## Environment
- Running inside a Dev Container. You have full permissions.
- Node.js 22, Python 3, Git, GitHub CLI available.
- The Next.js app is at `workspace/ninja-redev/`.

## Development
- `cd /workspace/workspace/ninja-redev && npm run dev` — start dev server (port 3000)
- `npm run build` — verify production builds
- `npm run lint` — ESLint checks
- `ANTHROPIC_API_KEY` is set in the environment. The `/api/analyze` endpoint uses it.

## Git
- Commit freely. Push when work is complete.
- Main branch: `main`.

## Key Files
- `workspace/ninja-redev/app/page.tsx` — main page
- `workspace/ninja-redev/app/api/analyze/route.ts` — Claude API endpoint
- `workspace/ninja-redev/lib/model.ts` — financial model engine
- `workspace/ninja-redev/lib/pdfParser.ts` — PDF extraction
- `workspace/om_extractor.py` — Python PDF extraction script
