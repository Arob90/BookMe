import { z } from 'zod'

export const TASK_ACTION_TYPES = ['task', 'meeting', 'call', 'email'] as const
export type TaskActionType = (typeof TASK_ACTION_TYPES)[number]

const metadataSchema = z.object({
  staffUserIds: z.array(z.string()).optional(),
  clientIds: z.array(z.string()).optional(),
  /** @deprecated prefer additionalPhones; still read for older saved tasks/reminders */
  phone: z.string().max(80).optional(),
  additionalPhones: z.array(z.string().max(80)).max(40).optional(),
  /** @deprecated prefer additionalEmails; still read for older saved tasks/reminders */
  email: z.union([z.string().email().max(320), z.literal('')]).optional(),
  additionalEmails: z.array(z.string().max(320)).max(40).optional(),
})

export type TaskMetadata = z.infer<typeof metadataSchema>

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

export function parseTaskMetadata(raw: unknown): TaskMetadata | undefined {
  if (raw == null || typeof raw !== 'object') return undefined
  const r = metadataSchema.safeParse(raw)
  return r.success ? r.data : undefined
}

function normalizePhoneEntry(s: string) {
  return s.trim().replace(/\s+/g, ' ')
}

export function normalizeTaskMetadata(m: TaskMetadata | undefined) {
  if (!m) return undefined
  const staffUserIds = [...new Set((m.staffUserIds ?? []).filter(Boolean))]
  const clientIds = [...new Set((m.clientIds ?? []).filter(Boolean))]

  const rawPhones: string[] = [
    ...(m.additionalPhones ?? []).map((p) => normalizePhoneEntry(p)).filter(Boolean),
    ...(m.phone?.trim() ? [normalizePhoneEntry(m.phone)] : []),
  ]
  const seenPhone = new Set<string>()
  const additionalPhones: string[] = []
  for (const p of rawPhones) {
    if (p.length > 80) continue
    const key = p.toLowerCase().replace(/\s/g, '')
    if (seenPhone.has(key)) continue
    seenPhone.add(key)
    additionalPhones.push(p)
  }

  const rawExtras: string[] = [
    ...(m.additionalEmails ?? []).map((e) => e.trim()).filter(Boolean),
    ...(m.email?.trim() && isValidEmail(m.email) ? [m.email.trim()] : []),
  ]
  const seen = new Set<string>()
  const additionalEmails: string[] = []
  for (const e of rawExtras) {
    const key = e.toLowerCase()
    if (seen.has(key)) continue
    if (!isValidEmail(e)) continue
    seen.add(key)
    additionalEmails.push(e)
  }

  if (
    staffUserIds.length === 0 &&
    clientIds.length === 0 &&
    additionalPhones.length === 0 &&
    additionalEmails.length === 0
  ) {
    return undefined
  }
  const out: {
    staffUserIds?: string[]
    clientIds?: string[]
    additionalPhones?: string[]
    additionalEmails?: string[]
  } = {}
  if (staffUserIds.length) out.staffUserIds = staffUserIds
  if (clientIds.length) out.clientIds = clientIds
  if (additionalPhones.length) out.additionalPhones = additionalPhones
  if (additionalEmails.length) out.additionalEmails = additionalEmails
  return out
}
