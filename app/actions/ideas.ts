'use server'

import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { requireSuperAdmin } from '@/lib/authz'
import { generateUniqueRef } from '@/lib/ref-code'
import { grantFreeDaysToBusiness } from '@/lib/rewards'
import { IDEA_REWARD_DAYS, type IdeaUpdate, type PublicIdea } from '@/lib/ideas-shared'

const ADMIN_INBOX = 'sasoandco.ltd@gmail.com'

function parseUpdates(v: unknown): IdeaUpdate[] {
  if (!Array.isArray(v)) return []
  return v.filter((u) => u && typeof u === 'object') as IdeaUpdate[]
}

function toPublic(i: {
  id: string; ref: string; title: string; details: string | null; status: string
  progress: number; publicNote: string | null; updates: unknown; createdAt: Date; updatedAt: Date
}): PublicIdea {
  return {
    id: i.id, ref: i.ref, title: i.title, details: i.details ?? null, status: i.status,
    progress: i.progress, publicNote: i.publicNote ?? null, updates: parseUpdates(i.updates),
    createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString(),
  }
}

/* ─────────────────────────── provider ─────────────────────────── */

const submitIdeaSchema = z.object({
  title: z.string().trim().min(3, 'Give your idea a short title').max(140),
  details: z.string().trim().max(4000).optional().nullable(),
})

export async function submitIdea(input: z.infer<typeof submitIdeaSchema>) {
  const session = await getServerSession(authOptions)
  const staffId = session ? getSessionStaffId(session) : null
  const v = submitIdeaSchema.parse(input)

  let submitterName: string | null = null
  let submitterEmail: string | null = (session?.user as { email?: string })?.email ?? null
  if (staffId) {
    const u = await db.user.findUnique({
      where: { id: staffId },
      select: { businessName: true, firstName: true, lastName: true, email: true },
    })
    submitterName = u?.businessName || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || null
    submitterEmail = u?.email || submitterEmail
  }

  const ref = await generateUniqueRef('IDEA', async (r) =>
    Boolean(await db.idea.findUnique({ where: { ref: r }, select: { id: true } }))
  )

  await db.idea.create({
    data: { ref, staffId, submitterName, submitterEmail, title: v.title, details: v.details?.trim() || null },
  })

  try {
    await sendEmail({
      to: ADMIN_INBOX,
      subject: `New idea: ${v.title} (${ref})`,
      html: `<div style="font-family:sans-serif"><h2 style="color:#7c3aed">New idea — ${ref}</h2>
        <p><b>${submitterName ?? 'A provider'}</b>${submitterEmail ? ` &lt;${submitterEmail}&gt;` : ''}</p>
        <p><b>${v.title}</b></p>${v.details ? `<p style="white-space:pre-line">${v.details}</p>` : ''}
        <p style="color:#94a3b8;font-size:12px">Manage in Account Management → Ideas.</p></div>`,
    })
  } catch { /* best-effort */ }

  revalidatePath('/app/ideas')
  revalidatePath('/app/accounts')
  return { ok: true as const, ref }
}

/** The shared community board: approved (in-progress) + completed ideas. */
export async function getPublicIdeasBoard(): Promise<PublicIdea[]> {
  try {
    const rows = await db.idea.findMany({
      where: { status: { in: ['APPROVED', 'COMPLETED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    })
    return rows.map(toPublic)
  } catch {
    return []
  }
}

/** The signed-in provider's own submissions (any status, so they see pending/denied too). */
export async function getMyIdeas(): Promise<PublicIdea[]> {
  const session = await getServerSession(authOptions)
  const staffId = session ? getSessionStaffId(session) : null
  if (!staffId) return []
  const rows = await db.idea.findMany({ where: { staffId }, orderBy: { createdAt: 'desc' }, take: 100 })
  return rows.map(toPublic)
}

/* ─────────────────────────── admin ─────────────────────────── */

export async function getAllIdeas() {
  await requireSuperAdmin()
  const rows = await db.idea.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
  return rows.map((i) => ({
    ...toPublic(i),
    staffId: i.staffId,
    submitterName: i.submitterName,
    submitterEmail: i.submitterEmail,
    rewardedDays: i.rewardedDays,
  }))
}

export async function setIdeaApproval(id: string, approved: boolean) {
  await requireSuperAdmin()
  await db.idea.update({ where: { id }, data: { status: approved ? 'APPROVED' : 'DENIED' } })
  revalidatePath('/app/ideas')
  revalidatePath('/app/accounts')
  return { ok: true as const }
}

const progressSchema = z.object({
  progress: z.number().int().min(0).max(100),
  note: z.string().trim().max(1000).optional().nullable(),
})

/** Set progress %, optionally with a public note appended to the timeline. Auto-completes at 100. */
export async function updateIdeaProgress(id: string, input: z.infer<typeof progressSchema>) {
  await requireSuperAdmin()
  const { progress, note } = progressSchema.parse(input)
  const idea = await db.idea.findUnique({ where: { id }, select: { updates: true } })
  if (!idea) throw new Error('Idea not found')
  const timeline = parseUpdates(idea.updates)
  timeline.push({ at: new Date().toISOString(), progress, note: note?.trim() || null })
  await db.idea.update({
    where: { id },
    data: {
      progress,
      publicNote: note?.trim() || undefined,
      updates: timeline,
      status: progress >= 100 ? 'COMPLETED' : 'APPROVED',
    },
  })
  revalidatePath('/app/ideas')
  return { ok: true as const }
}

const rewardSchema = z.object({ days: z.number().int().min(1).max(3650).default(IDEA_REWARD_DAYS) })

/** Thank the submitter with free days (default 30). Applies to their whole business. */
export async function rewardIdea(id: string, input?: z.infer<typeof rewardSchema>) {
  const session = await requireSuperAdmin()
  const { days } = rewardSchema.parse(input ?? {})
  const idea = await db.idea.findUnique({ where: { id }, select: { staffId: true, ref: true, rewardedDays: true } })
  if (!idea) throw new Error('Idea not found')
  if (!idea.staffId) throw new Error('This idea has no linked account to reward.')
  await grantFreeDaysToBusiness({
    ownerId: idea.staffId,
    days,
    reason: `Thank you for idea ${idea.ref}`,
    actorUserId: session.user?.id ?? null,
  })
  await db.idea.update({ where: { id }, data: { rewardedDays: idea.rewardedDays + days } })
  revalidatePath('/app/ideas')
  revalidatePath('/app/accounts')
  return { ok: true as const, days }
}

export async function deleteIdea(id: string) {
  await requireSuperAdmin()
  await db.idea.delete({ where: { id } })
  revalidatePath('/app/ideas')
  return { ok: true as const }
}
