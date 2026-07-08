'use server'

import { db } from '@/lib/db'
import { getMaxUsersForStaffId, canAddTeamMember, resolveSeatCap } from '@/lib/plan-seats'
import { requireSuperAdmin, SUPER_ADMIN_EMAIL } from '@/lib/authz'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import {
  isPrismaOwnerUserIdUnsupportedError,
  isPrismaUnsupportedFieldError,
  TEAM_PRISMA_SETUP_HINT,
} from '@/lib/prisma-owner-support'
import {
  BillingHistoryEventType,
  getBillingHistoryRowsForStaffId,
  recordBillingHistoryEvent,
} from '@/lib/billing-history'
import { ensureOwnerDefaultClients } from '@/lib/owner-default-clients'
import { computeRenewalDate } from '@/lib/subscription'
import { grantFreeDaysToBusiness } from '@/lib/rewards'
import { enqueueAnnouncement } from '@/lib/announcements'
import { format } from 'date-fns'

function isSuperAdminEmail(email: string) {
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
}

const userRoleSchema = z.enum(['ADMIN', 'STAFF'])

/** Matches account signup / approval plans (Settings.max_users). */
const planSeatsSchema = z.union([z.literal(1), z.literal(5), z.literal(10)])

const createManagedUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema.default('STAFF'),
  businessName: z.string().optional(),
  district: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  maxUsers: planSeatsSchema.optional().default(1),
})

const updateManagedUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: userRoleSchema.optional(),
  businessName: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  userName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  maxUsers: planSeatsSchema.optional(),
})

const createTeamMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema.default('STAFF'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

function isArchivedEmail(email: string) {
  return email.toLowerCase().startsWith('archived__')
}

const DEFAULT_BUSINESS_HOURS = {
  MONDAY: { start: '09:00', end: '18:00' },
  TUESDAY: { start: '09:00', end: '18:00' },
  WEDNESDAY: { start: '09:00', end: '18:00' },
  THURSDAY: { start: '09:00', end: '18:00' },
  FRIDAY: { start: '09:00', end: '18:00' },
  SATURDAY: { start: '09:00', end: '18:00' },
  SUNDAY: { start: '09:00', end: '18:00' },
}
const DEFAULT_BUSINESS_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const

const TRIAL_DAYS = 14

async function upsertSettingsMaxUsers(staffId: string, maxUsers: number) {
  // New business → starts a 14-day free trial. Admin re-saving the seat plan for an
  // existing business counts as assigning a paid plan, so it flips to active.
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000)
  await db.settings.upsert({
    where: { staffId },
    create: {
      staffId,
      maxUsers,
      businessHours: DEFAULT_BUSINESS_HOURS,
      businessDays: [...DEFAULT_BUSINESS_DAYS],
      planStatus: 'trialing',
      trialEndsAt,
    },
    update: { maxUsers, planStatus: 'active', trialEndsAt: null },
  })
}

