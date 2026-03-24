# Database Structure

PostgreSQL database for the spending visualizer app.

---

## Overview

Seven tables across two concerns: BetterAuth session management and application data.

**Application tables and relationships:**

- `groups` — named expense groups (trips, daily, business). Independent; referenced by uploads and transactions.
- `uploads` — one row per CSV import. Belongs to a user and optionally a group. Parent of transactions and travellers.
- `transactions` — core expense records. Each belongs to an upload (and inherits its user). Optionally linked to a category and a group.
- `categories` — user-defined taxonomy with one level of parent–child hierarchy. Referenced by transactions.
- `travellers` — people on an upload (for splitting). Belong to an upload.
- `transaction_splits` — per-traveller share of a transaction's cost. Belong to a transaction.

**Key cascade rules:** deleting an upload cascades to its transactions, travellers, and splits. Deleting a category sets `category_id` to null on affected transactions (and `parent_id` to null on child categories).

---

## Application Tables

### `uploads`

One record per CSV file upload.

| Column          | Type        | Notes                                     |
|-----------------|-------------|-------------------------------------------|
| `id`            | uuid        | Primary key, default gen_random_uuid()    |
| `user_id`       | text        | Not null                                  |
| `uploaded_at`   | timestamptz | Default now()                             |
| `filename`      | text        |                                           |
| `source_format` | text        | Not null — identifies the CSV parser used |
| `home_currency` | text        | Not null — user's base currency           |
| `group_id`      | uuid        | FK → `groups(id)`                         |

### `categories`

User-defined expense categories. Supports one level of parent–child hierarchy.

| Column      | Type | Notes                                       |
|-------------|------|---------------------------------------------|
| `id`        | uuid | Primary key, default gen_random_uuid()      |
| `user_id`   | text | Not null                                    |
| `name`      | text | Not null                                    |
| `parent_id` | uuid | FK → `categories(id)` on delete set null    |

Unique constraint: `(user_id, name)`.

Orphaned children (whose parent was deleted) are treated as root categories.

### `transactions`

Core expense records parsed from uploaded CSVs.

| Column                | Type          | Notes                                              |
|-----------------------|---------------|----------------------------------------------------|
| `id`                  | uuid          | Primary key, default gen_random_uuid()             |
| `upload_id`           | uuid          | FK → `uploads(id)` cascade delete                 |
| `user_id`             | text          | Not null                                           |
| `date`                | date          | Not null                                           |
| `description`         | text          | Not null                                           |
| `amount_home`         | numeric(12,2) | Not null — amount in home currency                 |
| `amount_local`        | numeric(12,2) | Amount in original local currency, if different    |
| `local_currency`      | text          | ISO currency code for `amount_local`               |
| `category_id`         | uuid          | FK → `categories(id)` on delete set null          |
| `category_source`     | text          | `'csv'`, `'ai'`, or `'user'`                      |
| `category_confidence` | numeric(4,3)  | AI confidence score, 0–1                          |
| `payment_method`      | text          |                                                    |
| `country`             | text          |                                                    |
| `payer`               | text          |                                                    |
| `source_format`       | text          | Not null — mirrors `uploads.source_format`         |
| `raw`                 | jsonb         | Not null — original CSV row for audit              |
| `group_id`            | uuid          | FK → `groups(id)`                                  |

Indexes:
- `idx_transactions_user_date` on `(user_id, date)`
- `idx_transactions_user_category` on `(user_id, category_id)`
- `idx_transactions_group` on `(group_id)`

### `travellers`

Group members associated with an upload (for trip expense splitting).

| Column      | Type | Notes                                  |
|-------------|------|----------------------------------------|
| `id`        | uuid | Primary key, default gen_random_uuid() |
| `upload_id` | uuid | FK → `uploads(id)` cascade delete      |
| `user_id`   | text | Not null                               |
| `name`      | text | Not null                               |

### `transaction_splits`

How a transaction's cost is divided among travellers.

| Column           | Type          | Notes                                  |
|------------------|---------------|----------------------------------------|
| `id`             | uuid          | Primary key, default gen_random_uuid() |
| `transaction_id` | uuid          | FK → `transactions(id)` cascade delete |
| `traveller_name` | text          | Not null                               |
| `amount_home`    | numeric(12,2) | Not null — this traveller's share      |

