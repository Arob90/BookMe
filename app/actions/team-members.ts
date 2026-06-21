'use server'

import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/authz'
import { getSessionStaffId } from '@/lib/session-staff'
import { getMaxUsersForStaffId, resolveSeatCap, canAddTeamMember } from '@/lib/plan-seats'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const userRoleSchema = z.enum(['ADMIN', 'STAFF'])

const createTeamMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema.default('STAFF'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
})

const updateTeamMemberSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: userRoleSchema.optional(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
})

const teamMemberSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  createdAt: true,
} as const

export async function getTeamMembersForBusiness() {
  const session = await requireAdmin()
  const ownerId = getSessionStaffId(session as any)

  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { id: true, email: true, businessName: true, district: true },
  })
  if (!owner) throw new Error('Business account not found')

  const members = await db.user.findMany({
    where: { ownerUserId: ownerId },
    orderBy: { createdAt: 'asc' },
    select: teamMemberSelect,
  })

  const maxUsers = await getMaxUsersForStaffId(ownerId)
  const seatsUsed = 1 + members.length
  const seatCap = resolveSeatCap(maxUsers)

  return {
    owner: { id: owner.id, email: owner.email, businessName: owner.businessName, district: owner.district },
    members,
    maxUsers,
    seatsUsed,
    seatCap,
  }
}

export async function createTeamMemberForBusiness(data: z.infer<typeof createTeamMemberSchema>) {
  const session = await requireAdmin()
  const ownerId = getSessionStaffId(session as any)
  const v = createTeamMemberSchema.parse(data)

  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { id: true, businessName: true, district: true },
  })
  if (!owner) throw new Error('Business account not found')

  const existing = await db.user.findUnique({ where: { email: v.email } })
  if (existing) throw new Error('Email already exists')

  const teamCount = await db.user.count({ where: { ownerUserId: ownerId } })
  const usedSeats = 1 + teamCount
  const maxUsers = await getMaxUsersForStaffId(ownerId)
  if (!canAddTeamMember({ memberCount: usedSeats, maxUsers })) {
    throw new Error(`Seat limit reached (${resolveSeatCap(maxUsers)} seat plan).`)
  }

  const passwordHash = await bcrypt.hash(v.password, 10)

  const member = await db.user.create({
    data: {
      email: v.email,
      passwordHash,
      role: v.role,
      ownerUserId: ownerId,
      businessName: owner.businessName,
      district: owner.district,
      firstName: v.firstName || null,
      lastName: v.lastName || null,
      phone: v.phone || null,
    },
    select: teamMemberSelect,
  })

  revalidatePath('/app/settings')
  return member
}

export async function updateTeamMemberForBusiness(memberId: string, data: z.infer<typeof updateTeamMemberSchema>) {
  const session = await requireAdmin()
  const ownerId = getSessionStaffId(session as any)
  const v = updateTeamMemberSchema.parse(data)

  const existing = await db.user.findUnique({
    where: { id: memberId },
    select: { id: true, ownerUserId: true },
  })
  if (!existing) throw new Error('Staff member not found')
  if (existing.ownerUserId !== ownerId) throw new Error('Forbidden')

  if (v.email) {
    const emailOwner = await db.user.findUnique({ where: { email: v.email }, select: { id: true } })
    if (emailOwner && emailOwner.id !== memberId) throw new Error('Email already exists')
  }

  const updateData: any = {}
  if (v.email !== undefined) updateData.email = v.email
  if (v.role !== undefined) updateData.role = v.role
  if (v.firstName !== undefined) updateData.firstName = v.firstName
  if (v.lastName !== undefined) updateData.lastName = v.lastName
  if (v.phone !== undefined) updateData.phone = v.phone
  if (v.password) updateData.passwordHash = await bcrypt.hash(v.password, 10)

  const member = await db.user.update({
    where: { id: memberId },
    data: updateData,
    select: teamMemberSelect,
  })

  revalidatePath('/app/settings')
  return member
}

export async function deleteTeamMemberForBusiness(memberId: string) {
  const session = await requireAdmin()
  const ownerId = getSessionStaffId(session as any)

  const existing = await db.user.findUnique({
    where: { id: memberId },
    select: { id: true, ownerUserId: true },
  })
  if (!existing) throw new Error('Staff member not found')
  if (existing.ownerUserId !== ownerId) throw new Error('Forbidden')

  await db.session.deleteMany({ where: { userId: memberId } })
  await db.user.delete({ where: { id: memberId } })

  revalidatePath('/app/settings')
  return { ok: true as const }
}

