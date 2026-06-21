import { db } from '@/lib/db'
import { getAppointmentStaffIdsForBusiness } from '@/lib/client-tenant'

/** Ensures the appointment belongs to the same business (owner or team staff). */
export async function assertAppointmentInTenant(appointmentId: string, businessStaffId: string) {
  const allowed = await getAppointmentStaffIdsForBusiness(businessStaffId)
  const apt = await db.appointment.findFirst({
    where: { id: appointmentId, staffId: { in: [...allowed] } },
    select: { id: true },
  })
  if (!apt) throw new Error('Appointment not found or not in your business')
}
