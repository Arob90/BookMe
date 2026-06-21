'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { TASK_ACTION_TYPES, type TaskActionType, parseTaskMetadata, normalizeTaskMetadata } from '@/lib/task-action'
import { getAppointmentStaffIdsForBusiness } from '@/lib/client-tenant'
import { assertAppointmentInTenant } from '@/lib/appointment-tenant-guard'

export async function getTasks(startDate?: Date, endDate?: Date, projectId?: string) {
  const session = await getServerSession(authOptions)
  if (!session) return []

  try {
    const where: { staffId: string; projectId?: string | null; dueAt?: { gte?: Date; lte?: Date } } = {
      staffId: getSessionStaffId(session),
    }
    if (projectId) where.projectId = projectId
    if (startDate || endDate) {
      where.dueAt = {}
      if (startDate) where.dueAt.gte = startDate
      if (endDate) where.dueAt.lte = endDate
    }

    return db.task.findMany({
      where,
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
              },
            },
          },
        },
      },
    })
  } catch {
    return [] // Prisma client may lack model until regenerated
  }
}

export async function createTask(data: {
  title: string
  notes?: string
  dueAt: string
  projectId?: string
  appointmentId?: string
  actionType?: TaskActionType
  metadata?: unknown
}) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const actionType: TaskActionType =
    data.actionType && TASK_ACTION_TYPES.includes(data.actionType) ? data.actionType : 'task'
  const metaParsed = parseTaskMetadata(data.metadata)
  const ownerStaffId = getSessionStaffId(session)
  const allowedStaff = new Set(await getAppointmentStaffIdsForBusiness(ownerStaffId))
  if (metaParsed?.staffUserIds?.length) {
    for (const uid of metaParsed.staffUserIds) {
      if (!allowedStaff.has(uid)) throw new Error('Invalid team member selected')
    }
  }

  const meta = normalizeTaskMetadata(metaParsed)
  if (data.appointmentId?.trim()) {
    await assertAppointmentInTenant(data.appointmentId.trim(), ownerStaffId)
  }
  const task = await db.task.create({
    data: {
      staffId: ownerStaffId,
      title: data.title,
      notes: data.notes,
      dueAt: new Date(data.dueAt),
      projectId: data.projectId || null,
      appointmentId: data.appointmentId?.trim() || null,
      actionType,
      metadata: meta === undefined ? undefined : (meta as object),
    } as never,
  })
  revalidatePath('/app/calendar')
  revalidatePath('/app')
  revalidatePath('/app/projects')
  return task
}

export async function updateTask(
  id: string,
  data: {
    title?: string
    notes?: string
    dueAt?: string
    isCompleted?: boolean
    appointmentId?: string | null
  }
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const updateData: Record<string, unknown> = {}
  if (data.title !== undefined) updateData.title = data.title
  if (data.notes !== undefined) updateData.notes = data.notes
  if (data.dueAt !== undefined) updateData.dueAt = new Date(data.dueAt)
  if (data.isCompleted !== undefined) updateData.isCompleted = data.isCompleted
  if (data.appointmentId !== undefined) {
    if (data.appointmentId) {
      await assertAppointmentInTenant(data.appointmentId, ownerStaffId)
    }
    updateData.appointmentId = data.appointmentId
  }

  const task = await db.task.update({
    where: { id, staffId: ownerStaffId },
    data: updateData,
  })
  revalidatePath('/app/calendar')
  revalidatePath('/app')
  revalidatePath('/app/projects')
  return task
}

export async function deleteTask(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  await db.task.delete({
    where: { id, staffId: getSessionStaffId(session) },
  })
  revalidatePath('/app/calendar')
  revalidatePath('/app')
  revalidatePath('/app/projects')
}

export async function toggleTaskComplete(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const task = await db.task.findUnique({
    where: { id, staffId: getSessionStaffId(session) },
  })
  if (!task) throw new Error('Task not found')

  return db.task
    .update({
      where: { id },
      data: { isCompleted: !task.isCompleted },
    })
    .then((t) => {
      revalidatePath('/app/calendar')
      revalidatePath('/app')
      revalidatePath('/app/projects')
      revalidatePath('/app/dashboard')
      return t
    })
}
