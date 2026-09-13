# KS Deployment Guide

For the simplest backend deployment, follow [the Render quick start](../backend/RENDER.md). It includes a ready-to-use blueprint for a backend-only repository and manual settings for this full project.

## 1. MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com.
2. Create a database user (username/password).
3. Under Atlas Network Access, add your Render service's outbound IP ranges, available from **Connect > Outbound**. See [Render outbound IP documentation](https://render.com/docs/outbound-ip-addresses).
4. Copy the connection string, e.g.:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. The database (`ks_finance`) and its collections/indexes are created automatically on first backend startup.

## 2. Backend on Render

1. Push this repository to GitHub.
2. In Render, create a new **Web Service**, connect the repo, and set the root directory to `backend`.
3. Build command:
   ```
   pip install -r requirements.txt
   ```
4. Start command:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Environment variables (Render dashboard → Environment):
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | your Atlas connection string |
   | `PYTHON_VERSION` | `3.12.8` |
   | `DATABASE_NAME` | `ks_finance` |
   | `CORS_ORIGINS` | `*` (or your app's origin) |
6. Deploy. Verify:
   - `https://<your-service>.onrender.com/health` → `{"status":"ok",...}`
   - `https://<your-service>.onrender.com/docs` → Swagger UI

## 3. Frontend configuration

Point the mobile app at your deployed backend by setting an environment variable before building:

```bash
EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com npx expo start
```

Or create `frontend/.env`:
```
EXPO_PUBLIC_API_URL=https://<your-service>.onrender.com
```

Never hardcode `localhost` into a production build — always use `EXPO_PUBLIC_API_URL`.

## 4. Android APK build (EAS Build)

1. Install the EAS CLI and log in:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. From the `frontend/` directory, configure the project (creates `eas.json`):
   ```bash
   eas build:configure
   ```
3. Build an APK (not an AAB) for direct install/testing:
   ```bash
   eas build --platform android --profile preview
   ```
   Add this `preview` profile to `eas.json` if not already present:
   ```json
   {
     "build": {
       "preview": {
         "android": { "buildType": "apk" },
         "env": { "EXPO_PUBLIC_API_URL": "https://<your-service>.onrender.com" }
       }
     }
   }
   ```
4. Once the build finishes, EAS gives you a download link for the `.apk`. Install it on an Android device (enable "Install unknown apps" if prompted).

### Local build alternative (no EAS account)

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
The APK is generated at `android/app/build/outputs/apk/release/app-release.apk`.

## 5. Post-deployment checklist

- [ ] Backend `/health` returns 200 from the public URL
- [ ] Swagger docs load at `/docs`
- [ ] Mobile app's `EXPO_PUBLIC_API_URL` points at the deployed backend, not localhost
- [ ] CORS on the backend allows the app's requests
- [ ] MongoDB Atlas network access allows Render's connections
