'use server'

import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { TASK_ACTION_TYPES, type TaskActionType, parseTaskMetadata, normalizeTaskMetadata } from '@/lib/task-action'
import { getAppointmentStaffIdsForBusiness } from '@/lib/client-tenant'
import { assertAppointmentInTenant } from '@/lib/appointment-tenant-guard'

export async function getReminders(startDate?: Date, endDate?: Date, projectId?: string) {
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

    return db.reminder.findMany({
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

export async function createReminder(data: {
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
  const reminder = await db.reminder.create({
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
  return reminder
}

export async function updateReminder(
  id: string,
  data: {
    title?: string
    notes?: string | null
    dueAt?: string
    actionType?: TaskActionType
    metadata?: unknown | null
    appointmentId?: string | null
    isCompleted?: boolean
  }
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)

  const existing = await db.reminder.findFirst({
    where: { id, staffId: ownerStaffId },
    select: { id: true },
  })
  if (!existing) throw new Error('Reminder not found')

  if (data.metadata !== undefined && data.metadata !== null) {
    const metaParsed = parseTaskMetadata(data.metadata)
    if (metaParsed?.staffUserIds?.length) {
      const allowedStaff = new Set(await getAppointmentStaffIdsForBusiness(ownerStaffId))
      for (const uid of metaParsed.staffUserIds) {
        if (!allowedStaff.has(uid)) throw new Error('Invalid team member selected')
      }
    }
  }

  const sets: Prisma.Sql[] = []
  if (data.title !== undefined) sets.push(Prisma.sql`title = ${data.title}`)
  if (data.notes !== undefined) sets.push(Prisma.sql`notes = ${data.notes}`)
  if (data.dueAt !== undefined) sets.push(Prisma.sql`due_at = ${new Date(data.dueAt)}`)
  if (data.actionType !== undefined) {
    const at =
      data.actionType && TASK_ACTION_TYPES.includes(data.actionType) ? data.actionType : 'task'
    sets.push(Prisma.sql`action_type = ${at}`)
  }
  if (data.metadata !== undefined) {
    if (data.metadata === null) {
      sets.push(Prisma.sql`metadata = NULL`)
    } else {
      const metaParsed = parseTaskMetadata(data.metadata)
      const norm = normalizeTaskMetadata(metaParsed) ?? null
      if (norm === null) {
        sets.push(Prisma.sql`metadata = NULL`)
      } else {
        sets.push(Prisma.sql`metadata = ${norm as Prisma.InputJsonValue}`)
      }
    }
  }

  if (data.appointmentId !== undefined) {
    if (data.appointmentId) {
      await assertAppointmentInTenant(data.appointmentId, ownerStaffId)
      sets.push(Prisma.sql`appointment_id = ${data.appointmentId}`)
    } else {
      sets.push(Prisma.sql`appointment_id = NULL`)
    }
  }

  if (data.isCompleted !== undefined) {
    sets.push(Prisma.sql`is_completed = ${data.isCompleted}`)
  }

  if (sets.length === 0) {
    return db.reminder.findFirst({ where: { id, staffId: ownerStaffId } })
  }

  /** Raw UPDATE keeps working if the generated Prisma client is stale (e.g. notes column added but `prisma generate` failed on Windows). */
  await db.$executeRaw(Prisma.sql`
    UPDATE reminders SET ${Prisma.join(sets, ', ')}
    WHERE id = ${id} AND staff_id = ${ownerStaffId}
  `)

  revalidatePath('/app/calendar')
  revalidatePath('/app')
  revalidatePath('/app/projects')
  return db.reminder.findFirst({ where: { id, staffId: ownerStaffId } })
}

export async function deleteReminder(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  await db.reminder.delete({
    where: { id, staffId: getSessionStaffId(session) },
  })
  revalidatePath('/app/calendar')
  revalidatePath('/app')
  revalidatePath('/app/projects')
  revalidatePath('/app/dashboard')
}

export async function toggleReminderComplete(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const ownerStaffId = getSessionStaffId(session)
  const reminder = await db.reminder.findUnique({
    where: { id, staffId: ownerStaffId },
  })
  if (!reminder) throw new Error('Reminder not found')

  const wasDone = (reminder as { isCompleted?: boolean }).isCompleted === true
  const nextDone = !wasDone

  /** Raw UPDATE avoids stale Prisma clients that omit `isCompleted` on ReminderUpdateInput after schema changes. */
  await db.$executeRaw(Prisma.sql`
    UPDATE reminders SET is_completed = ${nextDone}
    WHERE id = ${id} AND staff_id = ${ownerStaffId}
  `)

  revalidatePath('/app/calendar')
  revalidatePath('/app')
  revalidatePath('/app/projects')
  revalidatePath('/app/dashboard')

  return db.reminder.findFirst({ where: { id, staffId: ownerStaffId } })
}
