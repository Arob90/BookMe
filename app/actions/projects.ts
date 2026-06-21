'use server'

import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { getAppointmentStaffIdsForBusiness } from '@/lib/client-tenant'
import { revalidatePath } from 'next/cache'

const projectAssigneesInclude = {
  assignees: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userName: true,
          email: true,
          profilePhoto: true,
          role: true,
        },
      },
    },
  },
} as const

/** Linked booking client phone/email for task/reminder quick actions (call, email). */
const projectPipelineContactInclude = {
  ...projectAssigneesInclude,
  appointmentService: {
    select: {
      durationAtTime: true,
      appointment: {
        select: {
          id: true,
          startAt: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              type: true,
              phone: true,
              email: true,
            },
          },
        },
      },
      service: { select: { durationUnit: true } },
    },
  },
} as const

/** Recent pipeline projects for dashboard (newest first). */
export async function getRecentProjects(limit = 5) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const ownerStaffId = getSessionStaffId(session)

  const projects = await db.project.findMany({
    take: Math.min(Math.max(limit, 1), 20),
    where: { staffId: ownerStaffId },
    orderBy: { createdAt: 'desc' },
    include: {
      stage: { select: { id: true, name: true, color: true } },
    },
  })

  return projects.map((p) => ({
    ...p,
    amount: p.amount != null ? Number(p.amount) : null,
  }))
}

export async function getProjectCount() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const ownerStaffId = getSessionStaffId(session)
  return db.project.count({ where: { staffId: ownerStaffId } })
}

export async function getPipelineStages() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const stages = await db.pipelineStage.findMany({
    where: { staffId: ownerStaffId },
    orderBy: { sortOrder: 'asc' },
    include: {
      projects: {
        where: { staffId: ownerStaffId },
        orderBy: { sortOrder: 'asc' },
        include: projectPipelineContactInclude,
      },
    },
  })

  if (stages.length === 0) {
    // Legacy migration: early versions stored pipeline stages/projects without staffId scoping (NULL).
    // If this business has no scoped stages yet but legacy rows exist, adopt them instead of creating defaults.
    const legacyStages = await db.pipelineStage.findMany({
      where: { staffId: null },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
      take: 50,
    })
    if (legacyStages.length > 0) {
      await db.$transaction(async (tx) => {
        await tx.pipelineStage.updateMany({
          where: { staffId: null },
          data: { staffId: ownerStaffId },
        })
        await tx.project.updateMany({
          where: { staffId: null },
          data: { staffId: ownerStaffId },
        })
      })
      revalidatePath('/app/projects')
      return getPipelineStages()
    }

    const defaultStages = [
      { staffId: ownerStaffId, name: 'New', color: 'gray', sortOrder: 0 },
      { staffId: ownerStaffId, name: 'Stage 1', color: 'blue', sortOrder: 1 },
      { staffId: ownerStaffId, name: 'Stage 2', color: 'green', sortOrder: 2 },
      { staffId: ownerStaffId, name: 'Stage 3', color: 'purple', sortOrder: 3 },
    ]
    for (const stage of defaultStages) {
      await db.pipelineStage.create({ data: stage })
    }
    revalidatePath('/app/projects')
    return getPipelineStages()
  }

  return stages
}

/** Owner + team members for pipeline assignee pickers. */
export async function getPipelineStaffOptions() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const ids = await getAppointmentStaffIdsForBusiness(ownerStaffId)
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userName: true,
      email: true,
      profilePhoto: true,
      role: true,
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { email: 'asc' }],
  })
  return users
}

export async function setProjectAssignees(projectId: string, userIds: string[]) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const allowed = new Set(await getAppointmentStaffIdsForBusiness(ownerStaffId))
  const unique = [...new Set(userIds.filter(Boolean))]
  for (const uid of unique) {
    if (!allowed.has(uid)) throw new Error('Invalid team member')
  }

  const project = await db.project.findFirst({ where: { id: projectId }, select: { id: true } })
  if (!project) throw new Error('Project not found')

  await db.$transaction(async (tx) => {
    await tx.projectAssignee.deleteMany({ where: { projectId } })
    if (unique.length > 0) {
      await tx.projectAssignee.createMany({
        data: unique.map((userId) => ({ projectId, userId })),
      })
    }
  })

  revalidatePath('/app/projects')
  revalidatePath('/app/calendar')
  revalidatePath('/app/dashboard')
}

