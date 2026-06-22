import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import path from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 12 * 1024 * 1024 // 12 MB per file

function safeStoredName(originalName: string): string {
  const ext = path.extname(originalName || '').slice(0, 16)
  const cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '')
  return `${randomUUID()}${cleanExt}`
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 12 MB)' }, { status: 400 })
    }

    const originalName =
      typeof (file as File).name === 'string' ? (file as File).name : 'upload'
    const stored = safeStoredName(originalName)

    // Object storage — serverless filesystem is read-only in production.
    const blob = await put(`bookme/${stored}`, file, {
      access: 'public',
      contentType: (file as File).type || undefined,
    })

    return NextResponse.json({ url: blob.url, originalName })
  } catch (e: any) {
    console.error('upload/payment-attachment', e)
    return NextResponse.json(
      { error: e?.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
