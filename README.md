# KS Finance

A simple, attractive mobile app for managing a group's monthly money contributions — no login, no signup, no passwords. Add people, track who's paid/pending/partial each month, view dashboards, and export/share Excel and PDF reports.

## Overview

KS Finance is built for someone tracking monthly contributions from a group of people (chit funds, clubs, shared expenses, etc.). It has two independent parts:

- **`backend/`** — FastAPI REST API backed by MongoDB Atlas.
- **`frontend/`** — React Native (Expo) mobile app, buildable to an Android APK.

## Features

- Add, edit, delete, and search people
- Track monthly payments per person with `paid` / `pending` / `partial` status (auto-computed, manually overridable)
- Month/year navigation across the whole app
- Dashboard with totals, collection percentage, and a progress bar
- Person detail page with full contribution history
- Monthly finance view — every person's expected/paid/status for a given month
- Financial reports with Excel and PDF export, shareable from the device
- Empty states, confirmation dialogs before deletes, friendly error messages, pull-to-refresh
- No authentication of any kind

## Technology Stack

| Layer | Tech |
|---|---|
| Frontend | React Native, Expo, TypeScript, React Navigation, React Native Paper, Axios |
| Backend | Python, FastAPI, Pydantic, Motor (async MongoDB) |
| Database | MongoDB Atlas |
| Reports | openpyxl (Excel), reportlab (PDF) |
| Deployment | Render (backend), EAS Build (Android APK) |

## Folder Structure

```
KS-Finance/
├── frontend/     React Native / Expo app (see frontend/README.md)
├── backend/      FastAPI service (see backend/README.md)
└── docs/         API, database, and deployment documentation
```

## Quick Start

### 1. MongoDB Atlas
Create a free cluster and grab your connection string — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#1-mongodb-atlas).

### 2. Backend
```bash
cd backend
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env   # fill in MONGODB_URI
uvicorn app.main:app --reload --port 8000
```
API docs at http://localhost:8000/docs.

### 3. Frontend
```bash
cd frontend
npm install
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env
npm start
```

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Database Design](docs/DATABASE_DESIGN.md)
- [Deployment Guide](docs/DEPLOYMENT.md) (Render + Android APK via EAS)

## Environment Variables

**Backend** (`backend/.env`):
```
MONGODB_URI=your_mongodb_atlas_connection_string
DATABASE_NAME=ks_finance
PORT=8000
CORS_ORIGINS=*
```

**Frontend** (`frontend/.env`):
```
EXPO_PUBLIC_API_URL=http://localhost:8000
```

Neither `.env` file is committed to git.

## Screenshots

_Add screenshots of the Dashboard, People, Monthly, and Reports screens here._

## License

Private project — not licensed for redistribution.
