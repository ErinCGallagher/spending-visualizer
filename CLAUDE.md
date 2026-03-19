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

#### BetterAuth (2026-03-19)

**Database config — pass Pool directly, not wrapped:**
```typescript
// CORRECT
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  ...
});

// WRONG — breaks the pg adapter
export const auth = betterAuth({
  database: { provider: "pg", db: new Pool(...) },
  ...
});
```

**Cookie config — use `advanced.defaultCookieAttributes`, not top-level `cookies`:**
```typescript
advanced: {
  useSecureCookies: process.env.NODE_ENV === "production",
  defaultCookieAttributes: {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    path: "/",
  },
},
```

**Middleware — use `fromNodeHeaders`, not a type cast:**
```typescript
import { fromNodeHeaders } from "better-auth/node";
const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
```

**All `fetch` calls to the API must include `credentials: "include"`** or the session cookie won't be sent and every request returns 401.

**BetterAuth CLI migration doesn't work with the raw `pg` adapter** — it requires Kysely. Always add BetterAuth's tables manually to `migrate.ts`. Required tables: `"user"`, `session`, `account`, `verification` — see `backend/src/db/migrate.ts` for the exact schema (camelCase quoted column names).

**Run `pnpm migrate` after any schema changes.** The database must exist first (`createdb spending_visualizer`).


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

## Environment variables

- `.env` — real secrets and local config (never committed). Contains API keys, OAuth credentials, database URLs, auth secrets.
- `.env.example` — non-secret structural defaults only (committed). Contains only safe, usable defaults like localhost URLs. Never put API keys, secrets, credentials, or placeholders for them — omit those keys entirely so developers are not prompted to fill them in insecurely.

## Planning

- Never create `todo.md` files — use the TodoWrite tool for progress tracking instead
- Store plan documents in `.claude/claude-plan/` with descriptive names (e.g., `auth-plan.md`, not `plan.md`)
- Plans should include implementation steps, prompts for LLMs, and context for future reference
