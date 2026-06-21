# 🚀 BookMe – Pre-Launch Checklist

Follow it **in order**. **Tick each box as you complete it** (in the browser or deployment).

*Items marked [x] were verified (by automated run or by you). Unticked items need manual verification in the browser or deployment.*

---

## ✅ 1. Database Setup (MUST PASS FIRST)

* [ ] **Stop** dev server, all terminals in this repo, Cursor tasks, Prisma Studio (so nothing locks the Prisma DLL)

* [x] Run:

  ```bash
  npx prisma generate
  ```
  ✓ (succeeded after stopping dev server)

* [x] Run:

  ```bash
  npx prisma db push
  ```

  → Expect: *"Your database is now in sync…"* ✓

* [x] Run:

  ```bash
  npx tsx scripts/verify-rate-limit-table.ts
  ```

  → Expect: `OK: rate_limit_entries table exists. Current rows: 0` ✓

---

## ✅ 2. Smoke Tests (Core App Works)

### Auth

* [ ] Signup disabled (page shows “Account creation disabled”, no new accounts)
* [ ] Login works
* [ ] Invalid login shows error
* [ ] Forgot password sends/reset works

### Booking (Public)

* [ ] Can select business
* [ ] Can select services
* [ ] Can pick time slot
* [ ] Can create client
* [ ] Booking completes successfully

### App (Logged In)

* [ ] Dashboard loads
* [ ] Calendar shows appointments
* [ ] Create/edit appointment works
* [ ] Change appointment status works
* [ ] Clients list loads
* [ ] Services load

### Admin / Settings

* [ ] ADMIN can update settings
* [ ] STAFF cannot update settings (should fail)

### Other

* [ ] Upload works (image/file)
* [ ] Reports load

---

## ✅ 3. Tenant Isolation (CRITICAL)

Create **2 separate businesses/accounts**

* [ ] Business A cannot see Business B appointments
* [ ] Business A cannot update Business B appointments
* [ ] Reports are isolated per business
* [ ] Settings are isolated per business
* [ ] Public booking only affects selected business

---

## ✅ 4. Rate Limiting

### Login

* [ ] After ~5 attempts → 429 error
* [ ] Uses IP + email correctly

### Public Booking

* [ ] Spam booking → 429 triggered

### Create Client

* [ ] Spam requests → 429 triggered

### Reset Window

* [ ] After ~15 minutes → requests allowed again

---

## ✅ 5. Security & Validation

* [x] Public endpoints reject invalid data (Zod working) ✓
* [x] Cannot submit empty/invalid client data ✓
* [ ] Upload rejects invalid file types
* [ ] Upload does not allow custom file names/extensions
* [x] API routes return 401 when not authenticated ✓
* [ ] API routes return 403 when role not allowed

---

## ✅ 6. Logging (IMPORTANT)

* [ ] Logs visible in deployment (e.g. Vercel logs)
* [ ] Failed login is logged
* [ ] Successful login is logged
* [ ] Booking errors are logged
* [ ] Upload errors are logged
* [ ] Suspicious requests are logged
* [ ] Logs are JSON (structured, readable)

---

## ✅ 7. Final Deployment Check

* [ ] Environment variables set:

  * DATABASE_URL
  * NEXTAUTH_SECRET
  * NEXTAUTH_URL
  * any API keys (WhatsApp, etc.)

* [ ] Domain connected (GoDaddy → hosting)

* [ ] HTTPS working

* [ ] No console errors in browser

* [ ] No server errors in logs

---

## 🧠 Final Gate (Don’t Skip This)

Only go live if:

* [ ] All sections above pass
* [ ] No critical errors in logs
* [ ] No cross-tenant data access
* [ ] Booking flow works end-to-end

---

## 👍 Straight truth

**If you pass this checklist:**  
👉 You’re good to launch.

**If anything fails:**  
👉 Fix it before users touch it.
