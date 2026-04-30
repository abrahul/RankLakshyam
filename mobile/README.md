# RankLakshyam Mobile App

Expo React Native mobile app for the RankLakshyam Kerala PSC exam preparation platform.

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Android Studio (for emulator) or Expo Go app on your phone

## Setup

```bash
cd mobile
npm install
```

### Configure Google OAuth

1. Open `src/utils/config.ts`
2. Replace `GOOGLE_WEB_CLIENT_ID` with your actual Google OAuth **web** client ID
3. In `app.json`, update the iOS `CFBundleURLSchemes` with your iOS client ID

### Configure API URL

By default it points to `https://rank-lakshyam.vercel.app`. For local development:

```ts
// src/utils/config.ts
export const API_BASE_URL = "http://YOUR_LOCAL_IP:3000";
```

## Run

```bash
# Start Expo dev server
npx expo start

# Android
npx expo start --android

# iOS
npx expo start --ios
```

## Build (EAS)

```bash
# Login to EAS
eas login

# Build Android APK (preview)
eas build -p android --profile preview

# Build production
eas build -p android --profile production
```

## Architecture

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root: QueryClient + AuthProvider
│   ├── index.tsx           # Entry: redirect based on auth
│   ├── login.tsx           # Google login screen
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── home.tsx        # Dashboard
│   │   ├── practice.tsx    # Category/topic browser
│   │   ├── challenge.tsx   # Daily challenge
│   │   ├── review.tsx      # Review hub
│   │   └── profile.tsx     # Profile/stats
│   ├── practice/
│   │   ├── [topicId].tsx   # Question practice session
│   │   └── pyq.tsx         # PYQ exam browser
│   └── review/
│       ├── wrong.tsx       # Wrong answers
│       ├── unattempted.tsx # Skipped questions
│       └── weak-areas.tsx  # Weak topics
└── src/
    ├── api/
    │   ├── client.ts       # Central fetch client with Bearer auth
    │   └── services.ts     # All API endpoints
    ├── auth/
    │   ├── auth-provider.tsx  # React context for auth state
    │   ├── google-auth.ts     # expo-auth-session Google hook
    │   └── session-storage.ts # expo-secure-store persistence
    ├── components/
    │   ├── ui/             # Button, Card, Loading, ProgressBar
    │   ├── question/       # OptionButton, ExplanationPanel
    │   └── layout/         # SafeScreen
    ├── constants/          # colors, queryKeys
    └── types/              # TypeScript interfaces
```

## Auth Flow

1. User taps "Continue with Google" → `expo-auth-session` opens Google login
2. Google returns an `idToken`
3. App sends `idToken` to `POST /api/auth/mobile`
4. Backend verifies with Google, upserts user, returns signed JWT
5. JWT stored in `expo-secure-store`
6. All API calls include `Authorization: Bearer <jwt>`
7. Backend `auth()` checks Bearer token before NextAuth cookies

## Backend Changes Required

A new endpoint was added at `src/app/api/auth/mobile/route.ts` and the `auth()` function in `src/lib/auth.ts` was enhanced to support Bearer token authentication alongside existing cookie sessions.

Install the `jsonwebtoken` dependency in the backend:
```bash
npm install jsonwebtoken @types/jsonwebtoken
```