/** Business-owner rows only; team logins have owner_user_id set in the DB. */
async function getTeamMemberUserIds(): Promise<Set<string>> {
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM users WHERE owner_user_id IS NOT NULL
    `
    return new Set(rows.map((r) => r.id))
  } catch (e) {
    console.error(
      '[getAllManagedUsers] Could not list team member ids (is owner_user_id missing?).',
      e
    )
    return new Set()
  }
}

export async function getAllManagedUsers() {
  await requireSuperAdmin()

  type UserRow = {
    id: string
    email: string
    role: string
    businessName: string | null
    district: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    createdAt: Date
    updatedAt: Date
    ownerUserId?: string | null
    subscriptionEndsAt?: Date | null
  }

  let users: UserRow[]
  try {
    users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        businessName: true,
        district: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        ownerUserId: true,
        subscriptionEndsAt: true,
      },
    })
  } catch (e) {
    console.error(
      '[getAllManagedUsers] Query with ownerUserId failed (run: npx prisma generate && ensure DB has owner_user_id). Retrying without column.',
      e
    )
    users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        businessName: true,
        district: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  const teamMemberIds = await getTeamMemberUserIds()
  const owners = users.filter((u) => {
    if ('ownerUserId' in u && u.ownerUserId !== undefined) {
      return u.ownerUserId == null
    }
    return !teamMemberIds.has(u.id)
  })

  if (owners.length === 0) {
    return [] as Array<
      Omit<UserRow, 'ownerUserId'> & { isArchived: boolean; maxUsers: number | null }
    >
  }

  const settingsRows = await db.settings.findMany({
    where: { staffId: { in: owners.map((u) => u.id) } },
    select: { staffId: true, maxUsers: true },
  })
  const maxByStaff = new Map(settingsRows.map((s) => [s.staffId, s.maxUsers]))
  return owners.map((u) => {
    const { ownerUserId: _omit, ...rest } = u
    return {
      ...rest,
      subscriptionEndsAt: u.subscriptionEndsAt ?? null,
      isArchived: isArchivedEmail(u.email),
      maxUsers: maxByStaff.get(u.id) ?? null,
    }
  })
}

export async function createManagedUser(data: z.infer<typeof createManagedUserSchema>) {
  const session = await requireSuperAdmin()
  const v = createManagedUserSchema.parse(data)

  const existing = await db.user.findUnique({ where: { email: v.email } })
  if (existing) throw new Error('Email already exists')

  const passwordHash = await bcrypt.hash(v.password, 10)

  const user = await db.user.create({
    data: {
      email: v.email,
      passwordHash,
      role: v.role,
      businessName: v.businessName || null,
      district: v.district || null,
      firstName: v.firstName || null,
      lastName: v.lastName || null,
      phone: v.phone || null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      businessName: true,
      district: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await upsertSettingsMaxUsers(user.id, v.maxUsers)

  await ensureOwnerDefaultClients({
    staffId: user.id,
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    phone: v.phone,
    businessName: v.businessName,
  })

  await recordBillingHistoryEvent({
    staffId: user.id,
    eventType: BillingHistoryEventType.ACCOUNT_CREATED,
    title: 'Account created',
    detail: `New business account with ${v.maxUsers} seat plan (max user logins).`,
    metadata: { maxUsers: v.maxUsers },
    actorUserId: session.user?.id ?? null,
  })

  revalidatePath('/app/accounts')
  revalidatePath('/app/clients')
  return { ...user, isArchived: false, maxUsers: v.maxUsers }
}

export async function updateManagedUser(userId: string, data: z.infer<typeof updateManagedUserSchema>) {
  const session = await requireSuperAdmin()
  const v = updateManagedUserSchema.parse(data)

  let prevMaxUsers: number | null | undefined
  if (v.maxUsers !== undefined) {
    prevMaxUsers = await getMaxUsersForStaffId(userId)
  }

  if (v.email) {
    const existing = await db.user.findUnique({ where: { email: v.email } })
    if (existing && existing.id !== userId) throw new Error('Email already exists')
  }

  const updateData: any = {}
  if (v.email !== undefined) updateData.email = v.email
  if (v.role !== undefined) updateData.role = v.role
  if (v.businessName !== undefined) updateData.businessName = v.businessName
  if (v.district !== undefined) updateData.district = v.district
  if (v.firstName !== undefined) updateData.firstName = v.firstName
  if (v.lastName !== undefined) updateData.lastName = v.lastName
  if (v.phone !== undefined) updateData.phone = v.phone
  if (v.userName !== undefined) updateData.userName = v.userName
  if (v.address !== undefined) updateData.address = v.address
  if (v.password) updateData.passwordHash = await bcrypt.hash(v.password, 10)

  const user = await db.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      role: true,
      businessName: true,
      district: true,
      firstName: true,
      lastName: true,
      phone: true,
      userName: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (v.maxUsers !== undefined) {
    await upsertSettingsMaxUsers(userId, v.maxUsers)
    const before = prevMaxUsers ?? null
    if (before !== v.maxUsers) {
      await recordBillingHistoryEvent({
        staffId: userId,
        eventType: BillingHistoryEventType.SEAT_PLAN_CHANGE,
        title: 'Seat plan updated',
        detail: `Seat allowance changed from ${before ?? '—'} to ${v.maxUsers} (max user logins).`,
        metadata: { from: before, to: v.maxUsers },
        actorUserId: session.user?.id ?? null,
      })
    }
  }

  const maxUsersAfter = await getMaxUsersForStaffId(userId)

  revalidatePath('/app/accounts')
  return {
    ...user,
    isArchived: isArchivedEmail(user.email),
    maxUsers: maxUsersAfter ?? v.maxUsers ?? null,
  }
}

/** Omit `isPaused`: older generated Prisma clients throw "Unknown field isPaused" on select. */
const managedAccountOwnerSelect = {
  id: true,
  email: true,
  role: true,
  userName: true,
  businessName: true,
  district: true,
  firstName: true,
  lastName: true,
  phone: true,
  birthday: true,
  address: true,
  profilePhoto: true,
  subscriptionEndsAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const managedAccountMemberSelect = {
  id: true,
  email: true,
  role: true,
  userName: true,
  firstName: true,
  lastName: true,
  phone: true,
  createdAt: true,
} as const

export async function getManagedAccountDetail(ownerId: string) {
  await requireSuperAdmin()

  let owner: NonNullable<
    Awaited<ReturnType<typeof db.user.findFirst<{ select: typeof managedAccountOwnerSelect }>>>
  >
  let members: Awaited<
    ReturnType<typeof db.user.findMany<{ select: typeof managedAccountMemberSelect }>>
  >

  try {
    const o = await db.user.findFirst({
      where: { id: ownerId, ownerUserId: null },
      select: managedAccountOwnerSelect,
    })
    if (!o) throw new Error('Account not found')
    owner = o
    members = await db.user.findMany({
      where: { ownerUserId: ownerId },
      orderBy: { createdAt: 'asc' },
      select: managedAccountMemberSelect,
    })
  } catch (e) {
    if (e instanceof Error && e.message === 'Account not found') throw e
    if (!isPrismaOwnerUserIdUnsupportedError(e)) throw e

    const o = await db.user.findUnique({
      where: { id: ownerId },
      select: managedAccountOwnerSelect,
    })
    if (!o) throw new Error('Account not found')
    owner = o
    members = []
  }

  const maxUsers = await getMaxUsersForStaffId(ownerId)
  const seatsUsed = 1 + members.length

  let isPaused = false
  try {
    const p = await db.user.findUnique({
      where: { id: owner.id },
      select: { isPaused: true },
    })
    isPaused = Boolean(p?.isPaused)
  } catch {
    /* Stale Prisma client without User.isPaused */
  }

  let billingHistory: Awaited<ReturnType<typeof getBillingHistoryRowsForStaffId>> = []
  try {
    billingHistory = await getBillingHistoryRowsForStaffId(ownerId)
  } catch {
    billingHistory = []
  }

  return {
    owner: {
      ...owner,
      isArchived: isArchivedEmail(owner.email),
      isPaused,
    },
    members,
    maxUsers,
    seatsUsed,
    seatCap: resolveSeatCap(maxUsers),
    billingHistory,
  }
}

/**
 * Pause or unpause a business (owner + team logins). Cannot target the platform super-admin account.
 */
export async function setManagedBusinessPaused(ownerId: string, paused: boolean) {
  const adminSession = await requireSuperAdmin()

  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { id: true, email: true },
  })
  if (!owner) throw new Error('Account not found')
  if (isSuperAdminEmail(owner.email)) {
    throw new Error('The platform administrator account cannot be paused.')
  }

  try {
    const meta = await db.user.findUnique({
      where: { id: ownerId },
      select: { ownerUserId: true },
    })
    if (meta && meta.ownerUserId != null) {
      throw new Error('Pause applies to the business from the main accounts list, not a team login.')
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Pause applies')) throw e
    /* ownerUserId missing from client — continue */
  }

  const sessionUserIds = new Set<string>([ownerId])

  try {
    await db.user.updateMany({
      where: { OR: [{ id: ownerId }, { ownerUserId: ownerId }] },
      data: { isPaused: paused },
    })
    try {
      const memberRows = await db.user.findMany({
        where: { ownerUserId: ownerId },
        select: { id: true },
      })
      for (const m of memberRows) sessionUserIds.add(m.id)
    } catch {
      /* ownerUserId unsupported */
    }
  } catch (e) {
    if (isPrismaOwnerUserIdUnsupportedError(e)) {
      try {
        await db.user.update({
          where: { id: ownerId },
          data: { isPaused: paused },
        })
      } catch (inner) {
        if (isPrismaUnsupportedFieldError(inner, 'isPaused')) {
          throw new Error(`Account pause needs an updated database client. ${TEAM_PRISMA_SETUP_HINT}`)
        }
        throw inner
      }
    } else if (isPrismaUnsupportedFieldError(e, 'isPaused')) {
      throw new Error(`Account pause needs an updated database client. ${TEAM_PRISMA_SETUP_HINT}`)
    } else {
      throw e
    }
  }

  if (paused) {
    await db.session.deleteMany({
      where: { userId: { in: [...sessionUserIds] } },
    })
  }

  await recordBillingHistoryEvent({
    staffId: ownerId,
    eventType: paused ? BillingHistoryEventType.ACCOUNT_PAUSED : BillingHistoryEventType.ACCOUNT_UNPAUSED,
    title: paused ? 'Account paused' : 'Account unpaused',
    detail: paused
      ? 'Sign-in disabled for the owner and team until unpaused.'
      : 'Sign-in enabled again for the owner and team.',
    metadata: { paused },
    actorUserId: adminSession.user?.id ?? null,
  })

  revalidatePath('/app/accounts')
  return { ok: true }
}

/** Load a business owner row for subscription changes; rejects team logins. */
async function requireBusinessOwner(ownerId: string) {
  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { id: true, email: true, ownerUserId: true, subscriptionEndsAt: true },
  })
  if (!owner) throw new Error('Account not found')
  if (owner.ownerUserId != null) {
    throw new Error('Manage the subscription from the business account, not a team login.')
  }
  return owner
}

const renewSubscriptionSchema = z.object({
  months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
})

/** Extend a business subscription by a number of months (from current expiry if still active, else from now). */
export async function renewSubscription(ownerId: string, data: z.infer<typeof renewSubscriptionSchema>) {
  const session = await requireSuperAdmin()
  const { months } = renewSubscriptionSchema.parse(data)

  const owner = await requireBusinessOwner(ownerId)
  const previous = owner.subscriptionEndsAt ?? null
  const newEnd = computeRenewalDate(previous, months)

  await db.user.update({
    where: { id: ownerId },
    data: { subscriptionEndsAt: newEnd },
  })

  await recordBillingHistoryEvent({
    staffId: ownerId,
    eventType: BillingHistoryEventType.SUBSCRIPTION_RENEWED,
    title: `Subscription renewed (+${months} month${months === 1 ? '' : 's'})`,
    detail: `Expiry ${previous ? `moved from ${format(previous, 'PP')} ` : 'set '}to ${format(newEnd, 'PP')}.`,
    metadata: {
      months,
      from: previous ? previous.toISOString() : null,
      to: newEnd.toISOString(),
    },
    actorUserId: session.user?.id ?? null,
  })

  revalidatePath('/app/accounts')
  return { ok: true as const, subscriptionEndsAt: newEnd.toISOString() }
}

const setSubscriptionEndSchema = z.object({
  /** ISO date string, or null to clear the expiry (unlimited). */
  endsAt: z.string().datetime().nullable(),
})

/** Set or clear an exact subscription expiry date for a business. */
export async function setSubscriptionEnd(ownerId: string, data: z.infer<typeof setSubscriptionEndSchema>) {
  const session = await requireSuperAdmin()
  const { endsAt } = setSubscriptionEndSchema.parse(data)

  const owner = await requireBusinessOwner(ownerId)
  const previous = owner.subscriptionEndsAt ?? null
  const newEnd = endsAt ? new Date(endsAt) : null

  await db.user.update({
    where: { id: ownerId },
    data: { subscriptionEndsAt: newEnd },
  })

  await recordBillingHistoryEvent({
    staffId: ownerId,
    eventType: newEnd
      ? BillingHistoryEventType.SUBSCRIPTION_RENEWED
      : BillingHistoryEventType.SUBSCRIPTION_CLEARED,
    title: newEnd ? 'Subscription date set' : 'Subscription expiry cleared',
    detail: newEnd
      ? `Expiry ${previous ? `changed from ${format(previous, 'PP')} ` : 'set '}to ${format(newEnd, 'PP')}.`
      : `Expiry removed${previous ? ` (was ${format(previous, 'PP')})` : ''}; account no longer expires.`,
    metadata: {
      from: previous ? previous.toISOString() : null,
      to: newEnd ? newEnd.toISOString() : null,
    },
    actorUserId: session.user?.id ?? null,
  })

  revalidatePath('/app/accounts')
  return { ok: true as const, subscriptionEndsAt: newEnd ? newEnd.toISOString() : null }
}

const grantFreeDaysSchema = z.object({
  days: z.number().int().min(1).max(3650),
  reason: z.string().trim().max(200).optional(),
})

/** Super-admin: add N free days to a business (extends the owner's expiry; covers the whole team). */
export async function grantFreeDaysToAccount(ownerId: string, data: z.infer<typeof grantFreeDaysSchema>) {
  const session = await requireSuperAdmin()
  const { days, reason } = grantFreeDaysSchema.parse(data)
  await requireBusinessOwner(ownerId)
  const res = await grantFreeDaysToBusiness({
    ownerId,
    days,
    reason: reason || 'Manual grant',
    actorUserId: session.user?.id ?? null,
  })
  revalidatePath('/app/accounts')
  return res
}

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().max(1000).optional(),
})

/** Super-admin: queue a custom one-time popup modal for a business (owner + team see it). */
export async function sendAccountAnnouncement(ownerId: string, data: z.infer<typeof announcementSchema>) {
  await requireSuperAdmin()
  const { title, body } = announcementSchema.parse(data)
  await requireBusinessOwner(ownerId)
  await enqueueAnnouncement({ staffId: ownerId, kind: 'GENERIC', title, body: body || null })
  revalidatePath('/app/accounts')
  return { ok: true as const }
}

const teamMemberSelect = {
  id: true,
  email: true,
  role: true,
  userName: true,
  firstName: true,
  lastName: true,
  phone: true,
  createdAt: true,
} as const

async function assertOwnerRowForTeamAdd(ownerId: string) {
  try {
    const meta = await db.user.findUnique({
      where: { id: ownerId },
      select: { ownerUserId: true },
    })
    if (meta?.ownerUserId != null) {
      throw new Error('Open the business from the accounts list to add team members.')
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Open the business')) throw e
    if (!isPrismaOwnerUserIdUnsupportedError(e)) throw e
    const rows = await db.$queryRaw<Array<{ owner_user_id: string | null }>>`
      SELECT owner_user_id FROM users WHERE id = ${ownerId}
    `
    if (rows[0]?.owner_user_id != null) {
      throw new Error('Open the business from the accounts list to add team members.')
    }
  }
}

async function countTeamMembersForOwner(ownerId: string): Promise<number> {
  try {
    return await db.user.count({ where: { ownerUserId: ownerId } })
  } catch (e) {
    if (!isPrismaOwnerUserIdUnsupportedError(e)) throw e
    const rows = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM users WHERE owner_user_id = ${ownerId}
    `
    return Number(rows[0]?.count ?? 0)
  }
}

