# Backend

Express.js API for the spending visualiser.

## Stack

- Express.js
- PostgreSQL
- BetterAuth

## Setup

1. Create the database: `createdb spending_visualizer`
2. Copy `.env.example` to `.env` and fill in values
3. Run migrations: `pnpm migrate`

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the server with hot reload |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run the compiled server |
| `pnpm test` | Run tests |
| `pnpm migrate` | Run database migrations |
| `pnpm clear-data` | Truncate all app data tables (preserves BetterAuth tables) |

## Database

Create the database before running migrations for the first time:

```bash
createdb spending_visualizer
```

To wipe all app data (uploads, transactions, categories, etc.) while keeping user accounts intact:

```bash
pnpm clear-data
```
