'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'

const DEFAULT_PAYMENT_METHODS = { CASH: true, BANK: true, WALLET: true, WIRE: true }

export type PaymentMethodType = 'CASH' | 'BANK' | 'WALLET' | 'WIRE'

export async function getPaymentMethodsEnabled(): Promise<Record<PaymentMethodType, boolean>> {
  const session = await getServerSession(authOptions)
  if (!session) return DEFAULT_PAYMENT_METHODS

  try {
    const settings = await db.settings.findUnique({
      where: { staffId: getSessionStaffId(session) },
      select: { paymentMethodsEnabled: true },
    })
    const enabled = settings?.paymentMethodsEnabled as Record<string, boolean> | null
    if (!enabled || typeof enabled !== 'object') return DEFAULT_PAYMENT_METHODS
    return {
      CASH: enabled.CASH !== false,
      BANK: enabled.BANK !== false,
      WALLET: enabled.WALLET !== false,
      WIRE: enabled.WIRE !== false,
    }
  } catch {
    return DEFAULT_PAYMENT_METHODS
  }
}

export async function updatePaymentMethodsEnabled(
  methods: Partial<Record<PaymentMethodType, boolean>>
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const current = await getPaymentMethodsEnabled()
  const updated = { ...current, ...methods }

  const existing = await db.settings.findUnique({
    where: { staffId: getSessionStaffId(session) },
  })

  if (existing) {
    await db.settings.update({
      where: { staffId: getSessionStaffId(session) },
      data: { paymentMethodsEnabled: updated },
    })
  } else {
    // Create with minimal required fields
    await db.settings.create({
      data: {
        staffId: getSessionStaffId(session),
        paymentMethodsEnabled: updated,
      },
    })
  }
  revalidatePath('/app/settings')
}

export async function getPaymentAccounts(type: PaymentMethodType) {
  const session = await getServerSession(authOptions)
  if (!session) return []

  try {
    return db.paymentAccount.findMany({
      where: { staffId: getSessionStaffId(session), type },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  } catch {
    return []
  }
}

export async function createPaymentAccount(data: {
  type: PaymentMethodType
  name: string
  accountNumber?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  if (!db.paymentAccount) {
    throw new Error(
      'PaymentAccount model not available. Stop the dev server, run "npx prisma generate", then restart.'
    )
  }

  const staffId = getSessionStaffId(session)
  let sortOrder = 0
  try {
    const existing = await db.paymentAccount.findMany({
      where: { staffId, type: data.type },
      select: { id: true },
    })
    sortOrder = existing.length
  } catch {
    // fallback if count fails
  }

  const account = await db.paymentAccount.create({
    data: {
      staffId,
      type: data.type,
      name: data.name.trim(),
      accountNumber: data.accountNumber?.trim() || null,
      sortOrder,
    },
  })
  revalidatePath('/app/settings')
  return account
}

export async function updatePaymentAccount(
  id: string,
  data: { name?: string; accountNumber?: string }
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  await db.paymentAccount.update({
    where: { id, staffId: getSessionStaffId(session) },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.accountNumber !== undefined && {
        accountNumber: data.accountNumber?.trim() || null,
      }),
    },
  })
  revalidatePath('/app/settings')
}

export async function deletePaymentAccount(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  await db.paymentAccount.delete({
    where: { id, staffId: getSessionStaffId(session) },
  })
  revalidatePath('/app/settings')
}

export async function getBankingSettings() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const [methodsEnabled, banks, wallets, wirePlaces] = await Promise.all([
    getPaymentMethodsEnabled(),
    getPaymentAccounts('BANK'),
    getPaymentAccounts('WALLET'),
    getPaymentAccounts('WIRE'),
  ])

  return {
    methodsEnabled,
    banks,
    wallets,
    wirePlaces,
  }
}
