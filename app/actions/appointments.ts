'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSchedulableSlotMinutes } from '@/lib/utils'
import { whereServicesForBusiness } from '@/lib/service-ownership'
import { awardLoyaltyForAppointmentIfEligible } from '@/app/actions/loyalty'
import { appointmentServiceIncludeWithPipeline } from '@/lib/appointment-service-include'
import {
  attachPipelineToAppointmentServices,
  attachPipelineToAppointmentsList,
} from '@/lib/appointment-pipeline-merge'

const createAppointmentSchema = z.object({
  clientId: z.string(),
  staffId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  serviceIds: z.array(z.string()),
  notes: z.string().optional(),
  status: z.enum(['BOOKED', 'CONFIRMED']).default('BOOKED'),
})

const MAX_SCHEDULABLE_APPOINTMENT_MINUTES = 24 * 60

function isValidStoredAppointmentWindow(startAt: Date, endAt: Date) {
  const minutes = (endAt.getTime() - startAt.getTime()) / 60000
  return minutes > 0 && minutes <= MAX_SCHEDULABLE_APPOINTMENT_MINUTES
}

export async function createAppointment(data: z.infer<typeof createAppointmentSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = createAppointmentSchema.parse(data)

  // Ensure the appointment is created for the logged-in business
  // Override staffId to prevent creating appointments for other businesses
  validated.staffId = getSessionStaffId(session)

  // Appointments represent a calendar slot (consultation), not the project delivery timeline.
  // Keep selected services for context/pricing, but use a fixed slot length.
  const CONSULTATION_DURATION_MINUTES = 60

  const startAt = new Date(validated.startAt)
  const uniqueServiceIds = [...new Set(validated.serviceIds)]
  const services = await db.service.findMany({
    where: {
      AND: [
        { id: { in: uniqueServiceIds } },
        whereServicesForBusiness(getSessionStaffId(session)),
        { isActive: true },
        { isArchived: false },
      ],
    },
  })
  if (services.length !== uniqueServiceIds.length) {
    throw new Error('Selected services are invalid or unavailable')
  }
  const serviceById = new Map(services.map((s) => [s.id, s]))
  const endAt = new Date(startAt.getTime() + CONSULTATION_DURATION_MINUTES * 60000)

  // Check for double booking - appointments overlap if:
  // newStart < existingEnd AND newEnd > existingStart
  const overlapping = await db.appointment.findMany({
    where: {
      staffId: validated.staffId, // Now guaranteed to be getSessionStaffId(session)
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
    },
  })
  const conflicting = overlapping.find((apt) => isValidStoredAppointmentWindow(apt.startAt, apt.endAt))

  if (conflicting) {
    throw new Error('Staff member already has an appointment at this time')
  }

  const totalPrice = validated.serviceIds.reduce((sum, id) => {
    const s = serviceById.get(id)!
    return sum + Number(s.price)
  }, 0)

  const appointment = await db.appointment.create({
    data: {
      clientId: validated.clientId,
      staffId: validated.staffId,
      startAt,
      endAt,
      status: validated.status,
      totalPrice,
      notes: validated.notes,
      appointmentServices: {
        create: validated.serviceIds.map((id) => {
          const s = serviceById.get(id)!
          return {
            serviceId: s.id,
            priceAtTime: s.price,
            durationAtTime: s.durationMinutes,
          }
        }),
      },
    },
    include: {
      client: true,
      appointmentServices: { include: appointmentServiceIncludeWithPipeline },
    },
  })

  revalidatePath('/app/calendar')
  return attachPipelineToAppointmentServices(appointment)
}

export async function updateAppointmentStatus(
  id: string,
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'LATE_CANCEL' | 'NO_SHOW'
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify appointment belongs to this business
  const existingAppointment = await db.appointment.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session),
    },
  })

  if (!existingAppointment) {
    throw new Error('Appointment not found or does not belong to this business')
  }

  const appointment = await db.appointment.update({
    where: { id },
    data: { status },
    include: { client: true },
  })

  // Auto-add strikes for late cancel and no-show
  if (status === 'LATE_CANCEL' || status === 'NO_SHOW') {
    let settings
    try {
      settings = await db.settings.findUnique({ where: { staffId: getSessionStaffId(session) } })
    } catch (error: any) {
      // Fallback to singleton if staffId not available yet
      if (error.message?.includes('Unknown argument `staffId`')) {
        settings = await db.settings.findUnique({ where: { id: 'singleton' } })
      } else {
        throw error
      }
    }
    const strikeDelta = status === 'LATE_CANCEL' ? settings?.strikeLateCancel || 1 : settings?.strikeNoShow || 2

    await db.strikeEvent.create({
      data: {
        clientId: appointment.clientId,
        appointmentId: appointment.id,
        type: status === 'LATE_CANCEL' ? 'LATE_CANCEL' : 'NO_SHOW',
        delta: strikeDelta,
      },
    })
  }

  if (status === 'COMPLETED') {
    await awardLoyaltyForAppointmentIfEligible({
      appointmentId: appointment.id,
      staffId: getSessionStaffId(session),
      reason: 'Appointment completed',
    })
  }

  revalidatePath('/app/calendar')
  revalidatePath(`/app/clients/${appointment.clientId}`)
  return appointment
}

