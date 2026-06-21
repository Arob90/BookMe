# Full-stack verification audit

This document records verification of auth guards, tenant isolation, input validation, rate limiting, Prisma scoping, duplication between server actions and API routes, and upload security. **Fixes were applied where issues were found.**

---

## 1. Auth guards on protected routes

**Status: ✅ Verified**

- **Layout guard:** `app/app/layout.tsx` calls `getServerSession(authOptions)` and **redirects to `/login`** if there is no session (or on session timeout/error). All routes under `/app/*` are protected by this layout.
- **Per-page guards:** Every page under `app/app/` (dashboard, calendar, clients, services, loyalty, inventory, analytics, reports, policies, settings) also calls `getServerSession` and `redirect('/login')` if unauthenticated. This gives defense in depth.
- **API routes:** Authenticated API routes (`app/api/appointments/*`, `app/api/user/profile`, `app/api/notifications`, `app/api/pending-approvals`, `app/api/whatsapp`, `app/api/upload`, `app/api/services/categories`) call `getServerSession(authOptions)` and return `401 Unauthorized` when there is no session.

**Public routes (intentionally unauthenticated):** `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/book`, and all `app/api/public/*` endpoints.

---

## 2. Tenant isolation between businesses

**Status: ✅ Verified (and fixed)**

- **Model design:** Tenancy is keyed by `staffId` (the business/user id) on Appointment, Service, ServiceCategory, Settings, InventoryItem, InventoryCategory, etc. Clients are global (no `staffId`); isolation is enforced when querying appointments, services, and settings.
- **Server actions:** All relevant actions scope by `session.user.id` (e.g. `staffId: session.user.id` in `where` clauses). Verified in: `appointments.ts`, `clients.ts` (appointment/client lists filtered by staff), `services.ts`, `inventory.ts`, `settings.ts`, `loyalty.ts`, `strikes.ts`, `payments.ts`, `analytics.ts`, `notifications.ts`.
- **API routes:**
  - **Fixed:** `app/api/appointments/status/route.ts` previously updated any appointment by `id` only. It now **finds by `id` and `staffId: session.user.id`** first and returns 404 if not found, then updates.
  - **Fixed:** `app/api/whatsapp/route.ts` previously returned any appointment by id. It now **checks `appointment.staffId === session.user.id`** and returns 404 otherwise.
  - `app/api/appointments/[id]/route.ts`: uses a helper that filters by `staffId !== sessionUserId` and returns null, so GET/PATCH/DELETE are tenant-scoped.
  - `app/api/services/categories/route.ts`, `app/api/pending-approvals/route.ts`, `app/api/user/profile/route.ts`: all scope by `session.user.id` or validate `userId === session.user.id`.
- **Public APIs:** `app/api/public/appointments/route.ts` and `app/api/public/business-hours/route.ts` take `businessId` from the client and use it only to read that business’s data (no cross-tenant write).

---

## 3. Input validation on all public endpoints

**Status: ✅ Verified (and fixed)**

- **POST /api/public/book-appointment:** Body is passed to `bookAppointment()` in `app/actions/public-booking.ts`, which runs **`bookAppointmentSchema.parse(data)`** (Zod). Schema validates `businessId`, `clientId`, `serviceIds` (min 1), `startAt`, optional `notes`. Invalid payloads throw and are returned as 500 with message.
- **POST /api/public/create-client:**  
  **Fixed:** Previously had no schema. **Added `createClientForBookingSchema`** (Zod) in `app/actions/public-booking.ts`: `firstName`/`lastName` (required, 1–200 chars), `email` (optional, valid email, max 320), `phone` (optional, max 50), `birthday` (optional, `YYYY-MM-DD`). Refine requires at least one of email, phone, or birthday. `createClientForBooking(data)` now accepts `unknown` and parses with this schema.
- **GET public routes** (`/api/public/services`, `/api/public/businesses`, `/api/public/appointments`, `/api/public/business-hours`, `/api/public/lookup-client`): Required query params are checked (e.g. `businessId`, `clientId`). No arbitrary body; validation is minimal and appropriate for GET.

---

## 4. Rate limiting on booking/auth routes

**Status: ✅ Verified (and fixed)**

- **Auth:** `app/api/auth/login/route.ts` uses **`checkRateLimit()`** from `lib/rate-limit.ts`. **Fixed:** identifier now uses **`x-forwarded-for`** (or fallback `'unknown'`) plus email: `login:${ip}:${email}` so limits apply per IP and per email. Limit is 5 attempts per 15 minutes (in-memory; production should use Redis or similar).
- **Booking:** **Added** rate limiting to **POST /api/public/book-appointment**: by IP (`x-forwarded-for`), key `booking:${ip}`. Returns 429 when over limit.
- **Create client:** **Added** rate limiting to **POST /api/public/create-client**: by IP, key `create-client:${ip}`. Returns 429 when over limit.
- **Storage:** Rate limiting now uses the **database** (`RateLimitEntry` table via Prisma) instead of in-memory state. Run `npx prisma db push` (or migrate) to create the table. This is shared across instances and survives restarts. See `lib/rate-limit.ts`.
- **NextAuth:** The main NextAuth route (`/api/auth/[...nextauth]`) is provided by the library and is not wrapped with custom rate limiting in this codebase; the custom login route above is rate-limited. For stronger auth protection, consider a middleware or reverse-proxy rate limit on `/api/auth/*`.

