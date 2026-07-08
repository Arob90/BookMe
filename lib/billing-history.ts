import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

/** Stored in `BillingHistoryEvent.eventType` */
export const BillingHistoryEventType = {
  ACCOUNT_APPROVED: 'ACCOUNT_APPROVED',
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  SEAT_PLAN_CHANGE: 'SEAT_PLAN_CHANGE',
  ACCOUNT_PAUSED: 'ACCOUNT_PAUSED',
  ACCOUNT_UNPAUSED: 'ACCOUNT_UNPAUSED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CLEARED: 'SUBSCRIPTION_CLEARED',
  FREE_DAYS_GRANTED: 'FREE_DAYS_GRANTED',
  PLAN_ACTIVATED: 'PLAN_ACTIVATED',
} as const

export type BillingHistoryEventTypeValue = (typeof BillingHistoryEventType)[keyof typeof BillingHistoryEventType]

export type BillingHistoryRow = {
  id: string
  staffId: string
  eventType: string
  title: string
  detail: string | null
  metadata: Prisma.JsonValue | null
  actorUserId: string | null
  createdAt: Date
}

export async function getBillingHistoryRowsForStaffId(staffId: string, take = 100): Promise<BillingHistoryRow[]> {
  const rows = await db.billingHistoryEvent.findMany({
    where: { staffId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      staffId: true,
      eventType: true,
      title: true,
      detail: true,
      metadata: true,
      actorUserId: true,
      createdAt: true,
    },
  })
  return rows
}

export async function recordBillingHistoryEvent(input: {
  staffId: string
  eventType: BillingHistoryEventTypeValue | string
  title: string
  detail?: string | null
  metadata?: Prisma.InputJsonValue
  actorUserId?: string | null
}): Promise<void> {
  await db.billingHistoryEvent.create({
    data: {
      staffId: input.staffId,
      eventType: input.eventType,
      title: input.title,
      detail: input.detail ?? null,
      metadata: input.metadata === undefined ? undefined : input.metadata,
      actorUserId: input.actorUserId ?? null,
    },
  })
  revalidatePath('/app/settings')
}
