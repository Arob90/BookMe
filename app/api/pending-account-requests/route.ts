import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/authz'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
      return NextResponse.json({ visible: false, requests: [] })
    }

    const requests = await db.pendingAccountRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        businessName: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      visible: true,
      requests: requests.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (error: unknown) {
    console.error('pending-account-requests GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load' },
      { status: 500 }
    )
  }
}
