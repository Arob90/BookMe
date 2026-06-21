import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId || userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Try to get user with new fields, but handle gracefully if they don't exist yet
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          profilePhoto: true,
          userName: true,
          firstName: true,
          lastName: true,
        },
      })

      return NextResponse.json({
        email: user?.email || null,
        profilePhoto: user?.profilePhoto || null,
        userName: user?.userName || null,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
      })
    } catch (error: any) {
      // If columns don't exist yet (migration not run), return empty
      if (error.message?.includes('Unknown column') || error.code === 'P2021') {
        // Still try to get email even if other fields don't exist
        try {
          const user = await db.user.findUnique({
            where: { id: userId },
            select: {
              email: true,
            },
          })
          return NextResponse.json({
            email: user?.email || null,
            profilePhoto: null,
            userName: null,
            firstName: null,
            lastName: null,
          })
        } catch {
          return NextResponse.json({
            email: null,
            profilePhoto: null,
            userName: null,
            firstName: null,
            lastName: null,
          })
        }
      }
      throw error
    }
  } catch (error: any) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
