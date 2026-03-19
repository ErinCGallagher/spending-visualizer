# API Endpoints

All endpoints are prefixed with `/api`. Authenticated endpoints require a session cookie (set by BetterAuth). All responses are JSON.

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
      "splits": [{ "travellerName": "string", "amountHome": "number" }]
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
      "payer": "string | null"
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
  "dateRange": { "from": "ISO date string", "to": "ISO date string" }
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

**Response:**

```json
[{ "category": "string", "total": "number" }]
```

---

### `GET /api/charts/monthly-totals`

Monthly spending aggregations, optionally broken down by category.

**Query parameters:**

| Param       | Type   | Notes                               |
|-------------|--------|-------------------------------------|
| `from`      | string | ISO date                            |
| `to`        | string | ISO date                            |
| `traveller` | string | Filters to that traveller's split   |
| `groupBy`   | string | `"category"` or `"total"` (default) |
| `country`   | string | Repeatable                          |

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

**Response:**

```json
[{ "date": "YYYY-MM-DD", "runningTotal": "number" }]
```
