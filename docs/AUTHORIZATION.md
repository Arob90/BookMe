# Authorization (admin vs staff)

Beyond "is the user logged in," we enforce **who can perform which actions**.

## Roles

- **ADMIN** – Full access: business settings, loyalty/strike policies, all CRUD. Signups create ADMIN users.
- **STAFF** – Day-to-day operations: appointments, clients, services, dashboard, reports (view). Cannot edit business settings or strike/loyalty rules.

## Where it’s enforced

| Area | Who can do it | How |
|------|----------------|-----|
| **Settings** (business hours, currency, timezone, etc.) | ADMIN only for **update** | `updateSettings()` uses `requireAdmin()` from `lib/authz.ts`. STAFF can still view (getSettings). |
| **Policies** (loyalty points, strike rules) | Same as settings; stored in Settings | `updateSettings()` is ADMIN-only. |
| **Reports** | ADMIN + STAFF (view only) | Reports are scoped by `staffId: session.user.id` so each business sees only their data. |
| **Appointments, clients, services, inventory, loyalty (view/edit day-to-day)** | ADMIN + STAFF | All actions use session and tenant scope; no extra role check. |
| **Dashboard, calendar, analytics** | ADMIN + STAFF | Same as above. |

## Helpers (`lib/authz.ts`)

- `requireSession()` – Throws if not logged in. Returns session.
- `requireRole(['ADMIN'])` / `requireRole(['ADMIN','STAFF'])` – Throws if role not allowed.
- `requireAdmin()` – Throws if not ADMIN. Use for settings/policy updates.
- `requireStaffOrAdmin()` – Throws if not ADMIN or STAFF.
- `checkApiAuth(allowedRoles?)` – For API routes: returns `{ ok, session }` or `{ ok: false, status, body }`.

## Adding new protected actions

- **Admin-only:** Call `await requireAdmin()` at the start of the action (or use `checkApiAuth(['ADMIN'])` in an API route).
- **Staff or admin:** Call `await requireStaffOrAdmin()` or no role check if any logged-in user is allowed.

## Reports tenant fix

Reports actions (`getRevenueReport`, `getNoShowReport`, `getTopClients`, `getStrikeEventsReport`) now scope by `staffId: session.user.id` so each business only sees their own data.
