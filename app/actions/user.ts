'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const updateProfileSchema = z.object({
  userName: z.string().optional(),
  businessName: z.string().optional(),
  district: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  birthday: z.string().optional(),
  address: z.string().optional(),
  profilePhoto: z.string().optional(),
})

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function getUserProfile() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  try {
    // Get user with all profile fields in one query
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        userName: true,
        businessName: true,
        district: true,
        firstName: true,
        lastName: true,
        phone: true,
        birthday: true,
        address: true,
        profilePhoto: true,
      },
    })

    if (!user) throw new Error('User not found')

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      userName: user.userName || null,
      businessName: user.businessName || null,
      district: user.district || null,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      phone: user.phone || null,
      birthday: user.birthday || null,
      address: user.address || null,
      profilePhoto: user.profilePhoto || null,
    }
  } catch (error: any) {
    // If businessName field doesn't exist in Prisma client (not regenerated yet)
    if (error.message?.includes('Unknown field') && error.message?.includes('businessName')) {
      // Try without businessName
      try {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            email: true,
            role: true,
            userName: true,
            firstName: true,
            lastName: true,
            phone: true,
            birthday: true,
            address: true,
            profilePhoto: true,
          },
        })
        if (!user) throw new Error('User not found')

        // Try to fetch businessName via raw SQL
        let businessName: string | null = null
        try {
          const result = await db.$queryRaw<Array<{ business_name: string | null }>>`
            SELECT business_name FROM users WHERE id = ${session.user.id}
          `
          if (result && result.length > 0) {
            businessName = result[0].business_name
          }
        } catch (rawError: any) {
          // If column doesn't exist, that's okay
          console.log('Could not fetch businessName via raw SQL:', rawError.message)
        }

        return {
          ...user,
          businessName: businessName,
          district: null,
        }
      } catch (innerError: any) {
        // If other columns don't exist, return basic info
        if (innerError.message?.includes('Unknown column') || innerError.code === 'P2021' || innerError.code === 'P2009') {
          const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
              id: true,
              email: true,
              role: true,
            },
          })
          if (!user) throw new Error('User not found')
          return {
            ...user,
            userName: null,
            businessName: null,
            district: null,
            firstName: null,
            lastName: null,
            phone: null,
            birthday: null,
            address: null,
            profilePhoto: null,
          }
        }
        throw innerError
      }
    }
    // If columns don't exist (migration not run), try to get basic info
    if (error.message?.includes('Unknown column') || error.code === 'P2021' || error.code === 'P2009') {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          role: true,
        },
      })
      if (!user) throw new Error('User not found')
      return {
        ...user,
        userName: null,
        businessName: null,
        district: null,
        firstName: null,
        lastName: null,
        phone: null,
        birthday: null,
        address: null,
        profilePhoto: null,
      }
    }
    throw error
  }
}

