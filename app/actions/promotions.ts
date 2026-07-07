'use server'

import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { db } from '@/lib/db'

export type PublicPromotion = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

/** SQL-level filter: active flag on + inside the optional [startsAt, endsAt] window. */
function activeWhere(now: Date) {
  return {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  }
}

/** Active, in-window promotions for one business — used on the public profile page. */
export async function getPublicPromotions(businessId: string): Promise<PublicPromotion[]> {
  if (!businessId) return []
  try {
    const rows = await db.promotion.findMany({
      where: { staffId: businessId, ...activeWhere(new Date()) },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? null,
      imageUrl: p.imageUrl ?? null,
      startsAt: p.startsAt ? p.startsAt.toISOString() : null,
      endsAt: p.endsAt ? p.endsAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }))
  } catch {
    return []
  }
}

export type RailPromotion = PublicPromotion & { businessId: string; businessName: string }

/**
 * A spread of currently-active promotions across businesses for the sponsored rails.
 * Returns the most recent, paired with the business name + id so each links to its profile.
 */
export async function getActivePromotionsForRails(limit = 6): Promise<RailPromotion[]> {
  try {
    const rows = await db.promotion.findMany({
      where: activeWhere(new Date()),
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(24, limit)),
    })
    if (rows.length === 0) return []
    const owners = await db.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.staffId))] } },
      select: { id: true, businessName: true, userName: true, firstName: true, lastName: true, email: true },
    })
    const nameById = new Map(
      owners.map((o) => [
        o.id,
        o.businessName || o.userName || `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || o.email,
      ])
    )
    return rows.map((p) => ({
      id: p.id,
      businessId: p.staffId,
      businessName: nameById.get(p.staffId) || 'A business',
      title: p.title,
      description: p.description ?? null,
      imageUrl: p.imageUrl ?? null,
      startsAt: p.startsAt ? p.startsAt.toISOString() : null,
      endsAt: p.endsAt ? p.endsAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }))
  } catch {
    return []
  }
}

/* ─────────────────────────── owner-side ─────────────────────────── */

async function requireOwnerStaffId(): Promise<string> {
  const session = await getServerSession(authOptions)
  const staffId = session ? getSessionStaffId(session) : null
  if (!staffId) throw new Error('Not signed in')
  return staffId
}

export async function getMyPromotions() {
  const staffId = await requireOwnerStaffId()
  const rows = await db.promotion.findMany({
    where: { staffId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? null,
    imageUrl: p.imageUrl ?? null,
    startsAt: p.startsAt ? p.startsAt.toISOString() : null,
    endsAt: p.endsAt ? p.endsAt.toISOString() : null,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  }))
}

const promotionInputSchema = z.object({
  title: z.string().trim().min(2, 'Title is required').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal('')),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

/** Parse a yyyy-mm-dd (or ISO) string to a Date, or null. End dates snap to end-of-day. */
function toDate(v: string | null | undefined, endOfDay = false): Date | null {
  if (!v) return null
  const s = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T${endOfDay ? '23:59:59' : '00:00:00'}` : v
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function createPromotion(input: z.infer<typeof promotionInputSchema>) {
  const staffId = await requireOwnerStaffId()
  const v = promotionInputSchema.parse(input)
  await db.promotion.create({
    data: {
      staffId,
      title: v.title,
      description: v.description?.trim() || null,
      imageUrl: v.imageUrl?.trim() || null,
      startsAt: toDate(v.startsAt),
      endsAt: toDate(v.endsAt, true),
      isActive: v.isActive ?? true,
    },
  })
  revalidatePath('/app/promotions')
  revalidatePath(`/b/${staffId}`)
  return { ok: true as const }
}

export async function updatePromotion(id: string, input: z.infer<typeof promotionInputSchema>) {
  const staffId = await requireOwnerStaffId()
  const v = promotionInputSchema.parse(input)
  const res = await db.promotion.updateMany({
    where: { id, staffId },
    data: {
      title: v.title,
      description: v.description?.trim() || null,
      imageUrl: v.imageUrl?.trim() || null,
      startsAt: toDate(v.startsAt),
      endsAt: toDate(v.endsAt, true),
      ...(v.isActive !== undefined ? { isActive: v.isActive } : {}),
    },
  })
  if (res.count === 0) throw new Error('Promotion not found')
  revalidatePath('/app/promotions')
  revalidatePath(`/b/${staffId}`)
  return { ok: true as const }
}

export async function togglePromotionActive(id: string, isActive: boolean) {
  const staffId = await requireOwnerStaffId()
  const res = await db.promotion.updateMany({ where: { id, staffId }, data: { isActive } })
  if (res.count === 0) throw new Error('Promotion not found')
  revalidatePath('/app/promotions')
  revalidatePath(`/b/${staffId}`)
  return { ok: true as const }
}

export async function deletePromotion(id: string) {
  const staffId = await requireOwnerStaffId()
  const res = await db.promotion.deleteMany({ where: { id, staffId } })
  if (res.count === 0) throw new Error('Promotion not found')
  revalidatePath('/app/promotions')
  revalidatePath(`/b/${staffId}`)
  return { ok: true as const }
}
