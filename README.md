# spending-visualizer
Easy spending visualizer web app with csv upload and budget making support.

## Setup

1. Install dependencies: `pnpm install`
2. Start PostgreSQL if it isn't already running:
   ```bash
   pg_ctl -D /opt/homebrew/var/postgresql@16 -l /opt/homebrew/var/log/postgresql@16.log start
   ```
   (`brew services start postgresql@16` currently errors out on this machine — use `pg_ctl` directly instead.)
3. Create the database: `createdb spending_visualizer`
4. Copy `backend/.env.example` to `backend/.env` and fill in values
5. Run migrations: `cd backend && pnpm migrate`

## Running

Start the backend and frontend in separate terminals:

```bash
# Terminal 1 — backend
cd backend && pnpm dev

# Terminal 2 — frontend
cd frontend && pnpm dev
```
