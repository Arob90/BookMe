# Logging and error monitoring

Structured logging is in place for production debugging and monitoring.

## Where we log

| Event | Category | Where |
|-------|----------|--------|
| **Auth failure** | `auth` | `lib/auth.ts` (user not found, invalid password, DB error); `app/api/auth/login/route.ts` (rate limited). |
| **Booking failure** | `booking` | `app/api/public/book-appointment/route.ts` (any thrown error). |
| **Create client failure** | `booking` | `app/api/public/create-client/route.ts` (validation or DB error). |
| **Upload failure** | `upload` | `app/api/upload/route.ts` (no file, invalid type, too large, write error). |
| **Suspicious request** | `api` | `app/api/auth/login/route.ts` (invalid JSON body). |
| **Generic errors** | (category optional) | `lib/logger.logError()` for any catch block. |

## Format

All logs are **JSON** (one object per line) with:

- `timestamp` (ISO)
- `level`: `info` | `warn` | `error`
- `message`
- `category` (when set): `auth` | `booking` | `upload` | `api` | `authz`
- `error` / `stack` when logging an exception
- Extra keys (e.g. `email`, `ip`, `reason`, `userId`)

Example:

```json
{"timestamp":"2025-03-17T22:00:00.000Z","level":"warn","message":"Auth failure","category":"auth","reason":"invalid_password","email":"user@example.com"}
```

## Using the logger

```ts
import { logAuthFailure, logBookingFailure, logUploadFailure, logSuspiciousRequest, logError } from '@/lib/logger'

logAuthFailure({ reason: 'invalid_password', email })
logBookingFailure({ reason: 'slot_unavailable', ip, error: err.message })
logUploadFailure({ reason: 'invalid_type', userId, type: file.type })
logSuspiciousRequest({ reason: 'unauthorized', path: '/api/...', status: 401 })
logError({ message: 'Unexpected error', error: err, category: 'api' })
```

## Production

- **Stdout/stderr:** Use the JSON output with your host’s log aggregation (e.g. Vercel, Datadog, CloudWatch). Search by `category`, `level`, or `message`.
- **Error tracking:** To send errors to Sentry/LogRocket, add a call in `lib/logger.ts` (e.g. when `level === 'error'`) to your SDK’s `captureException` or equivalent.
