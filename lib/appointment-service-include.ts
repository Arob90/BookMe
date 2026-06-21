/**
 * Prisma nested include for booked service lines.
 * Pipeline cards are merged in app code via `attachPipelineToAppointmentServices` /
 * `attachPipelineToAppointmentsList` (queries `Project.appointmentServiceId`) so the
 * client works even when Prisma Client is out of sync with the `pipelineProject` relation.
 */
export const appointmentServiceIncludeWithPipeline = {
  service: true,
}
