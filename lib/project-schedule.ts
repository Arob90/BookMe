import { formatDuration, type DurationUnit } from '@/lib/utils'

export function getEstimatedDueFromBooking(project: {
  appointmentService?: {
    durationAtTime?: number | null
    appointment?: { startAt?: Date | string } | null
    service?: { durationUnit?: string | null } | null
  } | null
}): { startAt: Date; estimatedDue: Date; durationLabel: string } | null {
  const as = project.appointmentService
  if (!as?.appointment?.startAt) return null
  const mins = Number(as.durationAtTime)
  if (!Number.isFinite(mins) || mins <= 0) return null
  const startAt = new Date(as.appointment.startAt)
  if (Number.isNaN(startAt.getTime())) return null
  const unit = as.service?.durationUnit ?? 'MINUTES'
  return {
    startAt,
    estimatedDue: new Date(startAt.getTime() + mins * 60_000),
    durationLabel: formatDuration(mins, unit as DurationUnit),
  }
}

/** Booking line wins; otherwise optional manual plan on the project. */
export function getProjectScheduleDisplay(project: {
  appointmentService?: {
    durationAtTime?: number
    appointment?: { startAt?: Date | string } | null
    service?: { durationUnit?: string | null } | null
  } | null
  plannedDurationMinutes?: number | null
  plannedDurationUnit?: string | null
  estimatedDueAt?: Date | string | null
}): {
  source: 'booking' | 'manual' | null
  startAt: Date | null
  durationLabel: string | null
  dueAt: Date | null
} {
  const booking = getEstimatedDueFromBooking(project)
  if (booking) {
    return {
      source: 'booking',
      startAt: booking.startAt,
      durationLabel: booking.durationLabel,
      dueAt: booking.estimatedDue,
    }
  }

  const pm =
    project.plannedDurationMinutes != null ? Number(project.plannedDurationMinutes) : NaN
  const unit = (project.plannedDurationUnit || 'MINUTES') as DurationUnit
  const durationLabel =
    Number.isFinite(pm) && pm > 0 ? formatDuration(pm, unit) : null

  let dueAt: Date | null = null
  if (project.estimatedDueAt) {
    const d =
      typeof project.estimatedDueAt === 'string'
        ? new Date(project.estimatedDueAt)
        : project.estimatedDueAt
    if (!Number.isNaN(d.getTime())) dueAt = d
  }

  if (!durationLabel && !dueAt) {
    return { source: null, startAt: null, durationLabel: null, dueAt: null }
  }
  return { source: 'manual', startAt: null, durationLabel, dueAt }
}