export async function getAppointments(startDate: Date, endDate: Date, minimal?: boolean) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const appointments = await db.appointment.findMany({
    where: {
      staffId: getSessionStaffId(session), // Filter by logged-in business
      startAt: { gte: startDate, lte: endDate },
    },
    include: minimal ? {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthday: true,
          email: true,
          phone: true,
          loyaltyAccount: {
            select: { pointsBalance: true },
          },
        },
      },
      appointmentServices: {
        select: {
          id: true,
          serviceId: true,
          priceAtTime: true,
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
      loyaltyTransactions: {
        select: { deltaPoints: true },
      },
    } : {
      client: {
        include: {
          loyaltyAccount: {
            select: {
              pointsBalance: true,
            },
          },
        },
      },
      appointmentServices: { include: appointmentServiceIncludeWithPipeline },
      payments: {
        select: {
          amount: true,
          paymentMethod: true,
          paidAt: true,
        },
        orderBy: {
          paidAt: 'desc',
        },
      },
      loyaltyTransactions: {
        select: { deltaPoints: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { startAt: 'asc' },
  })

  const withPipelineLinks = await attachPipelineToAppointmentsList(appointments)

  // Convert Decimal to number for serialization
  return withPipelineLinks.map((apt) => ({
    ...apt,
    totalPrice: apt.totalPrice ? Number(apt.totalPrice) : null,
    appointmentServices: apt.appointmentServices.map((as: any) => ({
      ...as,
      priceAtTime: as.priceAtTime ? Number(as.priceAtTime) : null,
      service: as.service ? {
        ...as.service,
        price: as.service.price ? Number(as.service.price) : null,
      } : null,
    })),
    payments: minimal ? [] : (apt as any).payments?.map((p: any) => ({
      ...p,
      amount: p.amount ? Number(p.amount) : null,
    })) || [],
  }))
}

export async function deleteAppointment(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify appointment belongs to this business
  const existingAppointment = await db.appointment.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session),
    },
  })

  if (!existingAppointment) {
    throw new Error('Appointment not found or does not belong to this business')
  }

  await db.appointment.delete({ where: { id } })
  revalidatePath('/app/calendar')
}

const rescheduleAppointmentSchema = z.object({
  id: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
})

export async function rescheduleAppointment(data: z.infer<typeof rescheduleAppointmentSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = rescheduleAppointmentSchema.parse(data)

  // Get the existing appointment to check for conflicts
  const existingAppointment = await db.appointment.findFirst({
    where: {
      id: validated.id,
      staffId: getSessionStaffId(session), // Verify appointment belongs to this business
    },
    include: { client: true },
  })

  if (!existingAppointment) {
    throw new Error('Appointment not found or does not belong to this business')
  }

  // Check for double booking (excluding the current appointment)
  const overlapping = await db.appointment.findMany({
    where: {
      id: { not: validated.id },
      staffId: existingAppointment.staffId,
      startAt: { lt: new Date(validated.endAt) },
      endAt: { gt: new Date(validated.startAt) },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
    },
  })
  const conflicting = overlapping.find((apt) => isValidStoredAppointmentWindow(apt.startAt, apt.endAt))

  if (conflicting) {
    throw new Error('Staff member already has an appointment at this time')
  }

  const appointment = await db.appointment.update({
    where: { id: validated.id },
    data: {
      startAt: new Date(validated.startAt),
      endAt: new Date(validated.endAt),
    },
    include: {
      client: true,
      appointmentServices: { include: appointmentServiceIncludeWithPipeline },
    },
  })

  revalidatePath('/app/calendar')
  revalidatePath(`/app/clients/${appointment.clientId}`)
  return attachPipelineToAppointmentServices(appointment)
}

