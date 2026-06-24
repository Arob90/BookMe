'use server'

import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/authz'
import { revalidatePath } from 'next/cache'

const PLAN_SEATS: Record<string, number> = { Basic: 1, Pro: 5, Business: 10 }

export type UpgradePaymentRow = {
  ownerId: string
  plan: string | null
  proofUrl: string | null
  submittedAt: string | null
  businessName: string | null
  email: string | null
}

export async function getPendingUpgradePayments(): Promise<UpgradePaymentRow[]> {
  await requireSuperAdmin()

  const rows = await db.settings.findMany({
    where: { planPaymentStatus: 'submitted' },
    select: {
      staffId: true,
      requestedPlan: true,
      planPaymentProofUrl: true,
      planPaymentSubmittedAt: true,
    },
    orderBy: { planPaymentSubmittedAt: 'desc' },
  })

  const ownerIds = rows.map((r) => r.staffId).filter((x): x is string => !!x)
  const owners = ownerIds.length
    ? await db.user.findMany({ where: { id: { in: ownerIds } }, select: { id: true, email: true, businessName: true } })
    : []
  const byId = new Map(owners.map((o) => [o.id, o]))

  return rows
    .filter((r) => !!r.staffId)
    .map((r) => ({
      ownerId: r.staffId as string,
      plan: r.requestedPlan,
      proofUrl: r.planPaymentProofUrl,
      submittedAt: r.planPaymentSubmittedAt ? r.planPaymentSubmittedAt.toISOString() : null,
      businessName: byId.get(r.staffId as string)?.businessName ?? null,
      email: byId.get(r.staffId as string)?.email ?? null,
    }))
}

/** Verify payment and activate the chosen plan: sets seats + active status, clears the proof. */
export async function activateUpgradePlan(ownerId: string, plan: string) {
  await requireSuperAdmin()
  const seats = PLAN_SEATS[plan] ?? 1

  await db.settings.updateMany({
    where: { staffId: ownerId },
    data: {
      maxUsers: seats,
      planStatus: 'active',
      planTier: plan.toLowerCase(),
      planPaymentStatus: null,
      planPaymentProofUrl: null,
      requestedPlan: null,
      planPaymentSubmittedAt: null,
    },
  })

  revalidatePath('/app/accounts')
  revalidatePath('/app')
  return { ok: true as const }
}
