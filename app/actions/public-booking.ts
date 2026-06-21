'use server'

import { db } from '@/lib/db'
import { z } from 'zod'
import { getServices } from './services'
import { whereServicesForBusiness, isSortOrderUnavailableError } from '@/lib/service-ownership'
import { generateClientId, getClientIdDateSortKey, getClientIdYearSegment } from '@/lib/utils'
import { getPublicHolidaysForStaff } from '@/lib/public-holidays'
import {
  computeEffectiveSlotWindow,
  getClockMinutesInTimezone,
  getYmdInTimezone,
  normalizeBusinessHoursFromSettings,
  parseHHMMToMinutes,
} from '@/lib/booking-effective-hours'
import { tenantClientWhereClause } from '@/lib/client-tenant'

type PublicBusiness = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  district: string | null
  profilePhoto: string | null
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

const formatHour = (time?: string) => {
  if (!time || !time.includes(':')) return null
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

const timeToMinutes = (time?: string) => {
  if (!time || !time.includes(':')) return null
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

async function withBusinessAvailability(businesses: PublicBusiness[]) {
  if (!businesses.length) return businesses

  const settings = await db.settings.findMany({
    where: { staffId: { in: businesses.map((b) => b.id) } },
    select: { staffId: true, businessHours: true, businessDays: true },
  })

  const settingsByStaff = new Map(settings.map((s) => [s.staffId, s]))
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const today = DAY_NAMES[now.getDay()]

  return businesses.map((business) => {
    const s = settingsByStaff.get(business.id)
    if (!s?.businessHours) {
      return { ...business, isOpenNow: null, todayHours: null }
    }

    const businessDays = Array.isArray(s.businessDays) ? s.businessDays : []
    const businessHours = s.businessHours as Record<string, { start?: string; end?: string } | undefined>
    const todayHours = businessHours[today]

    if (!todayHours?.start || !todayHours?.end) {
      return { ...business, isOpenNow: false, todayHours: 'Closed today' }
    }

    const openAt = timeToMinutes(todayHours.start)
    const closeAt = timeToMinutes(todayHours.end)
    const isOpenDay = businessDays.length === 0 ? true : businessDays.includes(today)
    const isOpenNow = isOpenDay && openAt !== null && closeAt !== null ? nowMinutes >= openAt && nowMinutes < closeAt : false
    const startLabel = formatHour(todayHours.start)
    const endLabel = formatHour(todayHours.end)

    return {
      ...business,
      isOpenNow,
      todayHours: startLabel && endLabel ? `${startLabel} - ${endLabel}` : 'Hours unavailable',
    }
  })
}

// Get all businesses (users) that clients can book with
export async function getPublicBusinesses() {
  try {
    const businesses = await db.user.findMany({
      where: {
        role: { in: ['ADMIN', 'STAFF'] },
        // One row per tenant: team logins have ownerUserId set; their data lives under the owner's id.
        ownerUserId: null,
      },
      select: {
        id: true,
        businessName: true,
        district: true,
        userName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        profilePhoto: true,
      },
      orderBy: {
        businessName: 'asc',
      },
    })

    const mappedBusinesses = businesses.map(business => ({
      id: business.id,
      name: business.businessName || business.userName || `${business.firstName || ''} ${business.lastName || ''}`.trim() || business.email,
      email: business.email,
      phone: business.phone,
      address: business.address || null,
      district: business.district || null,
      profilePhoto: business.profilePhoto || null,
    }))
    return await withBusinessAvailability(mappedBusinesses)
  } catch (error: any) {
    // If businessName field doesn't exist in Prisma client (not regenerated yet)
    if (error.message?.includes('Unknown field') || error.message?.includes('Unknown argument') || error.message?.includes('businessName')) {
      // Try without businessName in select and orderBy
      try {
        const businesses = await db.user.findMany({
          where: {
            role: { in: ['ADMIN', 'STAFF'] },
            ownerUserId: null,
          },
          select: {
            id: true,
            district: true,
            userName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            profilePhoto: true,
          },
          orderBy: {
            email: 'asc',
          },
        })

        const mappedBusinesses = businesses.map(business => ({
          id: business.id,
          name: business.userName || `${business.firstName || ''} ${business.lastName || ''}`.trim() || business.email,
          email: business.email,
          phone: business.phone,
          address: business.address || null,
          district: business.district || null,
          profilePhoto: business.profilePhoto || null,
        }))
        return await withBusinessAvailability(mappedBusinesses)
      } catch (innerError: any) {
        // If orderBy also fails, try without orderBy
        const businesses = await db.user.findMany({
          where: {
            role: { in: ['ADMIN', 'STAFF'] },
            ownerUserId: null,
          },
          select: {
            id: true,
            district: true,
            userName: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            profilePhoto: true,
          },
        })

        // Sort manually by email
        businesses.sort((a, b) => (a.email || '').localeCompare(b.email || ''))

        const mappedBusinesses = businesses.map(business => ({
          id: business.id,
          name: business.userName || `${business.firstName || ''} ${business.lastName || ''}`.trim() || business.email,
          email: business.email,
          phone: business.phone,
          address: business.address || null,
          district: business.district || null,
          profilePhoto: business.profilePhoto || null,
        }))
        return await withBusinessAvailability(mappedBusinesses)
      }
    }
    throw error
  }
}

// Get services for a specific business (public, no auth required)
export async function getBusinessServices(businessId: string) {
  // Fetch services for this specific business
  let services: any[] = []
  try {
    services = await db.service.findMany({
      where: {
        AND: [whereServicesForBusiness(businessId), { isArchived: false }],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { category: { name: 'asc' } }, { name: 'asc' }],
    })
  } catch (error: any) {
    // Some DBs/clients don't have category.sortOrder yet; fall back to name ordering.
    if (isSortOrderUnavailableError(error)) {
      services = await db.service.findMany({
        where: {
          AND: [whereServicesForBusiness(businessId), { isArchived: false }],
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      })
    } else {
      throw error
    }
  }

  // Public-facing shape only: no staffId, categoryId, or internal fields
  return services
    .filter(service => service.isActive && !service.isArchived)
    .map(service => ({
      id: service.id,
      name: service.name,
      description: service.description ?? null,
      imageUrl: service.imageUrl ?? null,
      durationMinutes: service.durationMinutes,
      durationUnit: service.durationUnit ?? 'MINUTES',
      price: service.price ? Number(service.price) : null,
      pointsWorth: service.pointsWorth ?? null,
      category: service.category
        ? {
            id: service.category.id,
            name: service.category.name,
            sortOrder: (service.category as any).sortOrder ?? 0,
          }
        : null,
    }))
}

// Lookup client by client ID
export async function lookupClientByClientId(clientId: string, businessId: string) {
  const owner = await db.user.findFirst({
    where: { id: businessId, ownerUserId: null },
    select: { id: true },
  })
  if (!owner) return null

  // Parse the client ID format: AR-1990-1
  const parts = clientId.split('-')
  if (parts.length !== 3) {
    return null
  }

  const [initials, birthYear, number] = parts
  if (initials.length !== 2 || birthYear.length !== 4 || isNaN(Number(birthYear)) || isNaN(Number(number))) {
    return null
  }

  const firstInitial = initials[0].toUpperCase()
  const lastInitial = initials[1].toUpperCase()
  const year = parseInt(birthYear)
  const num = parseInt(number)

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

  // Filter clients by initials and middle segment year (birth year or company founding year)
  const matchingClients = allClients.filter((client) => {
    const clientFirstInitial = client.firstName?.[0]?.toUpperCase() || ''
    const clientLastInitial = client.lastName?.[0]?.toUpperCase() || ''
    const segment = getClientIdYearSegment(client.type, client.birthday, client.companyFoundedAt)
    const clientYear = parseInt(segment, 10)
    const y = Number.isNaN(clientYear) ? 0 : clientYear

    return (
      clientFirstInitial === firstInitial &&
      clientLastInitial === lastInitial &&
      y === year
    )
  })

  // Sort and get the client at the specified number
  matchingClients.sort((a, b) => {
    if (a.id && b.id) {
      return a.id.localeCompare(b.id)
    }
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
    if (nameA !== nameB) return nameA.localeCompare(nameB)
    return getClientIdDateSortKey(a.type, a.birthday, a.companyFoundedAt).localeCompare(
      getClientIdDateSortKey(b.type, b.birthday, b.companyFoundedAt)
    )
  })

  if (num > 0 && num <= matchingClients.length) {
    return matchingClients[num - 1]
  }

  return null
}

const createClientForBookingSchema = z.object({
  businessId: z.string().min(1, 'Business is required'),
  firstName: z.string().min(1).max(200).trim(),
  lastName: z.string().min(1).max(200).trim(),
  email: z.string().email().max(320).optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
}).refine(
  (d) =>
    (d.email && d.email !== '') ||
    (d.phone && d.phone !== '') ||
    (d.birthday && d.birthday !== ''),
  { message: 'At least one of email, phone, or birthday is required' }
)

// Create a new client and return their client ID (public, no auth required)
export async function createClientForBooking(data: unknown) {
  const parsed = createClientForBookingSchema.parse(data)
  const businessId = parsed.businessId
  const ownerOk = await db.user.findFirst({
    where: { id: businessId, ownerUserId: null },
    select: { id: true },
  })
  if (!ownerOk) {
    throw new Error('Invalid business')
  }

  const tenantWhere = await tenantClientWhereClause(businessId)

  const firstName = parsed.firstName
  const lastName = parsed.lastName
  const email = parsed.email && parsed.email !== '' ? parsed.email : undefined
  const phone = parsed.phone && parsed.phone !== '' ? parsed.phone : undefined
  const birthdayRaw = parsed.birthday && parsed.birthday !== '' ? parsed.birthday : undefined

  // Parse birthday in local time to avoid timezone shifts
  let birthdayDate: Date | null = null
  if (birthdayRaw) {
    const [year, month, day] = birthdayRaw.split('-').map(Number)
    birthdayDate = new Date(year, month - 1, day) // month is 0-indexed
  }

  // Check for existing client to prevent duplicates
  // First check by email if provided
  if (email) {
    const existingByEmail = await db.client.findFirst({
      where: {
        AND: [tenantWhere, { email, firstName, lastName }],
      },
    })
    if (existingByEmail) {
      // Generate client ID for existing client
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
      const clientId = generateClientId(
        existingByEmail.firstName,
        existingByEmail.lastName,
        existingByEmail.birthday,
        allClients,
        existingByEmail.id,
        {
          type: existingByEmail.type,
          companyFoundedAt: existingByEmail.companyFoundedAt,
        }
      )
      return {
        ...existingByEmail,
        clientId,
      }
    }
  }

  // Check by phone if provided
  if (phone) {
    const existingByPhone = await db.client.findFirst({
      where: {
        AND: [tenantWhere, { phone, firstName, lastName }],
      },
    })
    if (existingByPhone) {
      // Generate client ID for existing client
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
      const clientId = generateClientId(
        existingByPhone.firstName,
        existingByPhone.lastName,
        existingByPhone.birthday,
        allClients,
        existingByPhone.id,
        {
          type: existingByPhone.type,
          companyFoundedAt: existingByPhone.companyFoundedAt,
        }
      )
      return {
        ...existingByPhone,
        clientId,
      }
    }
  }

  // Check by name and birthday if birthday is provided
  if (birthdayDate) {
    const existingByNameAndBirthday = await db.client.findFirst({
      where: {
        AND: [tenantWhere, { firstName, lastName, birthday: birthdayDate }],
      },
    })
    if (existingByNameAndBirthday) {
      // Generate client ID for existing client
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
      const clientId = generateClientId(
        existingByNameAndBirthday.firstName,
        existingByNameAndBirthday.lastName,
        existingByNameAndBirthday.birthday,
        allClients,
        existingByNameAndBirthday.id,
        {
          type: existingByNameAndBirthday.type,
          companyFoundedAt: existingByNameAndBirthday.companyFoundedAt,
        }
      )
      return {
        ...existingByNameAndBirthday,
        clientId,
      }
    }
  }

  // If no duplicate found, create new client
  const client = await db.client.create({
    data: {
      staffId: businessId,
      type: 'INDIVIDUAL',
      firstName,
      lastName,
      phone: phone || null,
      email: email || null,
      birthday: birthdayDate,
    },
  })

  // Create loyalty account if it doesn't exist
  const existingLoyalty = await db.loyaltyAccount.findUnique({
    where: { clientId: client.id },
  })
  if (!existingLoyalty) {
    await db.loyaltyAccount.create({
      data: { clientId: client.id, pointsBalance: 0 },
    })
  }

  // Generate client ID
  const allClientsForId = await db.client.findMany({
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
  const clientId = generateClientId(
    client.firstName,
    client.lastName,
    client.birthday,
    allClientsForId,
    client.id,
    { type: client.type, companyFoundedAt: client.companyFoundedAt }
  )

  return {
    ...client,
    clientId,
  }
}

// Book an appointment (public, no auth required)
const bookAppointmentSchema = z.object({
  businessId: z.string(),
  clientId: z.string(),
  serviceIds: z.array(z.string()).optional(),
  serviceSelections: z
    .array(
      z.object({
        serviceId: z.string(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .optional(),
  /** Calendar date (YYYY-MM-DD) used for the slot grid — must match holiday rules. */
  calendarDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startAt: z.string(),
  notes: z.string().optional(),
})

export async function bookAppointment(data: z.infer<typeof bookAppointmentSchema>) {
  const { businessId, clientId, serviceIds = [], serviceSelections = [], startAt, notes, calendarDate } =
    bookAppointmentSchema.parse(data)

  const tenantWhere = await tenantClientWhereClause(businessId)
  const clientForBooking = await db.client.findFirst({
    where: { id: clientId, ...tenantWhere },
  })
  if (!clientForBooking) {
    throw new Error('This client profile does not belong to the selected business. Create or look up a client for this business.')
  }

  // Public booking is a consultation-style booking: service durations should NOT control slot length.
  // Keep selected services for context/pricing, but use a fixed appointment duration.
  const CONSULTATION_DURATION_MINUTES = 60

  type SelectionRow = { serviceId: string; quantity: number }
  let orderedSelections: SelectionRow[] = []
  if (serviceSelections.length > 0) {
    orderedSelections = serviceSelections
  } else {
    for (const id of serviceIds) {
      orderedSelections.push({ serviceId: id, quantity: 1 })
    }
  }

  let totalPrice = 0
  let appointmentServicesCreate: Array<{ serviceId: string; priceAtTime: any; durationAtTime: any }> = []
  let servicesById = new Map<string, any>()
  if (orderedSelections.length > 0) {
    const uniqueIds = [...new Set(orderedSelections.map((s) => s.serviceId))]

    const services = await db.service.findMany({
      where: {
        AND: [
          { id: { in: uniqueIds } },
          whereServicesForBusiness(businessId),
          { isActive: true },
          { isArchived: false },
        ],
      },
    })

    servicesById = new Map(services.map((s) => [s.id, s]))
    if (services.length !== uniqueIds.length) {
      throw new Error('No valid services selected')
    }

    for (const sel of orderedSelections) {
      const service = servicesById.get(sel.serviceId)
      if (!service) throw new Error('No valid services selected')
      totalPrice += Number(service.price || 0) * sel.quantity
      for (let i = 0; i < sel.quantity; i++) {
        appointmentServicesCreate.push({
          serviceId: service.id,
          priceAtTime: service.price,
          durationAtTime: service.durationMinutes,
        })
      }
    }
  }

  const startDate = new Date(startAt)
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid appointment start time')
  }

  const endDate = new Date(startDate.getTime() + CONSULTATION_DURATION_MINUTES * 60000)

  // Validate that end time is after start time
  if (endDate <= startDate || Number.isNaN(endDate.getTime())) {
    throw new Error('Invalid appointment time')
  }

  const defaultBusinessDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

  let settingsRow: { businessHours?: unknown; businessDays?: unknown; timezone?: string | null } | null = null
  try {
    settingsRow = await db.settings.findUnique({ where: { staffId: businessId } })
  } catch {
    settingsRow = null
  }
  const tz = (settingsRow?.timezone as string) || 'UTC'
  const ymdBiz = getYmdInTimezone(startDate, tz)
  if (ymdBiz !== calendarDate) {
    throw new Error('Appointment time does not match the selected date. Please refresh and try again.')
  }

  const businessHours = normalizeBusinessHoursFromSettings(settingsRow?.businessHours)
  const businessDays = Array.isArray(settingsRow?.businessDays)
    ? (settingsRow!.businessDays as string[]).map((d) => String(d).toUpperCase().trim())
    : defaultBusinessDays
  const holidays = await getPublicHolidaysForStaff(businessId)
  const effective = computeEffectiveSlotWindow(calendarDate, businessHours, businessDays, holidays)
  if (effective.closed || !effective.slotWindow) {
    throw new Error(effective.reason || 'Not available on this date')
  }
  const openM = parseHHMMToMinutes(effective.slotWindow.start)
  const closeM = parseHHMMToMinutes(effective.slotWindow.end)
  if (openM == null || closeM == null || closeM <= openM) {
    throw new Error('Invalid opening hours for this date')
  }
  const startM = getClockMinutesInTimezone(startDate, tz)
  const endM = getClockMinutesInTimezone(endDate, tz)
  if (startM < openM || endM > closeM) {
    throw new Error('Appointment must fall within opening hours for this business')
  }

  // Only active reservations block the calendar (not COMPLETED / LATE_CANCEL / CANCELLED / NO_SHOW).
  const blockingStatuses = ['BOOKED', 'CONFIRMED'] as const

  // Check for double booking
  const conflicting = await db.appointment.findFirst({
    where: {
      staffId: businessId,
      startAt: { lt: endDate },
      endAt: { gt: startDate },
      status: { in: [...blockingStatuses] },
    },
  })

  if (conflicting) {
    throw new Error('This time slot is already booked. Please select another time.')
  }

  // Create appointment (source = PUBLIC_BOOKING so it appears in Pending Approvals)
  const appointment = await db.appointment.create({
    data: {
      clientId,
      staffId: businessId,
      startAt: startDate,
      endAt: endDate,
      status: 'BOOKED',
      totalPrice,
      notes,
      source: 'PUBLIC_BOOKING',
      ...(appointmentServicesCreate.length > 0 ? { appointmentServices: { create: appointmentServicesCreate } } : {}),
    },
    include: {
      client: {
        include: {
          loyaltyAccount: { select: { pointsBalance: true } },
        },
      },
      appointmentServices: { include: { service: true } },
    },
  })

  // Public-facing response: no client email/phone/notes, no internal IDs beyond what's needed
  return {
    id: appointment.id,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    status: appointment.status,
    totalPrice: appointment.totalPrice ? Number(appointment.totalPrice) : null,
    client: {
      id: appointment.client.id,
      firstName: appointment.client.firstName,
      lastName: appointment.client.lastName,
      pointsBalance: appointment.client.loyaltyAccount?.pointsBalance ?? 0,
    },
    appointmentServices: appointment.appointmentServices.map((as: any) => ({
      id: as.id,
      priceAtTime: as.priceAtTime ? Number(as.priceAtTime) : null,
      durationAtTime: as.durationAtTime,
      service: as.service ? {
        id: as.service.id,
        name: as.service.name,
        price: as.service.price ? Number(as.service.price) : null,
      } : null,
    })),
  }
}
