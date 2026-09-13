# KS — Backend

FastAPI + MongoDB backend for the KS monthly finance management app. No authentication — designed to be used by a single trusted group.

## Stack

- Python 3.11+
- FastAPI, Uvicorn
- Motor (async MongoDB driver)
- Pydantic v2
- openpyxl (Excel export), reportlab (PDF export)

## Setup

```bash
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
# or: venv\Scripts\activate.bat (cmd) / venv\Scripts\Activate.ps1 (PowerShell)

pip install -r requirements.txt
cp .env.example .env
# edit .env with your MongoDB Atlas connection string
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API root: http://localhost:8000/
- Health check: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Test

```bash
pip install -r requirements-dev.txt
pytest -q
```

Tests run against an in-memory MongoDB mock (`mongomock-motor`), so no real database is needed to run the suite.

## Deploy on Render

Follow [RENDER.md](RENDER.md) for the Blueprint setup or manual Web Service settings. The included `render.yaml` targets a backend-only repository, pins Python, and configures `/health`. Store the MongoDB connection string in Render's environment settings.

## Project layout

```
app/
  main.py            FastAPI app, CORS, exception handlers
  config.py          Settings (env vars)
  database/          MongoDB connection + index creation
  models/            Mongo document builders/converters
  schemas/           Pydantic request/response schemas
  routes/            people, monthly_records, dashboard, reports
  services/          finance_service (calculations), report_service (Excel/PDF)
```

See [../docs/API_DOCUMENTATION.md](../docs/API_DOCUMENTATION.md) for the full API reference.
