# KS — Frontend

React Native + Expo (TypeScript) mobile app for KS. No login/signup — built for a single trusted group managing monthly contributions.

## Stack

- Expo SDK 57, React Native, TypeScript
- React Navigation (bottom tabs + native stack)
- React Native Paper (UI components)
- Axios
- expo-file-system + expo-sharing (report download/share)

## Setup

```bash
npm install
```

Configure the API URL (defaults to `http://localhost:8000` for local dev):

```bash
# frontend/.env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

On a physical device, `localhost` won't reach your computer — use your machine's LAN IP instead, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.10:8000`.

## Run

Deploy the updated backend before rebuilding the APK to enable server-side pagination and the single-request dashboard. `EXPO_PUBLIC_API_URL` is embedded at build time; the code falls back to the hosted Render URL in `src/constants/config.ts` when unset.

Checks: `node --test tests/api.test.cjs` and `node node_modules/typescript/bin/tsc --noEmit`.

```bash
npm start
```

Then press `a` for Android, `i` for iOS (macOS only), or `w` for web, or scan the QR code with Expo Go.

## Build an Android APK

See [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for full instructions. Quick version with EAS:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

## Project layout

```
src/
  screens/       Dashboard, People, AddPerson, PersonDetails, MonthlyFinance, AddMoney, Reports
  components/    BrandLogo, ScreenFrame, SummaryCard, PersonCard, EmptyState, ConfirmDialog
  navigation/    Root stack + bottom tab navigators
  services/      api.ts — Axios client and all backend calls
  hooks/         useMonthYear, useReducedMotion
  theme/         Colors, spacing, react-native-paper theme
  types/         Shared TypeScript types
  constants/     App constants + API base URL config
```

## Appearance

The app uses a champagne light theme with dark burgundy accents, four tabs, safe-area-aware layouts, and reduced-motion-aware transitions. Edit `src/theme/colors.ts` to adjust the palette. `assets/KS.jpeg` supplies the in-app logo; `assets/ks-icon.png` is its PNG icon version. Rebuild the native app after changing launcher icons.