async function fetchTeamMemberRowById(id: string) {
  const row = await db.$queryRaw<
    Array<{
      id: string
      email: string
      role: string
      user_name: string | null
      first_name: string | null
      last_name: string | null
      phone: string | null
      created_at: Date
    }>
  >`
    SELECT id, email, role::text AS role, user_name, first_name, last_name, phone, created_at
    FROM users WHERE id = ${id}
  `
  const r = row[0]
  if (!r) throw new Error('Team member was created but could not be loaded.')
  return {
    id: r.id,
    email: r.email,
    role: r.role as z.infer<typeof userRoleSchema>,
    userName: r.user_name,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone,
    createdAt: r.created_at,
  }
}

async function createTeamMemberRawInsert(
  ownerId: string,
  v: z.infer<typeof createTeamMemberSchema>,
  passwordHash: string,
  owner: { businessName: string | null; district: string | null }
) {
  const id = randomBytes(12).toString('hex')
  try {
    await db.$executeRaw`
      INSERT INTO users (
        id, email, password_hash, role, business_name, district, first_name, last_name,
        owner_user_id, is_paused, created_at, updated_at
      )
      VALUES (
        ${id},
        ${v.email},
        ${passwordHash},
        CAST(${v.role} AS "UserRole"),
        ${owner.businessName},
        ${owner.district},
        ${v.firstName || null},
        ${v.lastName || null},
        ${ownerId},
        false,
        NOW(),
        NOW()
      )
    `
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('owner_user_id') || msg.includes('UserRole') || msg.includes('column')) {
      throw new Error(`Team logins need the database column owner_user_id and enum UserRole. ${TEAM_PRISMA_SETUP_HINT}`)
    }
    throw e
  }

  try {
    const member = await db.user.findUnique({
      where: { id },
      select: teamMemberSelect,
    })
    if (member) return member
  } catch {
    /* stale client may reject select shape */
  }
  return fetchTeamMemberRowById(id)
}