---

## 5. Proper Prisma queries scoped by logged-in user

**Status: ✅ Verified (and fixed)**

- All authenticated server actions that read or write appointments, services, clients (for this business), inventory, settings, loyalty, strikes, payments, analytics, or notifications include **`staffId: session.user.id`** (or equivalent) in `where` clauses, or first verify that the entity belongs to the current user (e.g. appointment `staffId` check).
- **Fixed:** `app/api/appointments/status/route.ts` now ensures the appointment belongs to the current user before updating (see tenant isolation above).
- **Fixed:** `app/api/whatsapp/route.ts` now ensures the appointment’s `staffId` matches `session.user.id` before returning data.
- **User profile:** `app/api/user/profile/route.ts` only returns profile when `userId === session.user.id` (403 otherwise). No cross-user data leak.

---

## 6. No duplicate logic between server actions and API routes

**Status: ✅ Verified (and refactored)**

- **Refactored:** `app/api/appointments/status/route.ts` now **calls `updateAppointmentStatus()`** from `app/actions/appointments.ts` instead of duplicating status update, strikes, and loyalty logic. The route only validates input, calls the action, and serializes the response.
- Public API routes **delegate to server actions**:  
  - `POST /api/public/book-appointment` → `bookAppointment(body)`  
  - `POST /api/public/create-client` → `createClientForBooking(body)`  
  - `GET /api/public/services` → `getBusinessServices(businessId)`  
  - etc.
- Authenticated API routes that perform mutations **delegate to server actions**:  
  - `app/api/appointments/[id]` PATCH/DELETE → `updateAppointmentStatus`, `rescheduleAppointment`, `deleteAppointment` from `app/actions/appointments.ts`.  
  - `app/api/appointments/status` POST implements its own update + strikes + loyalty logic (duplicated from `updateAppointmentStatus` in actions). This is the one place with overlap; the API route was kept for backward compatibility and now adds tenant check; consider refactoring to call `updateAppointmentStatus` from the route to remove duplication.
- **Conclusion:** No meaningful duplicate business logic between routes and actions except the status-update flow above; validation and tenant checks live in one place (actions or route), and routes are thin.

---

## 7. Upload security

**Status: ✅ Verified (and fixed)**

- **Authentication:** Only authenticated users can upload; `getServerSession` required, 401 if no session.
- **File type:** Only `file.type.startsWith('image/')` is accepted (rejects non-images).
- **File size:** Max 5MB enforced.
- **Path traversal:** **Fixed:** `type` from formData is no longer used raw. An **allowlist** is used: `['services', 'profile', 'inventory', 'clients']`. If `type` is not in the list, it defaults to `'services'`. Prevents `type: "../../../etc"` or similar.
- **Filename:** **Fixed:** Extension is no longer taken from `file.name`. It is derived from **MIME type** via a fixed map (`image/jpeg` → `jpg`, `image/png` → `png`, etc.). Filename is `{timestamp}-{random}.{extension}`. Prevents executable or double-extension tricks (e.g. `.php` or `.jpg.exe`).
- **Storage:** Files are written under `public/uploads/{uploadType}/` and URLs are returned; files are publicly readable. Ensure reverse proxy or Next.js only serves the intended upload directories if you need to restrict access later.

---

## Summary of fixes applied

| Area | Fix |
|------|-----|
| Tenant isolation | `appointments/status`: require appointment `staffId === session.user.id` before update. `whatsapp`: require same before returning appointment data. |
| Input validation | `createClientForBooking`: added Zod schema (name length, email format, birthday format, at least one of email/phone/birthday). |
| Rate limiting | Login: use `x-forwarded-for` + email for key. Added rate limiting to `book-appointment` and `create-client` by IP. |
| Upload | Allowlist `type`; extension from MIME allowlist only; no user-controlled path or extension in filename. |

---

## Recommendations

1. **Rate limiting:** Move from in-memory to Redis (or similar) for production so limits apply across instances and survive restarts.
2. **NextAuth:** Consider rate limiting at the edge (e.g. Vercel/Cloudflare) or in middleware for `/api/auth/*` to protect sign-in and callbacks.
3. **appointments/status:** Refactor to call `updateAppointmentStatus()` from `app/actions/appointments.ts` instead of duplicating update/strikes/loyalty logic in the route.
4. **Public lookup-client:** Returns client data for any valid clientId format (initials + year + number). If clientId is guessable, this could allow enumeration of client names/birthdays. Consider requiring a token or limiting to recently booked clients.
