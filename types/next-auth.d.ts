import { UserRole } from '@prisma/client'
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: UserRole
      /** Owner's user id for business data; same as `id` for account owners. */
      businessStaffId: string
      /** Per-staff rights JSON (null = full access). Owners/admins always have all. */
      staffRights?: unknown
    }
  }

  interface User {
    id: string
    email: string
    role: UserRole
    staffRights?: unknown
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    staffRights?: unknown
  }
}
