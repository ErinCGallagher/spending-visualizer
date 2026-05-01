# Spending Visualizer

This is a spending visualizer app with CSV upload and budgeting capabilities, designed to simplify budget management.

## Project Structure

This is a monorepo managed by pnpm workspaces:
- `frontend/`: Next.js 14 application (App Router).
- `backend/`: Express.js server with PostgreSQL.

## Tech Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/docs) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Motion (Framer Motion)](https://www.framer.com/motion/)

### Backend
- **Server**: Express.js
- **Database**: PostgreSQL (Railway hosting)
- **Authentication**: Better Auth (session management)

## Key Commands

### Backend
- `pnpm dev` - Start server
- `pnpm test` - Run backend tests
- `pnpm migrate` - Run database migrations (Run after schema changes)

### Frontend
- `pnpm dev` - Start frontend server

## Frontend Architectural Mandates

- **App Router**: Strictly adhere to Next.js App Router conventions. Use `layout.tsx` for shared UI and `page.tsx` for route entry points.
- **Client Components**: Always include the `"use client"` directive at the very top of files that use React hooks or browser APIs.
- **Imports**: Use the `@/` alias for all internal imports to maintain clean pathing.
- **Data Fetching**: Prefer using custom hooks (like `useFetch`) for client-side data fetching to ensure consistent error and loading state management.
- **Visual Polish**: Large border radii (`rounded-2xl`), soft backgrounds (`bg-slate-50/50`), and Motion-based animations.
- **Authentication**: All interactions must go through `authClient` from `@/lib/auth-client`.

## Backend & Database Mandates

### BetterAuth Learnings
- **Database config**: Pass `Pool` directly, not wrapped in `database: { provider: "pg", db: new Pool(...) }`.
- **Cookie config**: Use `advanced.defaultCookieAttributes`, not top-level `cookies`.
- **Middleware**: Use `fromNodeHeaders` from `better-auth/node`, not a type cast.
- **Credentials**: All `fetch` calls to the API must include `credentials: "include"`.
- **Migrations**: BetterAuth CLI migration doesn't work with the raw `pg` adapter. Add BetterAuth's tables manually to `migrate.ts` (`"user"`, `session`, `account`, `verification`).

## Engineering Standards

### General Principles
- **Simplicity**: Readability over cleverness.
- **Smallest Change**: Minimal changes to reach goals; no rewrites without permission.
- **Consistency**: Match surrounding style within a file.
- **Comments**: Explain *why*, not *what*. description comment (`/** */`) for every new file.
- **Naming**: Evergreen names only (avoid "new", "improved", etc.).

### Testing
- **TDD**: Write tests before implementation.
- **No Mocking Targets**: Never mock what you are testing.
- **Pristine Output**: Assert expected errors; don't ignore them.

### Git & Environment
- **Commits**: Semantic commits (`fix:`, `feat:`, `chore:`), first line ≤ 80 chars.
- **Style**: Double quotes `"` for code; Canadian spelling for docs/commits; American for code.
- **Environment Variables**: 
  - `.env`: Local secrets (never committed).
  - `.env.example`: Structural defaults only (committed, no placeholders for secrets).

## Planning
- **No `todo.md`**: Use project-specific planning tools.
- **Documents**: Store plans in project-specific memory or dedicated folders with descriptive names.
