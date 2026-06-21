/**
 * Prisma filter: services that belong to this business — direct staffId, legacy NULL,
 * or category owned by this user (recovers rows where service.staffId was wrong).
 *
 * Intentionally NOT a server action; safe to import from 'use server' modules.
 */
export function whereServicesForBusiness(staffId: string) {
  return {
    OR: [
      // Directly owned by this business
      { staffId },
      // Legacy single-tenant rows before staffId existed
      { staffId: null },
      // If category is owned by this business, treat service as owned too
      { category: { staffId } },
      // Legacy categories before staffId existed (pre-multi-tenant)
      { category: { staffId: null } },
    ],
  }
}

/**
 * Prisma may fail ordering/selecting by sort order when the DB column is missing
 * (`sort_order`) or the client field name differs (`sortOrder`). Match both.
 */
export function isSortOrderUnavailableError(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err ?? '')
  if (!m) return false
  if (/sortOrder|sort_order/i.test(m)) return true
  if (/does not exist/i.test(m) && /sort_order|orderby/i.test(m)) return true
  return false
}

