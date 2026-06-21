'use server'

import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { sendEmail, passwordResetEmail } from '@/lib/email'

const signupSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  district: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function createAccount(data: z.infer<typeof signupSchema>) {
  const validated = signupSchema.parse(data)

  if (!(db as { pendingAccountRequest?: unknown }).pendingAccountRequest) {
    throw new Error(
      'Account signup is not fully set up yet. Please ask the administrator to run: npx prisma db push && npx prisma generate, then restart the server.'
    )
  }

  const existingUser = await db.user.findUnique({
    where: { email: validated.email },
  })
  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  const existingRequest = await db.pendingAccountRequest.findUnique({
    where: { email: validated.email },
  })
  if (existingRequest) {
    throw new Error('An account request with this email is already pending. Please wait for approval.')
  }

  const passwordHash = await bcrypt.hash(validated.password, 10)

  await db.pendingAccountRequest.create({
    data: {
      email: validated.email,
      passwordHash,
      businessName: validated.businessName,
      district: validated.district || null,
      firstName: validated.firstName,
      lastName: validated.lastName,
      phone: validated.phone || null,
    },
  })

  revalidatePath('/api/notifications')
  revalidatePath('/api/pending-account-requests')

  return { success: true, pending: true }
}

export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({
    where: { email },
  })

  if (!user) {
    // Don't reveal if user exists for security
    return { success: true }
  }

  // Generate reset token
  const token = randomBytes(32).toString('hex')
  const expires = new Date()
  expires.setHours(expires.getHours() + 1) // Token expires in 1 hour

  // Delete any existing tokens for this user
  await db.passwordResetToken.deleteMany({
    where: { userId: user.id },
  })

  // Create new token
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expires,
    },
  })

  // In production, send email with reset link
  // For development, we'll log the URL (in production, send via email)
  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3009'}/reset-password?token=${token}`

  // Send the reset link by email (falls back to console log if no API key).
  const { subject, html } = passwordResetEmail(resetUrl)
  const { sent } = await sendEmail({ to: user.email, subject, html })

  // Only return the URL to the client in development, never in production.
  if (process.env.NODE_ENV !== 'production') {
    return { success: true, resetUrl }
  }
  return { success: true, sent }
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  // Find token
  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken || resetToken.expires < new Date()) {
    throw new Error('Invalid or expired reset token')
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10)

  // Update user password
  await db.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  })

  // Delete used token
  await db.passwordResetToken.delete({
    where: { id: resetToken.id },
  })

  return { success: true }
}
