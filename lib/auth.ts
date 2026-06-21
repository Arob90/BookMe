import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from './db'
import bcrypt from 'bcryptjs'
import { logAuthFailure, logAuthSuccess } from './logger'

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                try {
                    // Add timeout to prevent hanging
                    const user = await Promise.race([
                        db.user.findUnique({
                            where: { email: credentials.email },
                        }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Database timeout')), 10000)
                        )
                    ]) as any

                    if (!user) {
                        logAuthFailure({ reason: 'user_not_found', email: credentials.email })
                        return null
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

                    if (!isValid) {
                        logAuthFailure({ reason: 'invalid_password', email: credentials.email })
                        return null
                    }

                    if (user.isPaused === true) {
                        logAuthFailure({ reason: 'account_paused', email: credentials.email })
                        return null
                    }

                    // Tenant safety: a STAFF login must be linked to exactly one owner business.
                    // If owner_user_id is wrong/missing, it can leak another business's data.
                    if (user.role === 'STAFF') {
                        const ownerId = user.ownerUserId
                        if (!ownerId) {
                            logAuthFailure({ reason: 'staff_missing_owner_link', email: credentials.email })
                            return null
                        }
                        const owner = await db.user.findUnique({
                            where: { id: ownerId },
                            select: {
                                id: true,
                                ownerUserId: true,
                                businessName: true,
                                district: true,
                                isPaused: true,
                            },
                        })
                        if (!owner || owner.ownerUserId != null) {
                            logAuthFailure({ reason: 'staff_invalid_owner_link', email: credentials.email })
                            return null
                        }
                        if (owner.isPaused === true) {
                            logAuthFailure({ reason: 'owner_account_paused', email: credentials.email })
                            return null
                        }
                        // Extra guard: staff row should carry the same business metadata as the owner.
                        if (user.businessName !== owner.businessName || user.district !== owner.district) {
                            logAuthFailure({ reason: 'staff_owner_mismatch', email: credentials.email })
                            return null
                        }
                    }

                    logAuthSuccess({ userId: user.id, email: user.email })
                    return {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                    }
                } catch (error: unknown) {
                    const msg = error instanceof Error ? error.message : String(error)
                    logAuthFailure({
                        reason: msg ? `database_error: ${msg}` : 'database_error',
                        email: credentials.email,
                    })
                    return null
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user) {
                token.id = user.id
                token.email = user.email
                token.role = user.role
            }
            // If session is being updated, fetch latest email from database
            if (trigger === 'update' && token.id) {
                try {
                    const dbUser = await db.user.findUnique({
                        where: { id: token.id as string },
                        select: { email: true },
                    })
                    if (dbUser) {
                        token.email = dbUser.email
                    }
                } catch (error) {
                    // Silently fail - keep existing email
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
                session.user.role = token.role as 'ADMIN' | 'STAFF'
                try {
                    const dbUser = await db.user.findUnique({
                        where: { id: token.id as string },
                        select: { email: true, ownerUserId: true },
                    })
                    if (dbUser) {
                        session.user.email = dbUser.email
                        session.user.businessStaffId = dbUser.ownerUserId ?? (token.id as string)
                    } else {
                        session.user.email = (token.email as string) || session.user.email
                        session.user.businessStaffId = token.id as string
                    }
                } catch (error) {
                    session.user.email = (token.email as string) || session.user.email
                    session.user.businessStaffId = token.id as string
                }
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
}
