import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/** Owner id plus team member ids — appointments may reference any of these. */
export async function getAppointmentStaffIdsForBusiness(ownerStaffId: string): Promise<string[]> {
  const members = await db.user.findMany({
    where: { ownerUserId: ownerStaffId },
    select: { id: true },
  })
  return [ownerStaffId, ...members.map((m) => m.id)]
}

/**
 * Clients belong to one business tenant (`staffId` = owner id), or legacy rows with null `staffId`
 * that only appear if they have an appointment with this business (or a team member).
 */
export async function tenantClientWhereClause(ownerStaffId: string): Promise<Prisma.ClientWhereInput> {
  const ids = await getAppointmentStaffIdsForBusiness(ownerStaffId)
  return {
    OR: [
      { staffId: ownerStaffId },
      {
        AND: [
          { staffId: { equals: null } },
          { appointments: { some: { staffId: { in: ids } } } },
        ],
      },
    ],
  }
}
