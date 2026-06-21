# BookMe — Deployment Guide (Vercel + bookme.bz)

The project now lives at `C:\dev\BookMe` (moved out of OneDrive so Next.js builds are stable),
is a git repo with an initial commit, and the production build passes.

Follow these steps to get it live on **https://bookme.bz**.

---

## 1. Push to GitHub

```bash
cd /c/dev/BookMe
gh repo create bookme --private --source=. --remote=origin --push
# (or, without the gh CLI:)
# git remote add origin https://github.com/<you>/bookme.git
# git push -u origin main
```

## 2. Import into Vercel

1. Go to https://vercel.com/new and import the **bookme** repo.
2. Framework preset: **Next.js** (auto-detected). Leave build settings default.
3. Before the first deploy, add the **Environment Variables** below.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | *(your Neon connection string)* | Same one in your local `.env` |
| `NEXTAUTH_SECRET` | *(the 64-char secret from `.env`)* | Keep it secret; do not reuse the old weak one |
| `NEXTAUTH_URL` | `https://bookme.bz` | Must match the live domain |
| `RESEND_API_KEY` | `re_...` | From https://resend.com (free tier) — needed for password-reset emails |
| `EMAIL_FROM` | `BookMeBz <no-reply@bookme.bz>` | Must be a verified Resend sender/domain |

Set all of them for the **Production** environment (and Preview if you want PR previews to work).

## 4. Deploy

Click **Deploy**. Vercel runs `npm install` (which runs `prisma generate`) and `next build`.
Your Neon database already has the schema, so no migration step is required for the first deploy.
(If you later change `prisma/schema.prisma`, run `npx prisma migrate deploy` against Neon.)

## 5. Attach the domain bookme.bz (DNS is on GoDaddy)

Keep GoDaddy as the DNS host — you only add two records there. Do NOT change nameservers.

1. In Vercel → Project → **Settings → Domains**, add `bookme.bz` and `www.bookme.bz`.
   Vercel will show the exact records it wants — use those if they differ from below.
2. In **GoDaddy → My Products → bookme.bz → DNS → Manage DNS**:
   - **Apex / root** — add or edit an **A** record:
     - Type `A`, Name `@`, Value `76.76.21.21`, TTL `1 Hour`
     - Delete GoDaddy's default "Parked" A record if present.
   - **www** — add or edit a **CNAME** record:
     - Type `CNAME`, Name `www`, Value `cname.vercel-dns.com`, TTL `1 Hour`
   - Turn **OFF** any GoDaddy **Domain Forwarding** on bookme.bz (it conflicts with the A record).
3. Back in Vercel, the domains flip to **Valid / SSL** once DNS propagates (usually minutes,
   up to a couple of hours). SSL is issued automatically.
4. Set `bookme.bz` as the **primary** domain so `www.bookme.bz` redirects to it.

> GoDaddy note: the apex must be an **A record** (GoDaddy can't CNAME the root) — that's why
> Vercel gives an IP for `@` and a CNAME only for `www`.

## 6. Set up Resend (so password reset works)

1. Create a free account at https://resend.com.
2. **Domains → Add Domain → bookme.bz**. Resend shows ~3 records (SPF TXT, DKIM CNAME/TXT,
   and an optional DMARC TXT). Add each one in **GoDaddy → Manage DNS** exactly as shown,
   then click **Verify** in Resend. These are separate from the Vercel records above and don't conflict.
3. Create an **API key** and put it in Vercel as `RESEND_API_KEY`.
4. Set `EMAIL_FROM` to an address on the verified domain, e.g. `no-reply@bookme.bz`.

Until Resend is configured, password-reset links are written to the server logs instead of emailed.

## 7. Before going live — clean up the test admin

A temporary QA admin (`testadmin@bookme.bz`) was created so the UI could be verified.
Remove it once you're done:

```bash
cd /c/dev/BookMe
npx tsx scripts/delete-test-admin.ts
```

## 8. New-business signup flow (how it works today)

Public signups create a **pending account request** that a super-admin approves inside the app
(Account Management). New businesses don't get instant access — that's by design. If you want
self-serve instant activation instead, that's a small change to `app/actions/auth.ts`.

---

### Local development going forward

```bash
cd /c/dev/BookMe
npm run dev      # http://localhost:3009
```

Keep working in `C:\dev\BookMe`, **not** the old OneDrive folder — OneDrive locks the `.next`
cache and breaks dev builds.
