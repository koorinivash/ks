# KS Finance API Documentation

Base URL (local): `http://localhost:8000`
Interactive docs: `/docs` (Swagger UI) and `/redoc` (ReDoc) — generated automatically by FastAPI.

All request/response bodies are JSON. There is no authentication.

## Health

| Method | Path | Description |
|---|---|---|
| GET | `/` | Service info |
| GET | `/health` | Health check → `{"status": "ok", "service": "KS Finance API"}` |

## People

| Method | Path | Description |
|---|---|---|
| POST | `/api/people` | Create a person |
| GET | `/api/people` | List people (supports `search`, `status`, `month`, `year` query params) |
| GET | `/api/people/{id}` | Get one person with stats |
| PUT | `/api/people/{id}` | Update a person (partial update) |
| DELETE | `/api/people/{id}` | Delete a person (cascades: deletes their monthly records) |

**PersonCreate body:**
```json
{
  "name": "Arun",
  "phone": "9999999999",
  "default_monthly_amount": 1000,
  "status": "active"
}
```

**PersonWithStats response:**
```json
{
  "id": "66f...",
  "name": "Arun",
  "phone": null,
  "default_monthly_amount": 1000,
  "status": "active",
  "created_at": "2026-09-01T00:00:00Z",
  "updated_at": "2026-09-01T00:00:00Z",
  "total_contributed": 12000,
  "paid_months": 12,
  "pending_months": 0,
  "current_month_status": "paid",
  "current_month_paid": 1000,
  "last_payment_date": "2026-09-05T00:00:00Z"
}
```

## Monthly Records

| Method | Path | Description |
|---|---|---|
| POST | `/api/monthly-records` | Create a monthly payment record |
| GET | `/api/monthly-records` | List records (filters: `person_id`, `month`, `year`, `status`) |
| GET | `/api/monthly-records/{id}` | Get one record |
| PUT | `/api/monthly-records/{id}` | Update a record (status auto-recomputed unless explicitly provided) |
| DELETE | `/api/monthly-records/{id}` | Delete a record |

**MonthlyRecordCreate body:**
```json
{
  "person_id": "66f...",
  "month": 9,
  "year": 2026,
  "amount": 1000,
  "paid_amount": 1000,
  "payment_date": "2026-09-05T00:00:00Z",
  "notes": ""
}
```

Status is computed automatically as:
- `paid_amount <= 0` → `pending`
- `paid_amount >= amount` → `paid`
- otherwise → `partial`

A duplicate record for the same `person_id` + `month` + `year` returns `400 Bad Request`.

## Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard?month=9&year=2026` | Aggregate totals for a month |

```json
{
  "total_people": 25,
  "expected_amount": 30000,
  "collected_amount": 25000,
  "pending_amount": 5000,
  "collection_percentage": 83.33,
  "month": 9,
  "year": 2026
}
```

## Reports

| Method | Path | Description |
|---|---|---|
| GET | `/api/reports/monthly?month=9&year=2026` | JSON report: summary + per-person rows |
| GET | `/api/reports/monthly/excel?month=9&year=2026` | Downloads an `.xlsx` report |
| GET | `/api/reports/monthly/pdf?month=9&year=2026` | Downloads a `.pdf` report |

## Error format

```json
{ "detail": "Human readable message" }
```

| Status | Meaning |
|---|---|
| 200 / 201 | Success |
| 204 | Deleted, no content |
| 400 | Bad request (invalid id, duplicate record, no update fields) |
| 404 | Not found |
| 422 | Validation error |
| 500 | Unexpected server error |