export async function updateUserProfile(data: z.infer<typeof updateProfileSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = updateProfileSchema.parse(data)

  // Check if email is being changed and if it's already taken
  if (validated.email && validated.email !== session.user.email) {
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    })
    if (existingUser) {
      throw new Error('Email already in use')
    }
  }

  const updateData: any = {}

  // Only update email - always safe
  if (validated.email !== undefined) updateData.email = validated.email

  // Try to update profile fields, but handle gracefully if columns don't exist
  try {
    if (validated.userName !== undefined) updateData.userName = validated.userName || null
    if (validated.businessName !== undefined) updateData.businessName = validated.businessName || null
    if (validated.district !== undefined) updateData.district = validated.district || null
    if (validated.firstName !== undefined) updateData.firstName = validated.firstName || null
    if (validated.lastName !== undefined) updateData.lastName = validated.lastName || null
    if (validated.phone !== undefined) updateData.phone = validated.phone || null
    if (validated.birthday !== undefined) {
      updateData.birthday = validated.birthday ? new Date(validated.birthday) : null
    }
    if (validated.address !== undefined) updateData.address = validated.address || null
    if (validated.profilePhoto !== undefined) updateData.profilePhoto = validated.profilePhoto || null

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        userName: true,
        businessName: true,
        district: true,
        firstName: true,
        lastName: true,
        phone: true,
        birthday: true,
        address: true,
        profilePhoto: true,
        role: true,
      },
    })

    revalidatePath('/app')
    return user
  } catch (error: any) {
    // If businessName field doesn't exist in Prisma client (not regenerated yet)
    if (error.message?.includes('Unknown argument') && error.message?.includes('businessName')) {
      // Remove businessName from updateData and try again
      const updateDataWithoutBusinessName: any = { ...updateData }
      const businessNameValue = validated.businessName
      delete updateDataWithoutBusinessName.businessName

      try {
        // First, try to save businessName using raw SQL if it exists in the database
        if (businessNameValue !== undefined && businessNameValue !== null) {
          try {
            await db.$executeRaw`
              UPDATE users 
              SET business_name = ${businessNameValue === '' ? null : businessNameValue}
              WHERE id = ${session.user.id}
            `
          } catch (rawError: any) {
            // If raw SQL fails (column doesn't exist), that's okay - we'll just skip it
            console.log('Could not update businessName via raw SQL:', rawError.message)
          }
        }

        // Then update other fields normally
        const user = await db.user.update({
          where: { id: session.user.id },
          data: updateDataWithoutBusinessName,
          select: {
            id: true,
            email: true,
            userName: true,
            firstName: true,
            lastName: true,
            phone: true,
            birthday: true,
            address: true,
            profilePhoto: true,
            role: true,
          },
        })
        revalidatePath('/app')
        // Return user with businessName from validated data
        return {
          ...user,
          businessName: businessNameValue || null,
        } as any
      } catch (innerError: any) {
        // If other fields also fail, check if it's another unknown argument error
        if (innerError.message?.includes('Unknown argument')) {
          // Try with only basic fields
          const basicUpdateData: any = {}
          if (validated.email !== undefined) basicUpdateData.email = validated.email

          // Still try to save businessName via raw SQL
          if (businessNameValue !== undefined && businessNameValue !== null) {
            try {
              await db.$executeRaw`
                UPDATE users 
                SET business_name = ${businessNameValue === '' ? null : businessNameValue}
                WHERE id = ${session.user.id}
              `
            } catch (rawError: any) {
              console.log('Could not update businessName via raw SQL:', rawError.message)
            }
          }

          const user = await db.user.update({
            where: { id: session.user.id },
            data: basicUpdateData,
            select: {
              id: true,
              email: true,
              role: true,
            },
          })
          revalidatePath('/app')
          return {
            ...user,
            userName: validated.userName || null,
            businessName: businessNameValue || null,
            firstName: validated.firstName || null,
            lastName: validated.lastName || null,
            phone: validated.phone || null,
            birthday: validated.birthday || null,
            address: validated.address || null,
            profilePhoto: validated.profilePhoto || null,
          } as any
        }
        // If other fields also fail, fall through to next error handler
        throw innerError
      }
    }
    // If columns don't exist, only update email
    if (error.message?.includes('Unknown column') || error.message?.includes('Unknown argument') || error.code === 'P2021' || error.code === 'P2009') {
      if (validated.email !== undefined) {
        const user = await db.user.update({
          where: { id: session.user.id },
          data: { email: validated.email },
          select: {
            id: true,
            email: true,
            role: true,
          },
        })
        revalidatePath('/app')
        return {
          ...user,
          userName: null,
          businessName: null,
          firstName: null,
          lastName: null,
          phone: null,
          birthday: null,
          address: null,
          profilePhoto: null,
        }
      }
      throw new Error('Profile fields not available. Please run database migration first.')
    }
    throw error
  }
}

export async function updateUserPassword(data: z.infer<typeof updatePasswordSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = updatePasswordSchema.parse(data)

  // Get current user to verify current password
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) throw new Error('User not found')

  // Verify current password
  const isValid = await bcrypt.compare(validated.currentPassword, user.passwordHash)
  if (!isValid) {
    throw new Error('Current password is incorrect')
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(validated.newPassword, 10)

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  })

  revalidatePath('/app')
  return { success: true }
}
