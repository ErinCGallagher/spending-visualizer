# API Endpoints

All endpoints are prefixed with `/api`. Authenticated endpoints require a session cookie (set by BetterAuth). All responses are JSON.

---

## Overview

| Method   | Path                              | Auth | Description                                      |
|----------|-----------------------------------|------|--------------------------------------------------|
| `GET`    | `/api/health`                     | No   | Health check                                     |
| `*`      | `/api/auth/*`                     | —    | BetterAuth (sign-up, sign-in, sign-out, session) |
| `DELETE` | `/api/account`                    | Yes  | Delete authenticated user's account              |
| `POST`   | `/api/uploads`                    | Yes  | Parse a CSV and return a preview (no persistence)|
| `POST`   | `/api/uploads/categorise`         | Yes  | AI-suggest categories for transactions           |
| `POST`   | `/api/uploads/confirm`            | Yes  | Persist a confirmed upload to the database       |
| `GET`    | `/api/categories`                 | Yes  | Get full category taxonomy as a nested tree      |
| `POST`   | `/api/categories/organise`        | Yes  | Upsert categories and set parent relationships   |
| `GET`    | `/api/transactions`               | Yes  | Paginated, filtered transaction list             |
| `GET`    | `/api/transactions/meta`          | Yes  | Distinct filter values and date range            |
| `DELETE` | `/api/transactions`               | Yes  | Delete transactions within a date range          |
| `GET`    | `/api/charts/category-totals`     | Yes  | Spending by top-level category                   |
| `GET`    | `/api/charts/country-totals`      | Yes  | Spending per country with days and per-day rate  |
| `GET`    | `/api/charts/trip-totals`         | Yes  | Spending per trip group with days and per-day rate|
| `GET`    | `/api/charts/monthly-totals`      | Yes  | Spending over time, optionally by category       |
| `GET`    | `/api/charts/cumulative`          | Yes  | Running total of spending over time              |
| `GET`    | `/api/groups`                     | Yes  | List all groups for the authenticated user       |
| `POST`   | `/api/groups`                     | Yes  | Create a new group                               |

---

## Health

### `GET /api/health`

Health check. No auth required.

**Response:** `{ "ok": true }`

---

## Auth — `POST|GET /api/auth/*`

Handled entirely by BetterAuth. Covers sign-up, sign-in, sign-out, and session management. See BetterAuth docs for the full route list.

---

## Account — `/api/account`

All endpoints require authentication.

### `DELETE /api/account`

Deletes the authenticated user's account and all associated data. Wrapped in a database transaction — categories are removed first, then uploads (which cascade to transactions, splits, and travellers), then the user record.

**Response:** `{ "ok": true }`

---

## Uploads — `/api/uploads`

All endpoints require authentication.

### `POST /api/uploads`

Parses an uploaded CSV and returns a preview without persisting anything. Max file size 10 MB, max 10,000 rows.

**Request:** Multipart form-data

| Field    | Type   | Required | Notes                              |
|----------|--------|----------|------------------------------------|
| `file`   | file   | Yes      | CSV file                           |
| `parser` | string | Yes      | Parser type — currently `travelspend` |

**Response:**

```json
{
  "transactions": [
    {
      "date": "ISO string",
      "description": "string",
      "amountHome": "number",
      "amountLocal": "number | null",
      "localCurrency": "string | null",
      "categoryName": "string | null",
      "country": "string | null",
      "payer": "string | null",
      "paymentMethod": "string | null",
      "splits": [{ "travellerName": "string", "amountHome": "number" }]
    }
  ],
  "travellers": ["string"],
  "categories": ["string"],
  "errors": ["string"],
  "homeCurrency": "string",
  "dateRange": { "from": "ISO string", "to": "ISO string" },
  "overlapWarning": "boolean"
}
```

---

### `POST /api/uploads/categorise`

Calls Google Gemini to suggest categories for a list of transactions. Degrades gracefully if the AI service is unavailable.

