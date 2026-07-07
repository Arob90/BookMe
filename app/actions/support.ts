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
import { SUPPORT_REWARD_DAYS, SUPPORT_STATUSES, type SupportReportView } from '@/lib/support-shared'

const ADMIN_INBOX = 'sasoandco.ltd@gmail.com'

function toView(r: {
  id: string; ref: string; title: string; details: string | null; status: string
  adminNote: string | null; attachments: string[]; createdAt: Date; updatedAt: Date
}): SupportReportView {
  return {
    id: r.id, ref: r.ref, title: r.title, details: r.details ?? null, status: r.status,
    adminNote: r.adminNote ?? null, attachments: r.attachments ?? [],
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  }
}

/* ─────────────────────────── provider ─────────────────────────── */

const submitSchema = z.object({
  title: z.string().trim().min(3, 'Briefly describe the problem').max(160),
  details: z.string().trim().max(4000).optional().nullable(),
  attachments: z.array(z.string().url()).max(10).optional(),
})

export async function submitSupportReport(input: z.infer<typeof submitSchema>) {
  const session = await getServerSession(authOptions)
  const staffId = session ? getSessionStaffId(session) : null
  const v = submitSchema.parse(input)

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

  const ref = await generateUniqueRef('BUG', async (r) =>
    Boolean(await db.supportReport.findUnique({ where: { ref: r }, select: { id: true } }))
  )

  await db.supportReport.create({
    data: {
      ref, staffId, submitterName, submitterEmail,
      title: v.title, details: v.details?.trim() || null,
      attachments: v.attachments ?? [],
    },
  })

  try {
    await sendEmail({
      to: ADMIN_INBOX,
      subject: `Bug report: ${v.title} (${ref})`,
      html: `<div style="font-family:sans-serif"><h2 style="color:#dc2626">Bug report — ${ref}</h2>
        <p><b>${submitterName ?? 'A provider'}</b>${submitterEmail ? ` &lt;${submitterEmail}&gt;` : ''}</p>
        <p><b>${v.title}</b></p>${v.details ? `<p style="white-space:pre-line">${v.details}</p>` : ''}
        <p style="color:#94a3b8;font-size:12px">Manage in Account Management → Tech Support.</p></div>`,
    })
  } catch { /* best-effort */ }

  revalidatePath('/app/support')
  revalidatePath('/app/accounts')
  return { ok: true as const, ref }
}

export async function getMySupportReports(): Promise<SupportReportView[]> {
  const session = await getServerSession(authOptions)
  const staffId = session ? getSessionStaffId(session) : null
  if (!staffId) return []
  const rows = await db.supportReport.findMany({ where: { staffId }, orderBy: { createdAt: 'desc' }, take: 100 })
  return rows.map(toView)
}

/* ─────────────────────────── admin ─────────────────────────── */

export async function getAllSupportReports() {
  await requireSuperAdmin()
  const rows = await db.supportReport.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
  return rows.map((r) => ({
    ...toView(r),
    staffId: r.staffId,
    submitterName: r.submitterName,
    submitterEmail: r.submitterEmail,
    rewardedDays: r.rewardedDays,
  }))
}

const statusSchema = z.object({
  status: z.enum(SUPPORT_STATUSES),
  note: z.string().trim().max(1000).optional().nullable(),
})

export async function updateSupportStatus(id: string, input: z.infer<typeof statusSchema>) {
  await requireSuperAdmin()
  const { status, note } = statusSchema.parse(input)
  await db.supportReport.update({
    where: { id },
    data: { status, adminNote: note?.trim() || undefined },
  })
  revalidatePath('/app/support')
  return { ok: true as const }
}

const rewardSchema = z.object({ days: z.number().int().min(1).max(3650).default(SUPPORT_REWARD_DAYS) })

export async function rewardSupport(id: string, input?: z.infer<typeof rewardSchema>) {
  const session = await requireSuperAdmin()
  const { days } = rewardSchema.parse(input ?? {})
  const report = await db.supportReport.findUnique({ where: { id }, select: { staffId: true, ref: true, rewardedDays: true } })
  if (!report) throw new Error('Report not found')
  if (!report.staffId) throw new Error('This report has no linked account to reward.')
  await grantFreeDaysToBusiness({
    ownerId: report.staffId,
    days,
    reason: `Thanks for report ${report.ref}`,
    actorUserId: session.user?.id ?? null,
  })
  await db.supportReport.update({ where: { id }, data: { rewardedDays: report.rewardedDays + days } })
  revalidatePath('/app/support')
  revalidatePath('/app/accounts')
  return { ok: true as const, days }
}

export async function deleteSupportReport(id: string) {
  await requireSuperAdmin()
  await db.supportReport.delete({ where: { id } })
  revalidatePath('/app/support')
  return { ok: true as const }
}
