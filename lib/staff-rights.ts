/**
 * Per-staff rights. Business owners (ADMIN) and the super-admin always have all
 * rights; STAFF are limited to what the owner grants. Client-safe (no server imports).
 */
export const RIGHT_KEYS = ['calendar', 'clients', 'services', 'payments'] as const
export type RightKey = (typeof RIGHT_KEYS)[number]
export type StaffRights = Record<RightKey, boolean>

export const RIGHT_LABELS: Record<RightKey, string> = {
  calendar: 'Calendar & Appointments',
  clients: 'Clients',
  services: 'Services & Inventory',
  payments: 'Payments & Analytics',
}

export const RIGHT_DESCRIPTIONS: Record<RightKey, string> = {
  calendar: 'Calendar, bookings, projects',
  clients: 'Client list, loyalty & strikes',
  services: 'Service catalog & inventory',
  payments: 'Revenue, reports & analytics',
}

export const ALL_RIGHTS: StaffRights = { calendar: true, clients: true, services: true, payments: true }
/** New staff start with day-to-day access; payments/analytics is off by default. */
export const DEFAULT_STAFF_RIGHTS: StaffRights = { calendar: true, clients: true, services: true, payments: false }

export function normalizeRights(raw: unknown): StaffRights {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<RightKey, unknown>>
  return {
    calendar: r.calendar !== false,
    clients: r.clients !== false,
    services: r.services !== false,
    payments: r.payments !== false,
  }
}

/** Effective rights for a session user. */
export function effectiveRights(opts: { role?: string | null; isSuperAdmin?: boolean; staffRights?: unknown }): StaffRights {
  if (opts.isSuperAdmin || opts.role === 'ADMIN') return { ...ALL_RIGHTS }
  // STAFF: null = full access (back-compat); otherwise normalize the stored object.
  if (opts.staffRights == null) return { ...ALL_RIGHTS }
  return normalizeRights(opts.staffRights)
}

/** Which right (if any) a nav path requires. Dashboard + unmatched paths are always allowed. */
export function rightForPath(path: string): RightKey | null {
  if (path.startsWith('/app/calendar') || path.startsWith('/app/projects')) return 'calendar'
  if (path.startsWith('/app/clients') || path.startsWith('/app/loyalty')) return 'clients'
  if (path.startsWith('/app/services') || path.startsWith('/app/inventory')) return 'services'
  if (path.startsWith('/app/analytics')) return 'payments'
  return null
}

/** Which right a notification type requires (null = always shown). */
export function rightForNotificationType(type: string): RightKey | null {
  switch (type) {
    case 'upcoming_appointment': return 'calendar'
    case 'unpaid_payment': return 'payments'
    case 'low_inventory': return 'services'
    case 'birthday': return 'clients'
    default: return null
  }
}