**Request body:**

```json
{
  "transactions": [
    { "description": "string", "country": "string | null" }
  ]
}
```

**Response:**

```json
{
  "results": [
    { "categoryName": "string", "confidence": "number" }
  ]
}
```

---

### `POST /api/uploads/confirm`

Persists a confirmed upload — transactions, travellers, splits, and categories — to the database. Wrapped in a database transaction. Category names are resolved to IDs (creating rows as needed).

**Request body:**

```json
{
  "homeCurrency": "string",
  "sourceFormat": "string",
  "filename": "string",
  "primaryGroupId": "UUID | null",
  "transactions": [
    {
      "date": "ISO string",
      "description": "string",
      "amountHome": "number",
      "amountLocal": "number | null",
      "localCurrency": "string | null",
      "categoryName": "string | null",
      "categoryId": "UUID | null",
      "categorySource": "csv | ai | user | null",
      "categoryConfidence": "number | null",
      "paymentMethod": "string | null",
      "country": "string | null",
      "payer": "string | null",
      "sourceFormat": "string",
      "raw": { "key": "value" },
      "splits": [{ "travellerName": "string", "amountHome": "number" }],
      "groupId": "UUID | null"
    }
  ],
  "travellers": ["string"]
}
```

**Response:** `{ "uploadId": "UUID" }`

---

## Categories — `/api/categories`

All endpoints require authentication.

### `GET /api/categories`

Returns the authenticated user's full category taxonomy as a nested tree.

**Response:**

```json
[
  {
    "id": "UUID",
    "name": "string",
    "children": [
      { "id": "UUID", "name": "string", "children": [] }
    ]
  }
]
```

---

### `POST /api/categories/organise`

Upserts categories and sets parent-child relationships. Idempotent. Wrapped in a database transaction.

**Request body:**

```json
{
  "categories": [
    { "name": "string", "parentName": "string | null" }
  ]
}
```

**Response:** Updated nested taxonomy (same shape as `GET /api/categories`).

---

## Transactions — `/api/transactions`

All endpoints require authentication.

### `GET /api/transactions`

Paginated list of transactions with optional filters.

**Query parameters:**

| Param           | Type   | Notes                          |
|-----------------|--------|--------------------------------|
| `from`          | string | ISO date, inclusive            |
| `to`            | string | ISO date, inclusive            |
| `category`      | UUID   | Filter by category ID          |
| `paymentMethod` | string | Filter by payment method       |
| `traveller`     | string | Filter by traveller name       |
| `groupId`       | UUID   | Filter by group ID             |
| `groupType`     | string | Filter by group type           |
| `page`          | number | Default: 1                     |
| `limit`         | number | Results per page               |

**Response:**

```json
{
  "transactions": [
    {
      "id": "UUID",
      "date": "ISO string",
      "description": "string",
      "amountHome": "number",
      "amountLocal": "number | null",
      "localCurrency": "string | null",
      "categoryId": "UUID | null",
      "categoryName": "string | null",
      "categorySource": "csv | ai | user | null",
      "paymentMethod": "string | null",
      "country": "string | null",
      "payer": "string | null",
      "homeCurrency": "string",
      "groupName": "string | null",
      "groupType": "string | null"
    }
  ],
  "total": "number",
  "page": "number",
  "limit": "number"
}
```

---

### `GET /api/transactions/meta`

Returns distinct values for populating filter dropdowns, plus the overall date range of the user's data.

**Response:**

```json
{
  "categories": [{ "id": "UUID", "name": "string" }],
  "travellers": ["string"],
  "paymentMethods": ["string"],
  "countries": ["string"],
  "dateRange": { "from": "ISO date string", "to": "ISO date string" },
  "groups": [{ "id": "UUID", "name": "string", "groupType": "string" }],
  "homeCurrency": "string"
}
```

---

### `DELETE /api/transactions`

