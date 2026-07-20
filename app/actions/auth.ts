'use server'

import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { sendEmail, passwordResetEmail } from '@/lib/email'
import { ensureOwnerDefaultClients } from '@/lib/owner-default-clients'
import { enqueueWelcomeAnnouncement } from '@/lib/announcements'
import { BillingHistoryEventType, recordBillingHistoryEvent } from '@/lib/billing-history'

/** Self-serve signups start on a single-user seat plan; upgrade later from Billing. */
const SELF_SERVE_MAX_USERS = 1

const signupSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  businessCategory: z.string().optional(),
  district: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function createAccount(data: z.infer<typeof signupSchema>) {
  const validated = signupSchema.parse(data)

  const existingUser = await db.user.findUnique({
    where: { email: validated.email },
  })
  if (existingUser) {
    throw new Error('User with this email already exists')
  }

  const passwordHash = await bcrypt.hash(validated.password, 10)

  const user = await db.user.create({
    data: {
      email: validated.email,
      passwordHash,
      role: 'ADMIN',
      businessName: validated.businessName,
      businessCategory: validated.businessCategory || null,
      district: validated.district || null,
      firstName: validated.firstName,
      lastName: validated.lastName,
      phone: validated.phone || null,
    },
  })

  const defaultBusinessHours = {
    MONDAY: { start: '09:00', end: '18:00' },
    TUESDAY: { start: '09:00', end: '18:00' },
    WEDNESDAY: { start: '09:00', end: '18:00' },
    THURSDAY: { start: '09:00', end: '18:00' },
    FRIDAY: { start: '09:00', end: '18:00' },
    SATURDAY: { start: '09:00', end: '18:00' },
    SUNDAY: { start: '09:00', end: '18:00' },
  }
  await db.settings.create({
    data: {
      staffId: user.id,
      maxUsers: SELF_SERVE_MAX_USERS,
      businessHours: defaultBusinessHours,
      businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
      // Start the 14-day free trial immediately. Account locks after this unless
      // the owner picks a plan (which sets planStatus = 'active').
      planStatus: 'trialing',
      trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
    },
  })

  await ensureOwnerDefaultClients({
    staffId: user.id,
    firstName: validated.firstName,
    lastName: validated.lastName,
    email: validated.email,
    phone: validated.phone,
    businessName: validated.businessName,
  })

  await enqueueWelcomeAnnouncement(user.id)

  await recordBillingHistoryEvent({
    staffId: user.id,
    eventType: BillingHistoryEventType.ACCOUNT_CREATED,
    title: 'Account created',
    detail: `Self-serve signup with initial ${SELF_SERVE_MAX_USERS}-seat plan.`,
    metadata: { maxUsers: SELF_SERVE_MAX_USERS },
    actorUserId: null,
  })

  revalidatePath('/app/accounts')
  revalidatePath('/app')

  return { success: true, pending: false, firstName: validated.firstName }
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
