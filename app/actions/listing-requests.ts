'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { requireSuperAdmin } from '@/lib/authz'
import { getSessionStaffId } from '@/lib/session-staff'
import { createClient } from '@/app/actions/clients'
import { createProject } from '@/app/actions/projects'

/** Where new leads are emailed. */
const ADMIN_INBOX = 'sasoandco.ltd@gmail.com'

const submitSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().email('Enter a valid email').max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  message: z.string().trim().max(2000).optional().nullable(),
  source: z.string().trim().max(160).optional().nullable(),
  /** Honeypot — real users leave this empty; bots tend to fill every field. */
  company: z.string().optional(),
})

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Public: submit a "list your business / advertise" enquiry.
 * Saves the lead and emails the admin inbox. Never throws on email failure —
 * the row is still stored so nothing is lost.
 */
export async function submitListingRequest(input: z.infer<typeof submitSchema>) {
  const v = submitSchema.parse(input)

  // Honeypot tripped — pretend success, store nothing.
  if (v.company && v.company.trim()) return { ok: true as const }

  const created = await db.listingRequest.create({
    data: {
      fullName: v.fullName,
      email: v.email,
      phone: v.phone?.trim() || null,
      message: v.message?.trim() || null,
      source: v.source?.trim() || null,
    },
  })

  try {
    await sendEmail({
      to: ADMIN_INBOX,
      subject: `New listing enquiry — ${v.fullName}${v.source ? ` (${v.source})` : ''}`,
      html: `
        <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#7c3aed;margin:0 0 12px;">New listing / advertising enquiry</h2>
          <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse;">
            <tr><td style="padding:6px 0;font-weight:600;width:120px;">Name</td><td>${esc(v.fullName)}</td></tr>
            <tr><td style="padding:6px 0;font-weight:600;">Email</td><td><a href="mailto:${esc(v.email)}">${esc(v.email)}</a></td></tr>
            <tr><td style="padding:6px 0;font-weight:600;">Phone</td><td>${v.phone ? esc(v.phone) : '—'}</td></tr>
            <tr><td style="padding:6px 0;font-weight:600;">From</td><td>${v.source ? esc(v.source) : '—'}</td></tr>
          </table>
          ${v.message ? `<p style="margin:16px 0 4px;font-weight:600;color:#334155;">Message</p><p style="white-space:pre-line;color:#475569;font-size:14px;line-height:1.6;">${esc(v.message)}</p>` : ''}
          <p style="margin-top:20px;font-size:12px;color:#94a3b8;">Sent from BookMe · view all in Account → Listing requests.</p>
        </div>`,
    })
  } catch {
    // Email is best-effort; the lead is already saved.
  }

  revalidatePath('/app/listing-requests')
  return { ok: true as const, id: created.id }
}

/* ─────────────────────────── admin ─────────────────────────── */

export async function getListingRequests() {
  await requireSuperAdmin()
  const rows = await db.listingRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    message: r.message,
    source: r.source,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }))
}

const statusSchema = z.enum(['NEW', 'CONTACTED', 'CLOSED'])

export async function updateListingRequestStatus(id: string, status: z.infer<typeof statusSchema>) {
  await requireSuperAdmin()
  statusSchema.parse(status)
  await db.listingRequest.update({ where: { id }, data: { status } })
  revalidatePath('/app/listing-requests')
  return { ok: true as const }
}

export async function deleteListingRequest(id: string) {
  await requireSuperAdmin()
  await db.listingRequest.delete({ where: { id } })
  revalidatePath('/app/listing-requests')
  return { ok: true as const }
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  const firstName = parts.shift() || full.trim() || 'Lead'
  return { firstName, lastName: parts.join(' ') }
}

function leadNotes(r: { source: string | null; message: string | null; email: string; phone: string | null }): string {
  return [
    'Added from a listing/advertising request.',
    r.source ? `Interested in: ${r.source}` : null,
    r.message ? `Message: ${r.message}` : null,
  ].filter(Boolean).join('\n')
}

/** Convert a lead into a client in the admin's own CRM. */
export async function convertRequestToClient(id: string) {
  await requireSuperAdmin()
  const r = await db.listingRequest.findUnique({ where: { id } })
  if (!r) throw new Error('Request not found')

  const { firstName, lastName } = splitName(r.fullName)
  await createClient({
    type: 'INDIVIDUAL',
    firstName,
    lastName,
    email: r.email || '',
    phone: r.phone || undefined,
    notes: leadNotes(r),
    tags: ['Lead'],
  })

  await db.listingRequest.update({ where: { id }, data: { status: 'CONTACTED' } })
  revalidatePath('/app/listing-requests')
  revalidatePath('/app/clients')
  return { ok: true as const }
}

/** Convert a lead into a card in the admin's own project pipeline (first stage). */
export async function convertRequestToProject(id: string) {
  const session = await requireSuperAdmin()
  const r = await db.listingRequest.findUnique({ where: { id } })
  if (!r) throw new Error('Request not found')

  const staffId = getSessionStaffId(session)
  if (!staffId) throw new Error('No business context')

  const stage = await db.pipelineStage.findFirst({
    where: { staffId },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  })
  if (!stage) {
    throw new Error('No pipeline stage yet — open the Projects page to set up your pipeline first.')
  }

  await createProject({
    title: r.source ? `${r.source} — ${r.fullName}` : `Lead: ${r.fullName}`,
    description: leadNotes(r),
    clientName: r.fullName,
    stageId: stage.id,
  })

  await db.listingRequest.update({ where: { id }, data: { status: 'CONTACTED' } })
  revalidatePath('/app/listing-requests')
  revalidatePath('/app/projects')
  return { ok: true as const }
}
