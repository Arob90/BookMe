import { NextResponse } from 'next/server'
import { getNotifications } from '@/app/actions/notifications'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const notifications = await getNotifications()
    return NextResponse.json({ notifications })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
