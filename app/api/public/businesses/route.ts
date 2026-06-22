import { getPublicBusinesses } from '@/app/actions/public-booking'
import { NextResponse } from 'next/server'

// Always reflect the current DB — a deleted/added business should show
// immediately, not linger in an edge cache for minutes.
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** User-facing message; avoid leaking full Prisma internals in the JSON body. */
function publicBusinessesErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  if (
    /Can't reach database server|P1001|P1000|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(raw) ||
    raw.toLowerCase().includes('connection')
  ) {
    return (
      'Cannot connect to the database. Check DATABASE_URL in .env. ' +
      'If you use Neon, open the Neon dashboard to ensure the project is active and copy a fresh connection string (use sslmode=require).'
    )
  }
  return raw.length > 280 ? 'Failed to load businesses.' : raw
}

export async function GET() {
  try {
    const businesses = await getPublicBusinesses()
    return NextResponse.json(
      { businesses },
      {
        headers: {
          // No caching: the public list must always reflect the live DB so
          // deleted businesses disappear and new signups appear immediately.
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    )
  } catch (error: unknown) {
    console.error('Error fetching businesses:', error)
    return NextResponse.json(
      { error: publicBusinessesErrorMessage(error) },
      { status: 500 }
    )
  }
}
