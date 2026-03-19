# Spending Visualizer App

## Description

A web app for uploading, visualising, and budgeting personal or shared spending. Users upload a CSV of transactions, review AI-assisted categorisation, and explore their spending through charts. The app supports multi-person, multi-currency expense data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Frontend hosting | Vercel |
| Backend | Express.js (Node.js) |
| Backend hosting | Railway |
| Database | PostgreSQL (Railway) |
| Auth | BetterAuth (Google OAuth) |

---

## MVP Overview

- CSV upload with travelspend format csv parser
- AI-assisted transaction categorisation with an 80% confidence threshold
- User review flow for low-confidence categorisations
- Spending charts: pie by category, bar by month, cumulative line over time
- Manage data: view and delete transactions by timeframe
- Filters by date range, traveller, category, and payment method

---

## Pages

### Dashboard (`/`) — MVP
The main view. Shows all spending charts with global filters across the top.
- Pie chart: spending by category
- Bar chart: spending by month
- Line chart: cumulative spending over time
- Filter bar: date range, traveller, category, payment method
- Empty state with prompt to upload a CSV if no data exists

### Upload (`/upload`) — MVP
Walks the user through importing a new CSV.
- Step 1: drag-and-drop or file picker, parser selection
- Step 2: parsed summary (transaction count, date range, travellers, home currency)
- Step 3: AI categorisation review — list of low-confidence transactions for user input
- Step 4: confirmation and redirect to Dashboard

### Transactions (`/transactions`) — MVP
Tabular view of all imported transactions with filtering and deletion.
- Filterable by timeframe and category
- Delete transactions for a selected timeframe (with confirmation)
- V1: inline editing of transaction fields

### Budget (`/budget`) — V1
Budget configuration and progress tracking.
- Set spending limits per category with a timeframe
- Progress bars with colour-coded status (green / amber / red)
- Invite other users by email to view the budget

### Settings (`/settings`) — MVP
Account and data management.
- Google account info
- Delete account and all associated data

---

## MVP Features

### 1. CSV Upload

- Accept a CSV file via drag-and-drop or file picker
- User selects a parser from the list of available parsers (MVP: TravelSpend only)
- Parse traveller names from header columns dynamically
- Display a summary of what was parsed (number of transactions, date range, travellers detected, home currency)
- Validate required fields and surface errors clearly

### 2. AI Transaction Categorisation

- Transactions that already have a `category` value are accepted as-is
- For transactions with no category, use AI to suggest a category based on `description` and `country`
- AI returns a confidence score for each suggestion
- Suggestions at or above 80% confidence are accepted automatically
- Suggestions below 80% confidence are flagged for user review

#### Review Flow

1. After upload, display a list of low-confidence categorisations
2. For each, show the transaction (`description`, `amount`, `date`) and the AI's suggestion
3. User can accept the suggestion, select a different category, or leave the transaction uncategorised
4. User-defined categories are supported (create new categories inline)

### 3. Spending Charts

All charts operate on **home currency amounts** and default to showing **all travellers combined**. Uncategorised transactions are included in totals and displayed as an "Uncategorised" group.

#### Pie Chart — Spending by Category
- Slice per category, sized by total home-currency spend
- Clicking a slice filters the transaction list to that category

#### Bar Chart — Spending by Month
- One bar per calendar month
- Stacked or grouped by category (toggle)

#### Line Chart — Cumulative Spending Over Time
- Running total of spending across the selected date range
- Selectable granularity: daily, weekly, monthly

### 4. Manage Data

- View a list of all uploaded transactions
- Filter transactions by timeframe (start and end date) and category
- Delete transactions for a selected timeframe
- Confirmation required before deletion

### 5. Filtering and Scoping

All charts and totals respond to the following filters:

- **Date range** — start and end date picker; presets: this month, last month, all time
- **Traveller** — select one, multiple, or all travellers (uses per-traveller share columns)
- **Category** — one or more categories
- **Payment method** — Cash, Credit Card, etc.

---
## Technical Details

### CSV Support

The app supports multiple CSV formats via pluggable parsers. Every format is normalised into a single internal transaction schema before storage.

### Canonical Transaction Schema

All parsers produce this shape regardless of source format:

| Field | Type | Notes |
|---|---|---|
| `date` | date | Normalised from source format |
| `description` | text | Merchant name or notes |
| `amount_home` | decimal | Always in home currency |
| `amount_local` | decimal | Original amount (may equal `amount_home`) |
| `local_currency` | text | ISO code |
| `category` | text | Nullable |
| `category_source` | enum | `csv`, `ai`, `user` |
| `category_confidence` | float | Null when user-set |
| `payment_method` | text | Nullable |
| `country` | text | Nullable |
| `payer` | text | Nullable — TravelSpend only |
| `source_format` | text | `travelspend`, `rbc`, `generic`, etc. |
| `raw` | jsonb | Original CSV row |

Fields not provided by a given format (e.g. `payer`, `country` for bank statements) are stored as null.

### Parser Architecture

The database schema is generic — it stores the canonical transaction shape regardless of source. Each parser owns the mapping from its specific CSV columns to that schema.

Each parser implements a parse interface:

