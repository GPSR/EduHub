# School Subscription App (MVP)

A multi-tenant school management SaaS MVP built with Next.js + Prisma.

## What’s included (MVP)

- School subscription onboarding (trial/basic plans)
- Email/password login
- Role-based access control (Admin/Principal/Class Teacher/Teacher/Parent)
- Student profile (student + parent + guardian)
- Fees (invoices + payments)
- Feed/announcements
- Attendance (daily)
- Homework + exam results (simple)
- Dashboard cards

## Setup

1. Install dependencies
   - `npm install`
2. Create `.env`
   - `cp .env.example .env`
   - Set `LOCAL_DATABASE_URL` for local development
   - Set `AUTH_SECRET` (minimum 32 chars random secret)
   - Optional hardening:
     - `AUTH_SECRET_SCHOOL` and `AUTH_SECRET_PLATFORM` for separate token keys
     - `SCHOOL_SESSION_TTL` and `PLATFORM_SESSION_TTL` (for example `12h`, `8h`)
     - `AUTH_TOKEN_ISSUER`, `AUTH_AUDIENCE_SCHOOL`, `AUTH_AUDIENCE_PLATFORM`
   - Platform bootstrap protection:
     - `PLATFORM_ONBOARD_SECRET` (minimum 16 chars; required in production)
3. Create the database
   - `npm run db:push`
4. Run the app
   - `npm run dev`

Open `http://localhost:3000`.

## Database strategy

- Local/lower environments:
  - Prisma uses `LOCAL_DATABASE_URL` (preferred) or `DATABASE_URL`
  - Run schema sync with `npm run db:push`
  - This uses `prisma db push` (no migration files needed for local iteration)
- Production:
  - Prisma uses `NEON_DATABASE_URL` (preferred) or `DATABASE_URL`
  - Run migrations with `npm run db:deploy`
  - This uses `prisma migrate deploy`

## Environment URLs

- Set `APP_ENV` to control default app URLs:
  - `stage` (legacy `int`, `integration`, and `stgae` are still accepted) -> `https://stgae.schools.softlanetech.com` and `https://stgae.platform.softlanetech.com`
  - `production` -> existing production domains
- You can still override with:
  - `SCHOOL_APP_BASE_URL`
  - `PLATFORM_APP_BASE_URL`

## Mobile (iOS .ipa / Android .apk)

This repo includes a Capacitor wrapper that loads the hosted web app at:

- `https://app.softlanetech.com/Schools`

Commands:

- Sync native projects after config/plugin changes: `npm run mobile:sync`
- Open iOS project in Xcode: `npm run mobile:open:ios`
- Open Android project in Android Studio: `npm run mobile:open:android`

Build outputs:

- iOS `.ipa`: build/archive in Xcode (requires an Apple Developer account + signing)
- Android `.apk`: build in Android Studio, or run a Gradle assemble task from `android/`

## One Codebase For All Channels

This project is designed so one web codebase powers:

- Desktop web
- Mobile browser view
- Android app (Capacitor)
- iOS app (Capacitor)

Use these commands after changes:

- Validate cross-platform compatibility: `npm run platform:compat`
- Sync native shells for both mobile apps: `npm run mobile:sync:all`
- Full release readiness (web + android + ios build/sync): `npm run platform:release-ready`

This keeps behavior aligned across all platforms before deploy.

## First run

- Go to `/onboard` to create a School + first Admin user.
- Then log in at `/login`.

## Platform Super Admin

- Go to `/platform/onboard` to create the first Super Admin (only works once).
- Then use `/platform/login`.
- Platform dashboard (`/platform`) shows all schools + subscription info.
