'use server'

import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/authz'
import { revalidatePath } from 'next/cache'
import { BillingHistoryEventType, recordBillingHistoryEvent } from '@/lib/billing-history'

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
  const session = await requireSuperAdmin()
  const seats = PLAN_SEATS[plan] ?? 1

  // Keep the proof URL for the history record before we clear it.
  const settings = await db.settings.findFirst({
    where: { staffId: ownerId },
    select: { planPaymentProofUrl: true },
  })

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

  // Record on the account's billing history so it shows for the admin (account
  // detail → History) and the provider (Settings → Subscription payments).
  try {
    await recordBillingHistoryEvent({
      staffId: ownerId,
      eventType: BillingHistoryEventType.PLAN_ACTIVATED,
      title: `Payment approved — ${plan} plan`,
      detail: `Payment verified. ${plan} plan activated (${seats} seat${seats === 1 ? '' : 's'}).`,
      metadata: { plan, maxUsers: seats, proofUrl: settings?.planPaymentProofUrl ?? null },
      actorUserId: session.user?.id ?? null,
    })
  } catch (e) {
    console.error('[activateUpgradePlan] failed to record billing history', e)
  }

  revalidatePath('/app/accounts')
  revalidatePath('/app')
  return { ok: true as const }
}
