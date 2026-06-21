# Public booking – data exposure audit

Public endpoints must only return what is needed for the public booking flow: no internal fields, no excessive business data, and no easy enumeration beyond the intended flow.

## Endpoints audited

### GET /api/public/businesses

- **Source:** `getPublicBusinesses()` → returns list of businesses (users with role ADMIN/STAFF).
- **Response shape:** `{ id, name, email, phone, district }` only. No `passwordHash`, `role`, `createdAt`, or internal IDs beyond business `id`.
- **Enumeration:** Intentionally lists all bookable businesses so the client can pick one. Acceptable for “pick a business” step.

### GET /api/public/services?businessId=…

- **Source:** `getBusinessServices(businessId)`.
- **Change:** Response now returns a **public-only shape**: `id`, `name`, `description`, `imageUrl`, `durationMinutes`, `price`, `pointsWorth`, `category: { id, name }`. No `staffId`, `categoryId`, `isArchived`, `isActive`, or other internal fields.
- **Enumeration:** Caller must supply a valid `businessId`; returns only that business’s services. No way to list all services across all businesses in one call.

### GET /api/public/appointments?businessId=…&date=…

- **Response:** `{ appointments: [ { id, startAt, endAt, status } ] }`. Minimal slot data for the calendar. No client data, no payment data, no notes.
- **Enumeration:** Requires `businessId` and `date`. Returns only that business’s appointments for that day. No pagination or global list.

### GET /api/public/business-hours?businessId=…

- **Response:** Business hours and days for the given business. No other settings (currency, loyalty rules, etc.).
- **Enumeration:** Requires `businessId`. One business per request.

### GET /api/public/lookup-client?clientId=…&businessId=…

- **Response (updated):** Only `{ client: { id, firstName, lastName, birthday, clientId } }`. No `notes`, `tags`, `email`, `phone` in the response.
- **Enumeration risk:** The clientId format (e.g. `AR-1990-1`) is guessable (initials + year + index). Someone could try many values and infer the existence of clients. Mitigations: (1) return minimal fields (done); (2) consider requiring a one-time token or limiting to recently booked clients; (3) rate limiting (already in place for create-client, could add for lookup if needed).

### POST /api/public/book-appointment

- **Body:** Validated by Zod in `bookAppointment()`: `businessId`, `clientId`, `serviceIds`, `startAt`, `notes` (optional).
- **Response (updated):** Public-facing confirmation only: `id`, `startAt`, `endAt`, `status`, `totalPrice`, `client: { id, firstName, lastName }`, `appointmentServices` (id, priceAtTime, durationAtTime, service name/price). No client email/phone/notes, no internal metadata.

### POST /api/public/create-client

- **Body:** Validated by Zod: `firstName`, `lastName`, optional `email`/`phone`/`birthday`, with “at least one of email/phone/birthday” required.
- **Response:** Client record plus generated `clientId`. Front end typically only needs the clientId for the booking flow; ensure no sensitive fields are added to this response in future.

## Summary

- **No hidden/internal fields** in public responses: business list, services, appointments, business-hours, lookup-client, and book-appointment all return only the fields listed above.
- **No excessive business data:** Services and business-hours are scoped to one business per request; no global dumps.
- **Enumeration:** Listing businesses and (with businessId) their services/appointments is by design. The only remaining enumeration concern is client lookup by guessable clientId; mitigation is minimal fields and optional future token or rate limit.