export async function createTeamMemberForAccount(ownerId: string, data: z.infer<typeof createTeamMemberSchema>) {
  await requireSuperAdmin()
  const v = createTeamMemberSchema.parse(data)

  const owner = await db.user.findUnique({
    where: { id: ownerId },
    select: { id: true, businessName: true, district: true, email: true },
  })
  // Expected validation failures are RETURNED (not thrown) so the message
  // survives Next.js's production error masking and reaches the user.
  if (!owner) return { ok: false as const, error: 'Business account not found.' }
  if (isSuperAdminEmail(owner.email)) {
    return { ok: false as const, error: 'You can’t add team logins to the platform administrator account. Add them to a regular business account instead.' }
  }

  await assertOwnerRowForTeamAdd(ownerId)

  const existing = await db.user.findUnique({ where: { email: v.email } })
  if (existing) return { ok: false as const, error: 'That email is already in use.' }

  const teamCount = await countTeamMembersForOwner(ownerId)
  const usedSeats = 1 + teamCount
  const maxUsers = await getMaxUsersForStaffId(ownerId)
  if (!canAddTeamMember({ memberCount: usedSeats, maxUsers })) {
    return {
      ok: false as const,
      error: `Seat limit reached (${resolveSeatCap(maxUsers)}-seat plan). Increase the plan seats above and Save changes, then add the user.`,
    }
  }

  const passwordHash = await bcrypt.hash(v.password, 10)

  try {
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
      },
      select: teamMemberSelect,
    })
    revalidatePath('/app/accounts')
    return { ok: true as const, member }
  } catch (e) {
    if (isPrismaOwnerUserIdUnsupportedError(e) || isPrismaUnsupportedFieldError(e, 'ownerUserId')) {
      const member = await createTeamMemberRawInsert(ownerId, v, passwordHash, owner)
      revalidatePath('/app/accounts')
      return { ok: true as const, member }
    }
    throw e
  }
}

