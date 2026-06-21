/**
 * Stale `node_modules/.prisma/client` (e.g. generate failed with EPERM) may not include
 * `ownerUserId` even when `schema.prisma` does. Detect that Prisma validation error.
 */
export function isPrismaOwnerUserIdUnsupportedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  if (!msg.includes('ownerUserId')) return false
  return (
    msg.includes('Unknown argument') ||
    msg.includes('Unknown field') ||
    msg.includes('Invalid `prisma.') ||
    msg.includes('Invalid prisma.')
  )
}

export const TEAM_PRISMA_SETUP_HINT =
  'Stop the dev server, then run: npx prisma db push && npx prisma generate'

/** Unknown field/argument in Prisma (stale client vs schema). */
export function isPrismaUnsupportedFieldError(error: unknown, field: string): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  if (!msg.includes(field)) return false
  return (
    msg.includes('Unknown argument') ||
    msg.includes('Unknown field') ||
    msg.includes('Invalid `prisma.') ||
    msg.includes('Invalid prisma.')
  )
}