export async function createStage(data: { name: string; color?: string }) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const maxOrder = await db.pipelineStage.aggregate({ where: { staffId: ownerStaffId }, _max: { sortOrder: true } })
  const stage = await db.pipelineStage.create({
    data: {
      staffId: ownerStaffId,
      name: data.name.trim(),
      color: data.color || 'gray',
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  })
  revalidatePath('/app/projects')
  return stage
}

export async function updateStage(
  id: string,
  data: { name?: string; color?: string; isFolded?: boolean }
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name.trim()
  if (data.color !== undefined) updateData.color = data.color
  if (data.isFolded !== undefined) updateData.isFolded = data.isFolded

  await db.pipelineStage.update({
    where: { id, staffId: ownerStaffId },
    data: updateData as any,
  })
  revalidatePath('/app/projects')
}

export async function deleteStage(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const stage = await db.pipelineStage.findUnique({
    where: { id, staffId: ownerStaffId },
    include: { projects: { where: { staffId: ownerStaffId } } },
  })
  if (stage && stage.projects.length > 0) {
    const otherStage = await db.pipelineStage.findFirst({
      where: { id: { not: id }, staffId: ownerStaffId },
      orderBy: { sortOrder: 'asc' },
    })
    if (otherStage) {
      let order = await db.project.count({ where: { stageId: otherStage.id, staffId: ownerStaffId } })
      for (const p of stage.projects) {
        await db.project.update({
          where: { id: p.id, staffId: ownerStaffId },
          data: { stageId: otherStage.id, sortOrder: order++ },
        })
      }
    }
  }
  await db.pipelineStage.delete({ where: { id, staffId: ownerStaffId } })
  revalidatePath('/app/projects')
}

