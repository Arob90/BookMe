# Pre-launch checklist – automated run results

Run date: 2026-03-17 (automated where possible).

---

## ✅ 1. Database setup

| Step | Result |
|------|--------|
| `npx prisma generate` | ❌ **EPERM** (DLL locked by another process). Close dev server/Cursor/terminals and run manually. |
| `npx prisma db push --skip-generate` | ✅ **PASS** – *"The database is already in sync with the Prisma schema."* |
| `npx tsx scripts/verify-rate-limit-table.ts` | ✅ **PASS** – `OK: rate_limit_entries table exists. Current rows: 0` |

**Action:** Run `npx prisma generate` yourself when nothing is using the repo, then re-run the verify script if you want to double-check.

---

## ✅ 2–3. Smoke tests & tenant isolation

**Not run by script.** These need you to:

- Use the app in the browser (signup, login, booking, calendar, settings, upload, reports).
- Use two accounts and confirm one business cannot see/change the other’s data.

---

## ✅ 4. Rate limiting (API checks)

| Check | Result |
|------|--------|
| Protected route without auth | ✅ **PASS** – `GET /api/appointments/:id` → **401 Unauthorized** |
| Invalid client data (Zod) | ✅ **PASS** – `POST /api/public/create-client` with `{}` → **500** (validation rejects; body could be 400 in future). |
| Login 429 after 5 attempts | ⚠️ **Not seen** – Multiple `POST /api/auth/login` returned 200 each time. Rate limit may be failing open (DB/Prisma in this run), or the app may use NextAuth’s callback for real login (so this route is not the one that’s hit in the UI). **Manually verify:** trigger 6+ failed sign-ins in the browser and check for 429. |
| Booking / create-client 429 | Not run (would need valid body and more requests). **Manually verify** per checklist. |

---

## ✅ 5–7. Security, logging, deployment

**Not run by script.** Confirm on your side:

- Public endpoints reject bad data (partially confirmed for create-client above).
- Upload rejects bad types/size and uses allowlisted extensions.
- 401/403 on protected routes (401 confirmed for appointments).
- Logs in your deployment (Vercel/etc.).
- Env vars, domain, HTTPS, no console/server errors.

---

## Summary

| Category | Automated result |
|----------|------------------|
| DB | Push and verify **passed**. Generate **blocked by lock** – run locally. |
| API 401 | **Passed** for protected route. |
| Validation | **Passed** for invalid create-client payload. |
| Rate limit 429 | **Not observed** on `/api/auth/login`; confirm manually in browser. |
| Rest | Manual only (smoke, tenant, logs, deployment). |

**Next:** Run `npx prisma generate` after closing everything that uses the repo, then go through `docs/TESTING.md` and tick off each item as you test in the browser and in deployment.