Deletes all transactions within a date range. Cascade handles splits.

**Request body:**

```json
{
  "from": "ISO date string",
  "to": "ISO date string"
}
```

**Response:** `{ "deleted": "number" }`

---

## Charts — `/api/charts`

All endpoints require authentication. Amounts are in the user's home currency. The `country` query parameter can be repeated for multi-select filtering.

### `GET /api/charts/category-totals`

Aggregates spending by top-level category (uses parent category name if one exists, otherwise the category's own name).

**Query parameters:**

| Param       | Type   | Notes                                   |
|-------------|--------|-----------------------------------------|
| `from`      | string | ISO date                                |
| `to`        | string | ISO date                                |
| `traveller` | string | Filters to that traveller's split amount |
| `country`   | string | Repeatable                              |
| `groupId`   | UUID   | Filter to a specific group              |

**Response:**

```json
[{ "category": "string", "total": "number" }]
```

---

### `GET /api/charts/country-totals`

Per-country aggregate: total spent, distinct days present, and spend per day.

**Query parameters:**

| Param       | Type   | Notes                                   |
|-------------|--------|-----------------------------------------|
| `from`      | string | ISO date                                |
| `to`        | string | ISO date                                |
| `traveller` | string | Filters to that traveller's split amount |

**Response:**

```json
[{ "country": "string", "total": "number", "days": "number", "perDay": "number" }]
```

---

### `GET /api/charts/trip-totals`

Per-trip aggregate for groups of type `'trip'`: total spent, distinct days, and spend per day.

**Query parameters:**

| Param       | Type   | Notes                                   |
|-------------|--------|-----------------------------------------|
| `from`      | string | ISO date                                |
| `to`        | string | ISO date                                |
| `traveller` | string | Filters to that traveller's split amount |

**Response:**

```json
[{ "groupId": "UUID", "tripName": "string", "total": "number", "days": "number", "perDay": "number" }]
```

---

### `GET /api/charts/monthly-totals`

Monthly spending aggregations, optionally broken down by category.

**Query parameters:**

| Param         | Type   | Notes                                        |
|---------------|--------|----------------------------------------------|
| `from`        | string | ISO date                                     |
| `to`          | string | ISO date                                     |
| `traveller`   | string | Filters to that traveller's split            |
| `groupBy`     | string | `"category"` or `"total"` (default)          |
| `granularity` | string | `"day"`, `"week"`, or `"month"` (default)    |
| `country`     | string | Repeatable                                   |
| `groupId`     | UUID   | Filter to a specific group                   |

**Response:**

```json
[
  {
    "month": "YYYY-MM",
    "category": "string (only when groupBy=category)",
    "total": "number"
  }
]
```

---

### `GET /api/charts/cumulative`

Running total of spending over time using a SQL window function.

**Query parameters:**

| Param         | Type   | Notes                                        |
|---------------|--------|----------------------------------------------|
| `from`        | string | ISO date                                     |
| `to`          | string | ISO date                                     |
| `traveller`   | string | Filters to that traveller's split            |
| `granularity` | string | `"day"` (default), `"week"`, or `"month"`   |
| `country`     | string | Repeatable                                   |
| `groupId`     | UUID   | Filter to a specific group                   |

**Response:**

```json
[{ "date": "YYYY-MM-DD", "runningTotal": "number" }]
```

---

## Groups — `/api/groups`

All endpoints require authentication.

### `GET /api/groups`

Returns all groups for the authenticated user.

**Response:**

```json
{
  "groups": [
    { "id": "UUID", "name": "string", "groupType": "trip | daily | business", "createdAt": "ISO string" }
  ]
}
```

---

### `POST /api/groups`

Creates a new group.

**Request body:**

```json
{ "name": "string", "groupType": "trip | daily | business" }
```

**Response** (201):

```json
{ "id": "UUID", "name": "string", "groupType": "string", "createdAt": "ISO string" }
```