export async function createProject(data: {
  title: string
  description?: string
  clientName?: string
  amount?: string | number
  stageId: string
  appointmentServiceId?: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const stage = await db.pipelineStage.findFirst({
    where: { id: data.stageId, staffId: ownerStaffId },
    select: { id: true },
  })
  if (!stage) throw new Error('Stage not found')

  const maxOrder = await db.project.aggregate({
    where: { stageId: data.stageId, staffId: ownerStaffId },
    _max: { sortOrder: true },
  })
  const amountValue =
    data.amount != null
      ? typeof data.amount === 'number'
        ? data.amount
        : parseFloat(String(data.amount))
      : null
  const lineId = data.appointmentServiceId?.trim() || null
  const project = await db.project.create({
    data: {
      staffId: ownerStaffId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      clientName: data.clientName?.trim() || null,
      amount: amountValue != null && !isNaN(amountValue) ? amountValue : null,
      stageId: data.stageId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      assignees: {
        create: { userId: session.user.id },
      },
    },
  })
  if (lineId) {
    try {
      await db.$executeRaw`
        UPDATE projects SET appointment_service_id = ${lineId} WHERE id = ${project.id}
      `
    } catch (e) {
      console.error('[createProject] could not set appointment_service_id (run npx prisma generate):', e)
    }
  }
  revalidatePath('/app/projects')
  if (lineId) {
    revalidatePath('/app/calendar')
    revalidatePath('/app/dashboard')
  }
  return project
}

export async function getProject(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const ownerStaffId = getSessionStaffId(session)

  const project = await db.project.findFirst({
    where: { id, staffId: ownerStaffId },
    include: {
      stage: true,
      tasks: {
        orderBy: { dueAt: 'asc' },
        include: {
          appointment: {
            select: {
              id: true,
              startAt: true,
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  type: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      reminders: {
        orderBy: { dueAt: 'asc' },
        include: {
          appointment: {
            select: {
              id: true,
              startAt: true,
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  type: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      ...projectAssigneesInclude,
    },
  })
  if (!project) throw new Error('Project not found')

  let appointmentServiceLineId: string | null = null
  try {
    const rows = await db.$queryRaw<Array<{ appointment_service_id: string | null }>>`
      SELECT appointment_service_id FROM projects WHERE id = ${id} LIMIT 1
    `
    appointmentServiceLineId = rows[0]?.appointment_service_id ?? null
  } catch {
    appointmentServiceLineId = null
  }

  let appointmentService: {
    id: string
    durationAtTime: number
    appointment: {
      id: string
      startAt: Date
      client: {
        id: string
        firstName: string
        lastName: string
        companyName: string | null
        type: string
        phone: string | null
        email: string | null
      }
    }
    service: { durationUnit: string | null }
  } | null = null
  if (appointmentServiceLineId) {
    appointmentService = await db.appointmentService.findUnique({
      where: { id: appointmentServiceLineId },
      select: {
        id: true,
        durationAtTime: true,
        appointment: {
          select: {
            id: true,
            startAt: true,
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                companyName: true,
                type: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        service: { select: { durationUnit: true } },
      },
    })
  }

  return { ...project, appointmentService }
}

export async function updateProject(
  id: string,
  data: {
    title?: string
    description?: string
    notes?: string
    clientName?: string
    amount?: number
    stageId?: string
    sortOrder?: number
    plannedDurationMinutes?: number | null
    plannedDurationUnit?: string | null
    estimatedDueAt?: Date | string | null
  }
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const ownerStaffId = getSessionStaffId(session)

  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.description !== undefined) updateData.description = data.description?.trim() || null
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null
  if (data.clientName !== undefined) updateData.clientName = data.clientName?.trim() || null
  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.stageId !== undefined) updateData.stageId = data.stageId
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
  if (data.plannedDurationMinutes !== undefined) {
    updateData.plannedDurationMinutes =
      data.plannedDurationMinutes == null || Number.isNaN(Number(data.plannedDurationMinutes))
        ? null
        : Math.round(Number(data.plannedDurationMinutes))
  }
  if (data.plannedDurationUnit !== undefined) {
    updateData.plannedDurationUnit = data.plannedDurationUnit?.trim() || 'MINUTES'
  }
  if (data.estimatedDueAt !== undefined) {
    if (data.estimatedDueAt == null || data.estimatedDueAt === '') {
      updateData.estimatedDueAt = null
    } else {
      const d =
        typeof data.estimatedDueAt === 'string' ? new Date(data.estimatedDueAt) : data.estimatedDueAt
      updateData.estimatedDueAt = Number.isNaN(d.getTime()) ? null : d
    }
  }

  await db.project.update({
    where: { id, staffId: ownerStaffId },
    data: updateData as any,
  })
  revalidatePath('/app/projects')
}

export async function moveProject(projectId: string, targetStageId: string, newSortOrder: number) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const target = await db.pipelineStage.findFirst({
    where: { id: targetStageId, staffId: ownerStaffId },
    select: { id: true },
  })
  if (!target) throw new Error('Stage not found')

  await db.project.update({
    where: { id: projectId, staffId: ownerStaffId },
    data: { stageId: targetStageId, sortOrder: newSortOrder },
  })
  revalidatePath('/app/projects')
}

/** Move project to a stage (appends at end of column). Same ordering rules as drag-drop onto a stage. */
export async function setProjectStage(projectId: string, targetStageId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const ownerStaffId = getSessionStaffId(session)

  const project = await db.project.findFirst({
    where: { id: projectId, staffId: ownerStaffId },
    select: { id: true, stageId: true },
  })
  if (!project) throw new Error('Project not found')

  const target = await db.pipelineStage.findFirst({
    where: { id: targetStageId, staffId: ownerStaffId },
    select: { id: true },
  })
  if (!target) throw new Error('Stage not found')

  if (project.stageId === targetStageId) return { ok: true as const }

  const nextOrder = await db.project.count({ where: { stageId: targetStageId, staffId: ownerStaffId } })
  await db.project.update({
    where: { id: projectId, staffId: ownerStaffId },
    data: { stageId: targetStageId, sortOrder: nextOrder },
  })
  revalidatePath('/app/projects')
  return { ok: true as const }
}

export async function deleteProject(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const ownerStaffId = getSessionStaffId(session)

  let hadAppointmentLine = false
  try {
    const rows = await db.$queryRaw<Array<{ appointment_service_id: string | null }>>`
      SELECT appointment_service_id FROM projects WHERE id = ${id} AND staff_id = ${ownerStaffId} LIMIT 1
    `
    hadAppointmentLine = !!rows[0]?.appointment_service_id
  } catch {
    hadAppointmentLine = false
  }
  await db.project.delete({ where: { id, staffId: ownerStaffId } })
  revalidatePath('/app/projects')
  if (hadAppointmentLine) {
    revalidatePath('/app/calendar')
    revalidatePath('/app/dashboard')
  }
}

/**
 * Link a pipeline card that was created from the board (no booking line id) to this
 * appointment service line when title + client name match.
 */
async function tryLinkOrphanProjectToAppointmentServiceLine(data: {
  appointmentServiceId: string
  serviceName: string
  clientName: string
}): Promise<{ id: string } | null> {
  const sn = data.serviceName.trim()
  const cn = data.clientName.trim()
  for (const mode of ['strict', 'nullClient'] as const) {
    if (mode === 'strict' && !cn) continue
    const condition =
      mode === 'strict'
        ? Prisma.sql`lower(trim(coalesce(p.client_name,''))) = lower(trim(${cn})) AND trim(coalesce(p.client_name,'')) <> ''`
        : Prisma.sql`trim(coalesce(p.client_name,'')) = ''`
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT p.id
      FROM projects p
      WHERE p.appointment_service_id IS NULL
        AND lower(trim(coalesce(p.title,''))) = lower(trim(${sn}))
        AND (${condition})
      ORDER BY p.created_at ASC
      LIMIT 1
    `
    if (rows.length > 0) {
      await db.$executeRaw`
        UPDATE projects SET appointment_service_id = ${data.appointmentServiceId} WHERE id = ${rows[0].id}
      `
      return { id: rows[0].id }
    }
  }
  return null
}

export async function createProjectFromAppointmentService(data: {
  appointmentServiceId: string
  serviceName: string
  servicePrice: string | number
  clientName: string
  appointmentDate?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const staffId = getSessionStaffId(session)
  const line = await db.appointmentService.findFirst({
    where: { id: data.appointmentServiceId },
    include: { appointment: { select: { staffId: true, clientId: true } } },
  })
  if (!line || line.appointment.staffId !== staffId) {
    throw new Error('Appointment service not found')
  }

  try {
    const dup = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM projects WHERE appointment_service_id = ${data.appointmentServiceId} LIMIT 1
    `
    if (dup.length > 0) {
      throw new Error('This service is already in the project pipeline')
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('already in the project pipeline')) throw e
    console.error('[createProjectFromAppointmentService] duplicate check failed:', e)
  }

  const linked = await tryLinkOrphanProjectToAppointmentServiceLine({
    appointmentServiceId: data.appointmentServiceId,
    serviceName: data.serviceName,
    clientName: data.clientName,
  })
  if (linked) {
    revalidatePath('/app/projects')
    revalidatePath('/app/calendar')
    revalidatePath('/app/dashboard')
    revalidatePath(`/app/clients/${line.appointment.clientId}`)
    const project = await db.project.findFirst({
      where: { id: linked.id },
      include: { stage: true },
    })
    if (project) return project
  }

  // Ensure we always have a valid default stage for THIS business tenant.
  // Older versions allowed custom stage names; don't hard-require "New".
  let newStage = await db.pipelineStage.findFirst({
    where: { staffId, name: 'New' },
    orderBy: { sortOrder: 'asc' },
  })
  if (!newStage) {
    const anyStage = await db.pipelineStage.findFirst({
      where: { staffId },
      orderBy: { sortOrder: 'asc' },
    })
    if (anyStage) {
      newStage = anyStage
    } else {
      const defaultStages = [
        { staffId, name: 'New', color: 'gray', sortOrder: 0 },
        { staffId, name: 'Stage 1', color: 'blue', sortOrder: 1 },
        { staffId, name: 'Stage 2', color: 'green', sortOrder: 2 },
        { staffId, name: 'Stage 3', color: 'purple', sortOrder: 3 },
      ]
      await db.pipelineStage.createMany({ data: defaultStages })
      newStage = await db.pipelineStage.findFirst({
        where: { staffId },
        orderBy: { sortOrder: 'asc' },
      })
    }
  }
  if (!newStage) throw new Error('Pipeline stage not found. Please refresh and try again.')

  const priceNum = typeof data.servicePrice === 'number'
    ? data.servicePrice
    : parseFloat(String(data.servicePrice))
  const description = data.appointmentDate
    ? `Appointment: ${data.appointmentDate}`
    : undefined

  const project = await createProject({
    title: data.serviceName.trim(),
    description,
    clientName: data.clientName.trim(),
    amount: !isNaN(priceNum) ? priceNum : undefined,
    stageId: newStage.id,
    appointmentServiceId: data.appointmentServiceId,
  })
  revalidatePath(`/app/clients/${line.appointment.clientId}`)
  return project
}
