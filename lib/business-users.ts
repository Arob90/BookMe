import { db } from '@/lib/db'
import { isPrismaOwnerUserIdUnsupportedError } from '@/lib/prisma-owner-support'

/** Owner + team logins for calendar / staff pickers (same business tenant). */
export async function getUsersForBusinessStaffId(businessStaffId: string) {
  try {
    const rows = await db.user.findMany({
      where: {
        OR: [{ id: businessStaffId }, { ownerUserId: businessStaffId }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userName: true,
        role: true,
        ownerUserId: true,
      },
    })
    rows.sort((a, b) => {
      if (a.id === businessStaffId) return -1
      if (b.id === businessStaffId) return 1
      return 0
    })
    return rows
  } catch (e) {
    if (!isPrismaOwnerUserIdUnsupportedError(e)) throw e
    const u = await db.user.findUnique({
      where: { id: businessStaffId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userName: true,
        role: true,
      },
    })
    return u ? [u] : []
  }
}
