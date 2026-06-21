/**
 * Authorization: who can perform which actions.
 * Use after auth: "is user logged in" is enforced elsewhere; here we check "can this user do this."
 *
 * Role semantics:
 * - ADMIN: full access (settings, policies, reports, loyalty rules, inventory, all CRUD).
 * - STAFF: can manage appointments, clients, services, view dashboard/reports; cannot edit
 *   business settings, loyalty/strike policies, or delete business-critical data.
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export type UserRole = 'ADMIN' | 'STAFF'

/** Throws if no session. Returns session. */
export async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  return session
}

/** Throws if no session or role not in allowed. Returns session. */
export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireSession()
  const role = (session.user as { role?: UserRole }).role
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('Forbidden')
  }
  return session
}

/** Only ADMIN can edit business settings, policies, loyalty rules. */
export async function requireAdmin() {
  return requireRole(['ADMIN'])
}

/** ADMIN or STAFF (any logged-in staff can manage day-to-day operations). */
export async function requireStaffOrAdmin() {
  return requireRole(['ADMIN', 'STAFF'])
}

/** Only the super admin (sasoandco.ltd@gmail.com) can manage account requests. */
export const SUPER_ADMIN_EMAIL = 'sasoandco.ltd@gmail.com'

export async function requireSuperAdmin() {
  const session = await requireSession()
  const email = (session.user as { email?: string }).email
  if (email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Forbidden: Super admin access required')
  }
  return session
}

export function isSuperAdmin(email?: string | null): boolean {
  return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}

/** Use in API routes: returns 401/403 response or null if authorized. */
export async function checkApiAuth(allowedRoles?: UserRole[]): Promise<
  | { ok: true; session: Awaited<ReturnType<typeof getServerSession>> }
  | { ok: false; status: 401 | 403; body: { error: string } }
> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } }
  }
  if (allowedRoles?.length) {
    const role = (session.user as { role?: UserRole }).role
    if (!role || !allowedRoles.includes(role)) {
      return { ok: false, status: 403, body: { error: 'Forbidden' } }
    }
  }
  return { ok: true, session }
}
