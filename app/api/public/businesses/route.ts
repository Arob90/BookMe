import { getPublicBusinesses } from '@/app/actions/public-booking'
import { NextResponse } from 'next/server'

export const revalidate = 60

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
          // Helps the browser reuse results on quick back/forward/refresh,
          // and allows edge/CDN caching in production.
          'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
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
