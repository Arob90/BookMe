import { lookupClientByClientId } from '@/app/actions/public-booking'
import { generateClientId } from '@/lib/utils'
import { tenantClientWhereClause } from '@/lib/client-tenant'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const businessId = searchParams.get('businessId')

    if (!clientId || !businessId) {
      return NextResponse.json(
        { error: 'Client ID and Business ID are required' },
        { status: 400 }
      )
    }

    const client = await lookupClientByClientId(clientId, businessId)
    
    if (!client) {
      return NextResponse.json({ client: null })
    }

    const tenantWhere = await tenantClientWhereClause(businessId)
    const allClients = await db.client.findMany({
      where: tenantWhere,
      select: {
        id: true,
        type: true,
        firstName: true,
        lastName: true,
        birthday: true,
        companyFoundedAt: true,
      },
    })

    const generatedClientId = generateClientId(
      client.firstName,
      client.lastName,
      client.birthday,
      allClients,
      client.id,
      { type: client.type, companyFoundedAt: client.companyFoundedAt }
    )

    // Public response: only fields needed for booking (no notes, tags, or internal data)
    return NextResponse.json({
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        birthday: client.birthday,
        clientId: generatedClientId,
      },
    })
  } catch (error: any) {
    console.error('Error looking up client:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to lookup client' },
      { status: 500 }
    )
  }
}
