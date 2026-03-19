# spending-visualizer
Easy spending visualizer web app with csv upload and budget making support.

## Setup

1. Install dependencies: `pnpm install`
2. Create the database: `createdb spending_visualizer`
3. Copy `backend/.env.example` to `backend/.env` and fill in values
4. Run migrations: `cd backend && pnpm migrate`

## Running

Start the backend and frontend in separate terminals:

```bash
# Terminal 1 — backend
cd backend && pnpm dev

# Terminal 2 — frontend
cd frontend && pnpm dev
```
