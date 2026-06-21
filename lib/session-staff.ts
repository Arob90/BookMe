/**
 * Business (tenant) scope for appointments, clients, settings, etc.
 * Team members have `ownerUserId` set; their business data lives under the owner's id.
 */
export function getSessionStaffId(session: {
  user: { id: string; businessStaffId?: string | null }
}): string {
  return session.user.businessStaffId ?? session.user.id
}
