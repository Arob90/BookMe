'use server'

import { requireSession } from '@/lib/authz'
import { getSessionStaffId } from '@/lib/session-staff'
import { getBillingHistoryRowsForStaffId, type BillingHistoryRow } from '@/lib/billing-history'

export type { BillingHistoryRow }

/** Logged-in business (owner scope for team): billing / plan timeline. */
export async function getMyBillingHistory(): Promise<BillingHistoryRow[]> {
  const session = await requireSession()
  const staffId = getSessionStaffId(session)
  return getBillingHistoryRowsForStaffId(staffId)
}