/** Stored per line (can be months/years in minutes); calendar end uses getSchedulableSlotMinutes per line. */
const MAX_APPOINTMENT_LINE_DURATION_MINUTES = 10 * 365 * 24 * 60

const updateAppointmentServiceDurationsSchema = z.object({
  appointmentId: z.string(),
  services: z
    .array(
      z.object({
        appointmentServiceId: z.string(),
        /** Stored calendar minutes for this line (same as Service.durationMinutes). */
        durationMinutes: z
          .number()
          .int()
          .min(1)
          .max(MAX_APPOINTMENT_LINE_DURATION_MINUTES),
      })
    )
    .min(1),
})

export async function updateAppointmentServiceDurations(
  data: z.infer<typeof updateAppointmentServiceDurationsSchema>
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = updateAppointmentServiceDurationsSchema.parse(data)

  const existing = await db.appointment.findFirst({
    where: { id: validated.appointmentId, staffId: getSessionStaffId(session) },
    include: {
      appointmentServices: { include: appointmentServiceIncludeWithPipeline },
    },
  })

  if (!existing) {
    throw new Error('Appointment not found or does not belong to this business')
  }

  if (['CANCELLED', 'NO_SHOW'].includes(existing.status)) {
    throw new Error('Cannot edit duration for cancelled or no-show appointments')
  }

  const expectedIds = new Set(existing.appointmentServices.map((as) => as.id))
  const submittedIds = new Set(validated.services.map((s) => s.appointmentServiceId))
  if (submittedIds.size !== expectedIds.size || [...submittedIds].some((id) => !expectedIds.has(id))) {
    throw new Error('Include every booked service line when updating durations')
  }

  const byId = new Map(validated.services.map((s) => [s.appointmentServiceId, s.durationMinutes]))

  let totalSlotMinutes = 0
  for (const as of existing.appointmentServices) {
    const dm = byId.get(as.id)!
    totalSlotMinutes += getSchedulableSlotMinutes(dm, as.service?.durationUnit)
  }

  if (totalSlotMinutes <= 0) {
    throw new Error('Total duration must be positive')
  }

  const newEndAt = new Date(existing.startAt.getTime() + totalSlotMinutes * 60000)

  if (!isValidStoredAppointmentWindow(existing.startAt, newEndAt)) {
    throw new Error('Total duration must be between 1 minute and 24 hours')
  }

  const overlapping = await db.appointment.findMany({
    where: {
      id: { not: validated.appointmentId },
      staffId: existing.staffId,
      startAt: { lt: newEndAt },
      endAt: { gt: existing.startAt },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
    },
  })
  const conflicting = overlapping.find((apt) => isValidStoredAppointmentWindow(apt.startAt, apt.endAt))

  if (conflicting) {
    throw new Error('Staff member already has an appointment at this time')
  }

  await db.$transaction(async (tx) => {
    for (const s of validated.services) {
      await tx.appointmentService.update({
        where: { id: s.appointmentServiceId },
        data: { durationAtTime: s.durationMinutes },
      })
    }
    await tx.appointment.update({
      where: { id: validated.appointmentId },
      data: { endAt: newEndAt },
    })
  })

  const appointment = await db.appointment.findFirst({
    where: { id: validated.appointmentId },
    include: {
      client: {
        include: {
          loyaltyAccount: true,
        },
      },
      appointmentServices: { include: appointmentServiceIncludeWithPipeline },
      payments: {
        orderBy: { paidAt: 'desc' },
      },
    },
  })

  if (!appointment) throw new Error('Appointment not found')

  const withPipeline = await attachPipelineToAppointmentServices(appointment)

  revalidatePath('/app/calendar')
  revalidatePath('/app/dashboard')
  revalidatePath(`/app/clients/${appointment.clientId}`)

  return {
    ...withPipeline,
    totalPrice: withPipeline.totalPrice ? Number(withPipeline.totalPrice) : null,
    appointmentServices: withPipeline.appointmentServices.map((as: any) => ({
      ...as,
      priceAtTime: as.priceAtTime ? Number(as.priceAtTime) : null,
      service: as.service
        ? {
            ...as.service,
            price: as.service.price ? Number(as.service.price) : null,
          }
        : null,
    })),
    payments: ((withPipeline as any).payments || []).map((p: any) => ({
      ...p,
      amount: p.amount ? Number(p.amount) : null,
    })),
  }
}

