# Deploy KS on Render

## Easiest setup: a backend-only repository

1. Create a GitHub repository for the backend. Put the contents of this `backend` folder at the repository root, including `app/`, `requirements.txt`, `.python-version`, `.gitignore`, and `render.yaml`. Exclude `.env` and `venv/`.
2. In Render, choose **New > Blueprint** and connect that repository. Render reads `render.yaml` and fills in the build command, start command, Python version, and health check.
3. When prompted for `MONGODB_URI`, enter your MongoDB Atlas connection string in Render. Keep the database name `ks_finance` to use your existing data.
4. In your Render service's **Connect > Outbound** section, copy its outbound IP ranges into Atlas **Network Access**. Ensure the database user has read/write access to `ks_finance`.
5. Deploy (or redeploy after configuring Atlas). Open `https://YOUR-SERVICE.onrender.com/health` and confirm a 200 response with `"status":"ok"`. API documentation is at `/docs`.

Do not commit your database password or paste it into the frontend. Render supplies `PORT` automatically.

## Manual Web Service setup (also works with the whole project)

Choose **New > Web Service**, connect your repository, and enter:

| Setting | Value |
| --- | --- |
| Runtime | Python 3 |
| Root Directory | Leave blank for a backend-only repository; use `backend` for the whole project |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| Instance Type | Free for initial testing |

Add these environment variables:

| Key | Value |
| --- | --- |
| `PYTHON_VERSION` | `3.12.8` |
| `MONGODB_URI` | Your Atlas connection string |
| `DATABASE_NAME` | `ks_finance` (or your existing configured database name) |
| `CORS_ORIGINS` | `*` for initial testing; for a web frontend, use its exact origin |

The included blueprint assumes a backend-only repository. For a whole-project repository, use the manual settings above.

## Connect the mobile app

Create or update `frontend/.env` locally:

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com
```

Restart Expo with `npx.cmd expo start --clear` from `frontend` on Windows. Rebuild an installed native app to include the new API URL. The URL should not include `/api` because the client adds route paths itself.

## Deployment behavior

- Free Render services sleep after 15 minutes without incoming traffic and can take about a minute to wake. The app currently has a 15-second request timeout, so retry after the service wakes, or choose an always-on paid instance for regular use.
- This API currently has no authentication. Anyone who knows the public URL can read, add, edit, or delete records. CORS does not provide access control. Add authentication before using the public service for private data.
- If startup fails with a MongoDB connection error, check the Atlas credentials, outbound IP allowlist, and cluster status. URL-encode special characters in the password when inserting it into a connection string.

Sources: [Render FastAPI deployment](https://render.com/docs/deploy-fastapi), [Blueprint reference](https://render.com/docs/blueprint-spec), [Python versions](https://render.com/docs/python-version), [outbound IP ranges](https://render.com/docs/outbound-ip-addresses), [free service behavior](https://render.com/docs/free).
