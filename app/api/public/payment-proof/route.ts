import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Public endpoint: a newly-signed-up business uploads proof of payment for their
 * pending account request. No auth (the account isn't active yet); the request id
 * acts as the claim. Accepts any file format up to 10MB.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const requestId = (formData.get('requestId') as string) || ''

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!requestId) return NextResponse.json({ error: 'Missing request reference' }, { status: 400 })

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    // The request must exist (and not already be a live account).
    const pending = await db.pendingAccountRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    })
    if (!pending) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
    }

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
    const safeName = `payment-proofs/${requestId}-${Date.now()}.${ext}`

    const blob = await put(safeName, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    })

    await db.pendingAccountRequest.update({
      where: { id: requestId },
      data: {
        paymentProofUrl: blob.url,
        paymentStatus: 'submitted',
        paymentSubmittedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (error: unknown) {
    console.error('payment-proof upload failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