Index: `idx_splits_transaction` on `(transaction_id)`.

### `groups`

Named expense groups (trips, daily budgets, business spending). Uploads and transactions are associated with a group.

| Column       | Type        | Notes                                           |
|--------------|-------------|-------------------------------------------------|
| `id`         | uuid        | Primary key, default gen_random_uuid()          |
| `user_id`    | text        | Not null                                        |
| `name`       | text        | Not null                                        |
| `group_type` | text        | Not null — `'trip'`, `'daily'`, or `'business'` |
| `created_at` | timestamptz | Default now()                                   |

Index: `idx_groups_user` on `(user_id)`.

---

## Data Flow

1. User selects or creates a group → `groups` row created or reused.
2. User uploads a CSV → `uploads` row created, linked to the group.
3. Parser extracts rows → `transactions` rows inserted, linked to the group.
4. Traveller names extracted → `travellers` rows inserted.
5. Categories resolved or created → `categories` rows upserted.
6. Splits calculated → `transaction_splits` rows inserted.

Deleting an upload cascades to transactions, travellers, and splits.

---

## Key Design Notes

- **User isolation** — every application table carries `user_id` and all queries filter by it.
- **Category hierarchy** — two levels (parent + child). Charts use `COALESCE(parent.name, child.name, 'Uncategorised')` to group by top-level category.
- **Category attribution** — `category_source` tracks whether a category came from the CSV, AI classification, or manual user entry. `category_confidence` stores the AI confidence score.
- **Dual currency** — `amount_home` is always present in the user's base currency; `amount_local` and `local_currency` are optional for foreign transactions.
- **Raw storage** — `transactions.raw` (JSONB) preserves the original CSV row for debugging and re-parsing.
- **Groups** — uploads and transactions can be associated with a named group. Charts can filter or aggregate by group. The `group_type` field drives which chart views are relevant (e.g. per-trip totals for `'trip'` groups).

---

## BetterAuth Tables

Managed by BetterAuth for user and session management. Added manually to `backend/src/db/migrate.ts` (BetterAuth CLI migration does not work with the raw `pg` adapter).

### `"user"`

| Column          | Type      | Notes                     |
|-----------------|-----------|---------------------------|
| `id`            | text      | Primary key               |
| `name`          | text      | Not null                  |
| `email`         | text      | Not null, unique          |
| `emailVerified` | boolean   | Default false             |
| `image`         | text      |                           |
| `createdAt`     | timestamp | Default now()             |
| `updatedAt`     | timestamp | Default now()             |

### `session`

| Column      | Type      | Notes                          |
|-------------|-----------|--------------------------------|
| `id`        | text      | Primary key                    |
| `userId`    | text      | FK → `"user"(id)` cascade delete |
| `token`     | text      | Not null, unique               |
| `expiresAt` | timestamp | Not null                       |
| `ipAddress` | text      |                                |
| `userAgent` | text      |                                |
| `createdAt` | timestamp | Default now()                  |
| `updatedAt` | timestamp | Default now()                  |

### `account`

| Column                  | Type      | Notes                          |
|-------------------------|-----------|--------------------------------|
| `id`                    | text      | Primary key                    |
| `userId`                | text      | FK → `"user"(id)` cascade delete |
| `accountId`             | text      | Not null                       |
| `providerId`            | text      | Not null                       |
| `accessToken`           | text      |                                |
| `refreshToken`          | text      |                                |
| `accessTokenExpiresAt`  | timestamp |                                |
| `refreshTokenExpiresAt` | timestamp |                                |
| `scope`                 | text      |                                |
| `idToken`               | text      |                                |
| `password`              | text      |                                |
| `createdAt`             | timestamp | Default now()                  |
| `updatedAt`             | timestamp | Default now()                  |

Unique constraint: `(userId, providerId)`.

### `verification`

| Column       | Type      | Notes        |
|--------------|-----------|--------------|
| `id`         | text      | Primary key  |
| `identifier` | text      | Not null     |
| `value`      | text      | Not null     |
| `expiresAt`  | timestamp | Not null     |
| `createdAt`  | timestamp | Default now()|
| `updatedAt`  | timestamp | Default now()|
