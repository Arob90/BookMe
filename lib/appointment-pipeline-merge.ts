import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getClientDisplayName } from '@/lib/utils'

export type PipelineLinkForLine = {
  id: string
  stage: { name: string }
}

/** Normalize titles / client names for matching pipeline cards to booked lines. */
export function normalizePipelineLinkMatchKey(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Uses raw SQL so this works when Prisma Client is out of date and does not yet
 * know about `Project.appointmentServiceId` (DB column `appointment_service_id`).
 */
export async function fetchPipelineLinksByAppointmentServiceIds(
  serviceLineIds: string[],
): Promise<Map<string, PipelineLinkForLine>> {
  const ids = [...new Set(serviceLineIds.filter(Boolean))]
  if (ids.length === 0) return new Map()
  try {
    const rows = await db.$queryRaw<
      Array<{ id: string; appointment_service_id: string | null; stage_name: string }>
    >`
      SELECT p.id, p.appointment_service_id, s.name AS stage_name
      FROM projects p
      INNER JOIN pipeline_stages s ON s.id = p.stage_id
      WHERE p.appointment_service_id IN (${Prisma.join(ids)})
    `
    const m = new Map<string, PipelineLinkForLine>()
    for (const row of rows) {
      if (row.appointment_service_id) {
        m.set(row.appointment_service_id, {
          id: row.id,
          stage: { name: row.stage_name },
        })
      }
    }
    return m
  } catch (e) {
    console.error('[appointment-pipeline-merge] fetchPipelineLinks failed:', e)
    return new Map()
  }
}

type OrphanRow = {
  id: string
  title: string | null
  client_name: string | null
  stage_name: string
  created_at: Date
}

async function fetchOrphanProjectCandidates(serviceTitles: string[]): Promise<OrphanRow[]> {
  const titles = [...new Set(serviceTitles.map((t) => t.trim()).filter(Boolean))]
  if (titles.length === 0) return []
  try {
    const titleCond = Prisma.join(
      titles.map((name) => Prisma.sql`lower(trim(coalesce(p.title,''))) = lower(trim(${name}))`),
      ' OR ',
    )
    return await db.$queryRaw<OrphanRow[]>`
      SELECT p.id, p.title, p.client_name, s.name AS stage_name, p.created_at
      FROM projects p
      INNER JOIN pipeline_stages s ON s.id = p.stage_id
      WHERE p.appointment_service_id IS NULL
        AND (${titleCond})
      ORDER BY p.created_at ASC
    `
  } catch (e) {
    console.error('[appointment-pipeline-merge] fetchOrphanProjectCandidates failed:', e)
    return []
  }
}

/**
 * Cards created from the Pipeline page have no `appointment_service_id`, so they never
 * showed "In pipeline" on the appointment. Match those rows to booked lines by service
 * title + client name (strict), then by title + empty client name (manual kanban cards).
 */
function matchOrphanProjectsToLines(
  appointment: {
    appointmentServices: Array<{ id: string; service?: { name?: string | null } | null }>
    client?: Parameters<typeof getClientDisplayName>[0]
  },
  directByLineId: Map<string, PipelineLinkForLine>,
  orphanRows: OrphanRow[],
): Map<string, PipelineLinkForLine> {
  const out = new Map<string, PipelineLinkForLine>()
  const aptClientNorm = appointment.client
    ? normalizePipelineLinkMatchKey(getClientDisplayName(appointment.client))
    : ''

  const linesNeeding = appointment.appointmentServices
    .filter((as) => !directByLineId.has(as.id))
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))

  const usedOrphanIds = new Set<string>()

  const titleNormForLine = (as: (typeof linesNeeding)[number]) =>
    normalizePipelineLinkMatchKey(as.service?.name ?? '')

  const pick = (
    as: (typeof linesNeeding)[number],
    mode: 'strictClient' | 'nullClient',
  ): OrphanRow | undefined => {
    const g = titleNormForLine(as)
    if (!g) return undefined
    const candidates = orphanRows
      .filter((row) => !usedOrphanIds.has(row.id))
      .filter((row) => normalizePipelineLinkMatchKey(row.title) === g)
    if (mode === 'strictClient') {
      if (!aptClientNorm) return undefined
      return candidates.find(
        (row) =>
          normalizePipelineLinkMatchKey(row.client_name) === aptClientNorm &&
          normalizePipelineLinkMatchKey(row.client_name) !== '',
      )
    }
    return candidates.find((row) => normalizePipelineLinkMatchKey(row.client_name) === '')
  }

  for (const as of linesNeeding) {
    const hit = pick(as, 'strictClient')
    if (hit) {
      usedOrphanIds.add(hit.id)
      out.set(as.id, { id: hit.id, stage: { name: hit.stage_name } })
    }
  }
  for (const as of linesNeeding) {
    if (out.has(as.id)) continue
    const hit = pick(as, 'nullClient')
    if (hit) {
      usedOrphanIds.add(hit.id)
      out.set(as.id, { id: hit.id, stage: { name: hit.stage_name } })
    }
  }
  return out
}

