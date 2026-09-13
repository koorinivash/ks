# KS Finance Database Design

Database engine: **MongoDB Atlas**
Database name: `ks_finance`

## Collections

### `people`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `name` | string | Required |
| `phone` | string \| null | Optional |
| `default_monthly_amount` | number | >= 0 |
| `status` | `"active"` \| `"inactive"` | Default `active` |
| `created_at` | datetime | |
| `updated_at` | datetime | |

Index: `name` (for search).

### `monthly_records`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `person_id` | ObjectId | References `people._id` |
| `month` | int | 1–12 |
| `year` | int | |
| `amount` | number | Expected amount for that month (defaults to the person's `default_monthly_amount`, but can be overridden per month) |
| `paid_amount` | number | >= 0 |
| `status` | `"paid"` \| `"pending"` \| `"partial"` | Auto-computed from `amount`/`paid_amount` unless explicitly overridden |
| `payment_date` | datetime \| null | |
| `notes` | string \| null | |
| `created_at` | datetime | |
| `updated_at` | datetime | |

Indexes:
- `person_id`
- `year`
- `month`
- Compound unique index on `(person_id, year, month)` — prevents duplicate records for the same person/month/year.

## Relationships

- One `person` has many `monthly_records` (one-to-many).
- A person can exist with zero monthly records (payments are optional at creation time).
- Deleting a person cascades: all of their `monthly_records` are deleted too, so the dataset never contains orphaned records pointing at a missing person.

## Why a single `monthly_records` collection instead of embedding records in `people`?

- Keeps `people` documents small and fast to list/search.
- Avoids MongoDB's per-document size growth over years of records.
- Makes month/year range queries (dashboard, reports) simple index-backed queries instead of unwinding arrays.
