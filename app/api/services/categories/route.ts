import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (name) {
      // Find category by name (case-insensitive)
      const category = await db.serviceCategory.findFirst({
        where: {
          OR: [
            {
              name: {
                equals: name.trim(),
                mode: 'insensitive',
              },
              staffId: getSessionStaffId(session),
            },
            {
              name: {
                equals: name.trim(),
                mode: 'insensitive',
              },
              staffId: null,
            },
          ],
        },
      })

      if (category) {
        // If it has null staffId, update it to belong to this business
        if (!category.staffId) {
          try {
            await db.serviceCategory.update({
              where: { id: category.id },
              data: { staffId: getSessionStaffId(session) },
            })
          } catch (updateError) {
            // Silently fail
          }
        }
        return NextResponse.json({ category })
      }

      return NextResponse.json({ category: null })
    }

    // If no name provided, return all categories for this business
    const categories = await db.serviceCategory.findMany({
      where: {
        OR: [
          { staffId: getSessionStaffId(session) },
          { staffId: null },
        ],
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ categories })
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
