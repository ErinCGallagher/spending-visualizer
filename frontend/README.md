# Frontend

Next.js app for the spending visualiser.

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Recharts

## Setup

1. Copy `.env.example` to `.env.local` and fill in values

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Run the production build |

## CSV Utilities

Before uploading a TravelSpend CSV, you can backfill the `country` column using the script at `scripts/set_country.py`:

```bash
python scripts/set_country.py <csv_file> <country>
```

Example:

```bash
python scripts/set_country.py trip.csv Japan
```

This overwrites the `country` field on every data row in the file in place.
