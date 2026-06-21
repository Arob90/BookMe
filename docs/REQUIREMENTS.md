# Project requirements checklist

This document confirms how BookMe meets the following requirements.

## Create API routes

**Yes.** The app uses **Next.js API routes** (Route Handlers) under `app/api/`:

- `app/api/auth/[...nextauth]/route.ts` – NextAuth (login, session)
- `app/api/appointments/[id]/route.ts` – **CRUD** for a single appointment (GET, PATCH, DELETE)
- `app/api/appointments/status/route.ts` – Update appointment status (POST)
- `app/api/public/appointments/route.ts` – List public appointments (GET)
- `app/api/public/book-appointment/route.ts` – Create appointment (POST)
- `app/api/public/create-client/route.ts` – Create client (POST)
- `app/api/public/services/route.ts`, `app/api/public/businesses/route.ts`, etc.
- `app/api/user/profile/route.ts`, `app/api/notifications/route.ts`, `app/api/upload/route.ts`, and others

All of these are HTTP API endpoints (e.g. `GET /api/appointments/123`, `PATCH /api/appointments/123`, `DELETE /api/appointments/123`).

## Use Node.js / Express backend

**Node.js: Yes.** The app runs on **Node.js** via the Next.js server (`next dev` / `next start`).

**Express: Not used.** The backend is the **Next.js server**, which provides API routes (Route Handlers) and server-side logic without Express. Functionally this is equivalent: a Node.js backend with REST-style endpoints, session handling, and server-only code. If you specifically need Express, you would add a separate Express server; for this stack, Next.js API routes are the standard approach.

## Connect securely to Neon using environment variables

**Yes.**

- **Neon** is used as the PostgreSQL host (see `DATABASE_URL` in `.env`).
- The connection string is stored in **environment variables** only:
  - `DATABASE_URL` is set in `.env` (and optionally in your hosting provider’s env).
  - Prisma reads it via `env("DATABASE_URL")` in `prisma/schema.prisma`.
  - `lib/db.ts` passes `process.env.DATABASE_URL` to the Prisma client.
- `.env` is in `.gitignore`; `.env.example` documents required variables **without** real credentials.
- Neon’s connection string uses `sslmode=require` for encrypted connections.

## Do not expose DB credentials in frontend

**Yes.**

- `DATABASE_URL` and all database access live in **server-only** code:
  - `lib/db.ts` (used only by API routes, Server Actions, and server components).
  - No `lib/db` or `DATABASE_URL` is imported or used in any client component or client bundle.
- Frontend code only calls **API routes** or **Server Actions**; it never sees the database URL or Prisma client.
- `.env` is not shipped to the client; Next.js exposes only `NEXT_PUBLIC_*` env vars to the browser, and we do not use those for DB or secrets.

## Implement authentication

**Yes.** Implemented with **NextAuth.js**:

- **Config:** `lib/auth.ts` (credentials provider, session strategy, callbacks).
- **Route:** `app/api/auth/[...nextauth]/route.ts` (GET/POST for NextAuth).
- **Login page:** `app/login/page.tsx` (credentials form).
- **Session:** Used in API routes via `getServerSession(authOptions)` and in Server Actions; protected dashboard and app routes require a signed-in user.
- **Secrets:** `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set in `.env` and never exposed to the frontend.

## Create CRUD endpoints

**Yes.** Create, Read, Update, and Delete are available as **API endpoints** and/or **Server Actions**:

| Resource    | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| Appointments | `POST /api/public/book-appointment`, Server Action `createAppointment` | `GET /api/appointments/[id]`, `GET /api/public/appointments` | `PATCH /api/appointments/[id]`, `POST /api/appointments/status`, Server Actions | `DELETE /api/appointments/[id]`, Server Action `deleteAppointment` |
| Clients     | `POST /api/public/create-client`, Server Action | Used in appointments and profile APIs | Server Actions | Server Action |
| Services    | Server Action | `GET /api/public/services`, `GET /api/services/categories` | Server Actions | Server Action |
| User/Profile| Signup Server Action | `GET /api/user/profile` | Server Actions | — |

Example **REST-style CRUD** for one appointment:

- **Create:** `POST /api/public/book-appointment` (body: client, service, time, etc.)
- **Read:** `GET /api/appointments/[id]` (authenticated)
- **Update:** `PATCH /api/appointments/[id]` (body: `status` or `startAt`/`endAt` for reschedule)
- **Delete:** `DELETE /api/appointments/[id]` (authenticated)

All of the above run on the **Node.js (Next.js) backend** and use **Neon via `DATABASE_URL`** with **authentication** where required; **DB credentials stay server-side only**.