- **`columnMap`** — declares how the parser's source fields map to canonical fields (e.g. `datePaid` → `date`, `amountInHomeCurrency` → `amount_home`)
- **`parse(rows, options)`** — applies the column map and any format-specific transforms to produce canonical transactions

At upload time, the user selects which parser to use from a list of available parsers. The selected parser processes the file and any unrecognised or unmappable rows are surfaced as errors.

### Supported Formats

| Format | MVP | Notes |
|---|---|---|
| TravelSpend export | Yes | Includes multi-currency, per-traveller splits, and pre-assigned categories |
| Generic / bank statement (column-mapping UI) | V1 | User maps their columns once; mapping is saved for reuse |
| Named bank parsers (RBC, TD, CIBC, etc.) | V1 | Eliminates the mapping step for common formats |

### TravelSpend Fields Used

| Field | Description |
|---|---|
| `datePaid` | Transaction date (`YYYY-MM-DD`) |
| `amount` | Amount in local currency |
| `amountInHomeCurrency` | Amount converted to home currency |
| `homeCurrency` | Home currency code (e.g. `CAD`) |
| `localCurrency` | Local currency code (e.g. `PEN`, `USD`) |
| `conversionRate` | Exchange rate applied |
| `category` | Expense category (e.g. Restaurants, Transportation) |
| `notes` | Merchant or description |
| `paidBy` | Traveller who paid |
| `paidFor` | Comma-separated list of travellers the expense covers |
| `paymentMethod` | Cash, Credit Card, etc. |
| `country` | Country where expense occurred |
| `splitObjects` | JSON array of per-traveller share amounts |
| _(per-traveller columns)_ | Each traveller has a column showing their share in home currency (e.g. `kristianallin`, `egal`) |

Traveller columns are dynamic — the parser infers them from the header row by subtracting all known fixed field names from the headers and treating what remains as traveller names.

**Example:** given this header:
```
amount,amountInHomeCurrency,category,...,kristianallin,egal,susannaallin04,...
```
The parser identifies `kristianallin`, `egal`, and `susannaallin04` as travellers. A different group's export would produce a different set of names.

---

## V1 Features

### 6. Edit Transaction Data

- Inline editing of transaction fields: `date`, `description`, `amount_home`, `category`, `payment_method`
- Changes are saved per-transaction and reflected immediately in charts

### 8. Multi-Person View

- **Spending per person** — side-by-side comparison of each traveller's total share
- Per-person breakdown by category
- Per-person bar chart by month
- Traveller toggle: select one, multiple, or all travellers — all charts and totals update accordingly

### 9. Budget

- Users can define a budget for one or more categories
- Budget persists across sessions (stored in the backend database, tied to the user's account)
- Budget owner can invite other users by email to view (read-only) the budget
- Budget configuration:
  - Select categories to budget
  - Set a spending limit per category (in home currency)
  - Set a timeframe: specific month, custom date range, or rolling window
  - Optionally import from an existing uploaded CSV to pre-populate actuals
- Budget display:
  - Progress bars showing actual vs. budgeted per category
  - Colour coding: green (under), amber (within 20% of limit), red (over)
  - Per-day spending rate vs. budget pace

### 10. Additional CSV Parsers

- Column-mapping UI for generic/unknown CSV formats — user maps columns once, mapping is saved for reuse
- Named parsers for common Canadian banks (RBC, TD, CIBC, etc.) — eliminates the mapping step entirely

---

## Non-Functional Requirements

| Requirement | Constraint |
|---|---|
| Max CSV file size | 10 MB |
| Max transactions per upload | 10,000 rows |
| Max transactions per account | 50,000 rows |
| Browser support | Chrome, Safari, Firefox, Edge (latest two versions) |
| Mobile | Responsive layout; dashboard and transactions pages usable on mobile. Upload flow is desktop-first. |
| Performance | Charts render within 2 seconds for up to 50,000 transactions |

---

## Error States

| Scenario | Behaviour |
|---|---|
| CSV is malformed | Show a specific error identifying the problematic row and column; do not import any data |
| CSV is missing required fields | List the missing fields and which parser expects them; reject the upload |
| CSV exceeds size or row limit | Show the limit and reject before parsing |
| Duplicate upload | Detect overlap with existing data by date range; warn the user and ask them to confirm or cancel |
| AI categorisation unavailable | Skip AI suggestions and send all uncategorised transactions directly to the manual review step |
| No data on dashboard | Show an empty state with a prompt to upload a CSV |

---

## Auth & Access

- All pages require authentication — there is no public view
- Login is via Google OAuth through BetterAuth
- On first login, the user is redirected to `/upload`
- On subsequent logins, the user is redirected to `/` (dashboard)
- Sessions last 30 days; users are prompted to re-authenticate after expiry
- The `/budget` share feature grants read-only access to a specific budget for invited users — they cannot view the inviter's transactions or other data

---

## Data Ownership

Each Google account has its own isolated dataset. Traveller names in a TravelSpend export (e.g. `kristianallin`, `egal`) are not separate accounts — they are labels used to attribute splits within a shared trip. One person uploads the data and it belongs to their account.

A user can invite others to view a specific budget (V1), but this is read-only and scoped to that budget only. There is no shared transaction history between accounts.

---

## Out of Scope (for now)

- Receipt scanning or photo import
- Currency conversion beyond what is provided in the CSV
