import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
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

    if (!file.type.startsWith('image/')) {
      logUploadFailure({ reason: 'invalid_type', userId: session.user.id, type: file.type })
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      logUploadFailure({ reason: 'file_too_large', userId: session.user.id })
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Allowlist upload type to prevent path traversal (e.g. type: "../../../etc")
    const ALLOWED_UPLOAD_TYPES = ['services', 'profile', 'inventory', 'clients'] as const
    const rawType = (formData.get('type') as string) || 'services'
    const uploadType = ALLOWED_UPLOAD_TYPES.includes(rawType as any) ? rawType : 'services'

    // Allowlist extension by MIME (we already checked image/*) and safe extension
    const safeExtensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    }
    const extension = safeExtensions[file.type] ?? 'jpg'
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const filename = `${timestamp}-${randomString}.${extension}`

    const uploadsDir = join(process.cwd(), 'public', 'uploads', uploadType)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    const url = `/uploads/${uploadType}/${filename}`
    return NextResponse.json({ url })
  } catch (error: any) {
    logError({ message: 'Upload failed', error, category: 'upload' })
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