export async function deleteTeamMemberAccount(userId: string) {
  await requireSuperAdmin()

  let ownerUserId: string | null | undefined
  try {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, ownerUserId: true },
    })
    ownerUserId = u?.ownerUserId
  } catch (e) {
    if (!isPrismaOwnerUserIdUnsupportedError(e)) throw e
    const rows = await db.$queryRaw<Array<{ owner_user_id: string | null }>>`
      SELECT owner_user_id FROM users WHERE id = ${userId}
    `
    ownerUserId = rows[0]?.owner_user_id ?? null
  }

  if (!ownerUserId) {
    throw new Error('To remove the business owner, use Delete account. Team members can be removed here.')
  }

  await db.session.deleteMany({ where: { userId } })
  await db.user.delete({ where: { id: userId } })

  revalidatePath('/app/accounts')
  return { ok: true }
}

export async function adminSendPasswordResetLink(userId: string) {
  await requireSuperAdmin()
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
  if (!user) throw new Error('User not found')
  if (isArchivedEmail(user.email)) throw new Error('Cannot send reset link for an archived account')

  const token = randomBytes(32).toString('hex')
  const expires = new Date()
  expires.setHours(expires.getHours() + 1)

  await db.passwordResetToken.deleteMany({ where: { userId: user.id } })
  await db.passwordResetToken.create({
    data: { userId: user.id, token, expires },
  })

  const base = process.env.NEXTAUTH_URL || 'http://localhost:3009'
  const resetUrl = `${String(base).replace(/\/$/, '')}/reset-password?token=${token}`

  return { success: true as const, resetUrl }
}

