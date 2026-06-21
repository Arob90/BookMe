'use server'

import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/authz'
import { revalidatePath } from 'next/cache'
import { BillingHistoryEventType, recordBillingHistoryEvent } from '@/lib/billing-history'
import { ensureOwnerDefaultClients } from '@/lib/owner-default-clients'

export type PlanType = 'SINGLE' | 'MULTI_5' | 'MULTI_10'

const PLAN_MAX_USERS: Record<PlanType, number> = {
  SINGLE: 1,
  MULTI_5: 5,
  MULTI_10: 10,
}

export async function getPendingAccountRequests() {
  await requireSuperAdmin()

  return db.pendingAccountRequest.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function approveAccountRequest(id: string, plan: PlanType) {
  const adminSession = await requireSuperAdmin()

  const request = await db.pendingAccountRequest.findUnique({
    where: { id },
  })

  if (!request) throw new Error('Request not found')

  const maxUsers = PLAN_MAX_USERS[plan]

  const user = await db.user.create({
    data: {
      email: request.email,
      passwordHash: request.passwordHash,
      role: 'ADMIN',
      businessName: request.businessName,
      district: request.district,
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone,
    },
  })

  const defaultBusinessHours = {
    MONDAY: { start: '09:00', end: '18:00' },
    TUESDAY: { start: '09:00', end: '18:00' },
    WEDNESDAY: { start: '09:00', end: '18:00' },
    THURSDAY: { start: '09:00', end: '18:00' },
    FRIDAY: { start: '09:00', end: '18:00' },
    SATURDAY: { start: '09:00', end: '18:00' },
    SUNDAY: { start: '09:00', end: '18:00' },
  }
  await db.settings.create({
    data: {
      staffId: user.id,
      maxUsers,
      businessHours: defaultBusinessHours,
      businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    },
  })

  await ensureOwnerDefaultClients({
    staffId: user.id,
    firstName: request.firstName,
    lastName: request.lastName,
    email: request.email,
    phone: request.phone,
    businessName: request.businessName,
  })

  await recordBillingHistoryEvent({
    staffId: user.id,
    eventType: BillingHistoryEventType.ACCOUNT_APPROVED,
    title: 'Account approved',
    detail: `Signup approved with initial ${maxUsers}-seat plan.`,
    metadata: { plan, maxUsers },
    actorUserId: adminSession.user?.id ?? null,
  })

  await db.pendingAccountRequest.delete({
    where: { id },
  })

  revalidatePath('/app/accounts')
  revalidatePath('/app')
  revalidatePath('/app/clients')
  revalidatePath('/api/notifications')
  revalidatePath('/api/pending-account-requests')
  return user
}

export async function rejectAccountRequest(id: string) {
  await requireSuperAdmin()

  await db.pendingAccountRequest.delete({
    where: { id },
  })

  revalidatePath('/app/accounts')
  revalidatePath('/api/notifications')
  revalidatePath('/api/pending-account-requests')
}
