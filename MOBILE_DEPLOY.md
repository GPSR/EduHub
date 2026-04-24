# EduHub Mobile Deployment Guide

## Prerequisites
- macOS for iOS builds
- Xcode 15+ for iOS
- Android Studio for Android
- Node.js 18+

---

## 1. Environment setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET
```

---

## 2. Build for production

```bash
# Build Next.js and sync to Capacitor
npm run mobile:build
```

This runs `next build && cap sync`.

Important: this app uses a live backend (Prisma + Server Actions), so native apps
must load your hosted web URL (default: `https://schools.softlanetech.com`).
The URL is configured in `capacitor.config.ts` via:

- `CAPACITOR_PROD_URL` (preferred override)
- fallback to `SCHOOL_APP_BASE_URL` / `NEXT_PUBLIC_SCHOOL_APP_BASE_URL`

---

## 3. iOS

```bash
# Open in Xcode
npm run mobile:open:ios
# or: cap open ios
```

In Xcode:
- Set your **Team** in Signing & Capabilities
- Set **Bundle Identifier**: `com.softlanetech.eduhub`
- Run on device or simulator

**For production builds:**
- Archive → Distribute → App Store Connect

---

## 4. Android

```bash
# Open in Android Studio
npm run mobile:open:android
# or: cap open android
```

In Android Studio:
- Sync Gradle
- Run on device or emulator
- App package id: `com.softlanetech.schools`

**For production builds:**
- Build → Generate Signed Bundle/APK

---

## 5. PWA (Web install)

The app is PWA-ready. Users can install it from:
- **iOS Safari**: Share → Add to Home Screen
- **Android Chrome**: Menu → Install App (or banner prompt)
- **Desktop Chrome/Edge**: Install icon in address bar

---

## 6. Development with live reload

Set your local dev URL:

```typescript
CAPACITOR_SERVER_URL=http://YOUR_LOCAL_IP:3000
```

Then run:
```bash
npm run dev        # Start Next.js
cap sync           # Sync to native
cap open ios       # Open Xcode with live reload
```

---

## Key native features implemented

| Feature | Web/PWA | iOS | Android |
|---------|---------|-----|---------|
| Safe area insets | ✅ CSS env() | ✅ | ✅ |
| Status bar overlay | ✅ | ✅ SplashScreen | ✅ |
| Haptic feedback | ❌ | ✅ | ✅ |
| Network banner | ✅ | ✅ | ✅ |
| Pull to refresh | ✅ | ✅ | ✅ |
| Install prompt | ✅ | ✅ (manual) | ✅ (auto) |
| Offline page | ✅ SW | ✅ | ✅ |
| Back button | N/A | N/A | ✅ |
| Keyboard resize | N/A | ✅ | ✅ |
| 16px input (no zoom) | ✅ | ✅ | ✅ |