/**
 * "Archive" (disable) a user account without schema changes:
 * - Delete all active sessions
 * - Randomize passwordHash
 * - Rename email to keep uniqueness and prevent login
 *
 * This is reversible only by editing the account back to a real email + setting a password.
 */
export async function archiveManagedUser(userId: string) {
  await requireSuperAdmin()

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })
  if (!user) throw new Error('User not found')

  try {
    const meta = await db.user.findUnique({
      where: { id: userId },
      select: { ownerUserId: true },
    })
    if (meta && meta.ownerUserId == null) {
      const members = await db.user.findMany({
        where: { ownerUserId: userId },
        select: { id: true },
      })
      for (const m of members) {
        await archiveManagedUser(m.id)
      }
    }
  } catch (e) {
    if (!isPrismaOwnerUserIdUnsupportedError(e)) throw e
    /* Stale client: archive this user only (no team cascade). */
  }

  if (isArchivedEmail(user.email)) return { ok: true }

  await db.session.deleteMany({ where: { userId } })
  await db.user.update({
    where: { id: userId },
    data: {
      email: `archived__${userId}__${Date.now()}__${user.email}`,
      passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
    },
  })

  revalidatePath('/app/accounts')
  return { ok: true }
}

export async function deleteManagedUser(userId: string) {
  await requireSuperAdmin()
  await db.user.delete({ where: { id: userId } })
  revalidatePath('/app/accounts')
  return { ok: true }
}

