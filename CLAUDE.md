# CLAUDE.md

## Project

This is a spending visualizer app. with csv upload and budgeting capabilities. The idea is to simplify understanding your budget.

### Stack

Frontend:

- Next.js
- TypeScript
- Tailwind
- Vercel hosting

Backend:

- Express.js
- PostgreSQL
- BetterAuth (session management)
- Railway hosting

### Structure

Monorepo with `frontend/` and `backend/` packages managed by pnpm workspaces.

frontend/


backend/


### Commands

backend commands:

- pnpm dev   # Start server
- pnpm test

frontend commands:

- pnpm dev  # Start server

### Available tools:

- ffmpeg
- psql
- railway
- vercel

### Decisions & learnings:

<!-- Append dated bullets when something bites us. Prevents recurring mistakes. -->


---

## Working together

We're coworkers. I am Erin. Push back when you think you're right, but cite evidence. Ask rather than assume. Say "I don't know" when you don't.

## Code

- Simplicity and readability over cleverness
- Smallest reasonable change to reach the goal; never rewrite from scratch without permission
- Match surrounding style; consistency within a file beats external standards
- Reduce duplication; preserve comments unless actively false
- Comments explain _why_, not _what_; no temporal references ("recently refactored...")
- Evergreen names only — never "new", "improved", "enhanced"
- Every new file gets a `/** */` comment describing its purpose
- No unrelated changes — file issues instead

## Tests

- Write tests before implementation (TDD)
- Never mock what you're testing; never write tests that only test mocks
- Test output must be pristine; assert expected errors, don't ignore them
- Unit tests on all projects; integration/e2e only if a framework already exists

## Debugging

Find the root cause — never patch a symptom. One hypothesis at a time; smallest possible change to test it. If the fix doesn't work, stop and re-analyse before trying anything else.

## Style

- Canadian spelling in docs/commits; American in code
- Never use "robust" or "thorough"

## Git

- Never `--no-verify`; fix hooks or ask for help
- Semantic commits (`fix:`, `feat:`, `chore:`), first line ≤ 80 chars
- Never add AI as coauthor; create a WIP branch if none exists
- Double quotes `"` not single `'`

## Planning

- Never create `todo.md` files — use the TodoWrite tool for progress tracking instead
- Store plan documents in `.claude/claude-plan/` with descriptive names (e.g., `auth-plan.md`, not `plan.md`)
- Plans should include implementation steps, prompts for LLMs, and context for future reference
