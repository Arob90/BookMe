import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Authenticated: a logged-in business owner (on a trial / choosing a plan) uploads
 * proof of payment for a plan upgrade. Records it on their Settings so the admin
 * can verify and activate the plan. Accepts any file type up to 10MB.
 */
export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as any
    const ownerId: string = session?.user?.businessStaffId || session?.user?.id || ''
    if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const plan = ((formData.get('plan') as string) || '').slice(0, 40)

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const blob = await put(`upgrade-proofs/${ownerId}-${Date.now()}.${ext}`, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    })

    await db.settings.updateMany({
      where: { staffId: ownerId },
      data: {
        requestedPlan: plan || null,
        planPaymentProofUrl: blob.url,
        planPaymentStatus: 'submitted',
        planPaymentSubmittedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (error: unknown) {
    console.error('upgrade-payment-proof failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