async function buildFullPipelineMapForAppointment(
  appointment: {
    appointmentServices: Array<{ id: string; service?: { name?: string | null } | null }>
    client?: Parameters<typeof getClientDisplayName>[0]
  },
  directAllLines?: Map<string, PipelineLinkForLine>,
): Promise<Map<string, PipelineLinkForLine>> {
  const ids = appointment.appointmentServices.map((as) => as.id)
  const direct =
    directAllLines ??
    (await fetchPipelineLinksByAppointmentServiceIds(ids))

  const result = new Map<string, PipelineLinkForLine>()
  for (const id of ids) {
    const hit = direct.get(id)
    if (hit) result.set(id, hit)
  }

  const titles = appointment.appointmentServices.map((as) => as.service?.name ?? '')
  const orphans = await fetchOrphanProjectCandidates(titles)
  const extra = matchOrphanProjectsToLines(appointment, result, orphans)
  for (const [lineId, link] of extra) {
    result.set(lineId, link)
  }
  return result
}

export function mergePipelineLinksOntoServices<T extends { id: string }>(
  services: T[],
  byLineId: Map<string, PipelineLinkForLine>,
): Array<T & { pipelineProject: PipelineLinkForLine | null }> {
  return services.map((as) => ({
    ...as,
    pipelineProject: byLineId.get(as.id) ?? null,
  }))
}

export async function attachPipelineToAppointmentServices<
  T extends {
    appointmentServices: Array<{ id: string; service?: { name?: string | null } | null }>
    client?: Parameters<typeof getClientDisplayName>[0]
  },
>(
  appointment: T,
): Promise<
  T & {
    appointmentServices: Array<
      T['appointmentServices'][number] & { pipelineProject: PipelineLinkForLine | null }
    >
  }
> {
  const map = await buildFullPipelineMapForAppointment(appointment, undefined)
  return {
    ...appointment,
    appointmentServices: mergePipelineLinksOntoServices(appointment.appointmentServices, map),
  } as T & {
    appointmentServices: Array<
      T['appointmentServices'][number] & { pipelineProject: PipelineLinkForLine | null }
    >
  }
}

export async function attachPipelineToAppointmentsList<
  T extends {
    appointmentServices: Array<{ id: string; service?: { name?: string | null } | null }>
    client?: Parameters<typeof getClientDisplayName>[0]
  },
>(appointments: T[]): Promise<T[]> {
  const allIds = appointments.flatMap((a) => a.appointmentServices.map((as) => as.id))
  const directAll = await fetchPipelineLinksByAppointmentServiceIds(allIds)
  const merged = await Promise.all(
    appointments.map(async (apt) => {
      const map = await buildFullPipelineMapForAppointment(apt, directAll)
      return {
        ...apt,
        appointmentServices: mergePipelineLinksOntoServices(apt.appointmentServices, map),
      }
    }),
  )
  return merged as T[]
}
