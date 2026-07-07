import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import { logUploadFailure, logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      logUploadFailure({ reason: 'no_file', userId: session.user.id })
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Allowlist upload type to prevent path traversal (e.g. type: "../../../etc")
    const ALLOWED_UPLOAD_TYPES = ['services', 'profile', 'inventory', 'clients', 'support'] as const
    const rawType = (formData.get('type') as string) || 'services'
    const uploadType = ALLOWED_UPLOAD_TYPES.includes(rawType as any) ? rawType : 'services'
    // Support attachments (screenshots/files) may be any format; everything else is image-only.
    const isSupport = uploadType === 'support'

    if (!isSupport && !file.type.startsWith('image/')) {
      logUploadFailure({ reason: 'invalid_type', userId: session.user.id, type: file.type })
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const maxSize = (isSupport ? 15 : 5) * 1024 * 1024
    if (file.size > maxSize) {
      logUploadFailure({ reason: 'file_too_large', userId: session.user.id })
      return NextResponse.json({ error: `File size must be less than ${isSupport ? 15 : 5}MB` }, { status: 400 })
    }

    // Extension: known image MIME → safe ext; otherwise derive a sanitized ext from the filename.
    const safeExtensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    }
    const nameExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
    const extension = safeExtensions[file.type] ?? (isSupport && nameExt ? nameExt : 'bin')
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const filename = `${timestamp}-${randomString}.${extension}`

    // Store in Vercel Blob (object storage) — the serverless filesystem is
    // read-only in production, so local writes silently failed before.
    const blob = await put(`${uploadType}/${filename}`, file, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error: any) {
    logError({ message: 'Upload failed', error, category: 'upload' })
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