const updateAppointmentSchema = z.object({
  id: z.string(),
  clientId: z.string().optional(),
  staffId: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  serviceIds: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['BOOKED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'LATE_CANCEL', 'NO_SHOW']).optional(),
})

export async function updateAppointment(data: z.infer<typeof updateAppointmentSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = updateAppointmentSchema.parse(data)

  // Get the existing appointment
  const existingAppointment = await db.appointment.findFirst({
    where: {
      id: validated.id,
      staffId: getSessionStaffId(session), // Verify appointment belongs to this business
    },
    include: { client: true, appointmentServices: true },
  })

  if (!existingAppointment) {
    throw new Error('Appointment not found or does not belong to this business')
  }

  // Check for double booking if time or staff changed (excluding the current appointment)
  if (validated.startAt || validated.endAt || validated.staffId) {
    const newStartAt = validated.startAt ? new Date(validated.startAt) : existingAppointment.startAt
    const newEndAt = validated.endAt ? new Date(validated.endAt) : existingAppointment.endAt
    const newStaffId = validated.staffId || existingAppointment.staffId

    // Validate that end time is after start time
    if (newEndAt <= newStartAt) {
      throw new Error('End time must be after start time')
    }

    const overlapping = await db.appointment.findMany({
      where: {
        id: { not: validated.id },
        staffId: newStaffId,
        startAt: { lt: newEndAt },
        endAt: { gt: newStartAt },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
      },
    })
    const conflicting = overlapping.find((apt) => isValidStoredAppointmentWindow(apt.startAt, apt.endAt))

    if (conflicting) {
      throw new Error('Staff member already has an appointment at this time')
    }
  }

  // Update services first if changed
  let totalPrice: number = Number(existingAppointment.totalPrice)
  if (validated.serviceIds && validated.serviceIds.length > 0) {
    // Delete existing appointment services
    await db.appointmentService.deleteMany({
      where: { appointmentId: validated.id },
    })

    const uniqueServiceIds = [...new Set(validated.serviceIds)]
    const services = await db.service.findMany({
      where: {
        AND: [
          { id: { in: uniqueServiceIds } },
          whereServicesForBusiness(getSessionStaffId(session)),
          { isActive: true },
          { isArchived: false },
        ],
      },
    })
    if (services.length !== uniqueServiceIds.length) {
      throw new Error('Selected services are invalid or unavailable')
    }
    const serviceById = new Map(services.map((s) => [s.id, s]))

    totalPrice = validated.serviceIds!.reduce((sum, id) => {
      const s = serviceById.get(id)!
      return sum + Number(s.price)
    }, 0)

    await db.appointmentService.createMany({
      data: validated.serviceIds!.map((id) => {
        const s = serviceById.get(id)!
        return {
          appointmentId: validated.id,
          serviceId: s.id,
          priceAtTime: s.price,
          durationAtTime: s.durationMinutes,
        }
      }),
    })
  }

  // Update appointment - always include all provided fields
  const updateData: any = {}
  if (validated.clientId !== undefined) updateData.clientId = validated.clientId
  if (validated.staffId !== undefined) updateData.staffId = validated.staffId
  if (validated.startAt !== undefined) updateData.startAt = new Date(validated.startAt)
  if (validated.endAt !== undefined) updateData.endAt = new Date(validated.endAt)
  if (validated.status !== undefined) updateData.status = validated.status
  if (validated.notes !== undefined) updateData.notes = validated.notes
  if (validated.serviceIds && validated.serviceIds.length > 0) {
    updateData.totalPrice = totalPrice
  }

  const appointment = await db.appointment.update({
    where: { id: validated.id },
    data: updateData,
    include: {
      client: {
        include: {
          loyaltyAccount: true,
        },
      },
      appointmentServices: { include: appointmentServiceIncludeWithPipeline },
    },
  })

  revalidatePath('/app/calendar')
  revalidatePath('/app/dashboard')
  revalidatePath(`/app/clients/${appointment.clientId}`)

  const withPipeline = await attachPipelineToAppointmentServices(appointment)

  // Convert Decimal to number for serialization
  return {
    ...withPipeline,
    totalPrice: withPipeline.totalPrice ? Number(withPipeline.totalPrice) : null,
    appointmentServices: withPipeline.appointmentServices.map((as: any) => ({
      ...as,
      priceAtTime: as.priceAtTime ? Number(as.priceAtTime) : null,
      service: as.service
        ? {
            ...as.service,
            price: as.service.price ? Number(as.service.price) : null,
          }
        : null,
    })),
  }
}
