'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { whereServicesForBusiness, isSortOrderUnavailableError } from '@/lib/service-ownership'

const DURATION_UNITS = ['MINUTES', 'HOURS', 'DAYS', 'MONTHS', 'YEARS'] as const

function whereServiceByIdForBusiness(serviceId: string, staffId: string) {
  return {
    id: serviceId,
    ...whereServicesForBusiness(staffId),
  }
}

/**
 * Backfill service.staffId for rows tied to this user's categories but missing/wrong staffId.
 * Safe to call on load; no-ops when nothing to fix.
 */
export async function reconcileServiceStaffIds() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const uid = getSessionStaffId(session)

  const r1 = await db.service.updateMany({
    where: {
      staffId: null,
      category: { staffId: uid },
    },
    data: { staffId: uid },
  })

  const r2 = await db.service.updateMany({
    where: {
      staffId: { not: uid },
      category: { staffId: uid },
    },
    data: { staffId: uid },
  })

  const count = r1.count + r2.count
  if (count > 0) {
    revalidatePath('/app/services')
    revalidatePath('/book')
    revalidatePath('/app/dashboard')
  }
  return { count }
}

const createServiceSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional().or(z.literal('')),
  durationMinutes: z.number().int().positive(),
  durationUnit: z.enum(DURATION_UNITS).optional().default('MINUTES'),
  price: z.number().nonnegative(),
  pointsWorth: z.number().int().nonnegative().optional(),
  colorTag: z.string().default('blue'),
  isActive: z.boolean().default(true),
})

const createCategorySchema = z.object({
  name: z.string().min(1),
})

export async function createService(data: z.infer<typeof createServiceSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = createServiceSchema.parse(data)

  // Format imageUrl - remove leading slash if present for storage
  const imageUrl = validated.imageUrl
    ? (validated.imageUrl.startsWith('/') ? validated.imageUrl.substring(1) : validated.imageUrl)
    : null

  const serviceData: any = {
    name: validated.name,
    categoryId: validated.categoryId,
    description: validated.description || null,
    imageUrl: imageUrl,
    durationMinutes: validated.durationMinutes,
    durationUnit: validated.durationUnit ?? 'MINUTES',
    price: validated.price,
    pointsWorth: validated.pointsWorth || null,
    colorTag: validated.colorTag,
    isActive: validated.isActive,
    isArchived: false,
  }

  // Add staffId if Prisma client has been regenerated
  // This will be included automatically after migration
  if (getSessionStaffId(session)) {
    serviceData.staffId = getSessionStaffId(session)
  }

  const service = await db.service.create({
    data: serviceData,
    include: { category: true },
  })

  revalidatePath('/app/services')
  // Convert Decimal to number for serialization
  return {
    ...service,
    price: service.price ? Number(service.price) : null,
  }
}

export async function updateService(
  id: string,
  data: Partial<z.infer<typeof createServiceSchema>>
) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify service belongs to this business
  const existingService = await db.service.findFirst({
    where: whereServiceByIdForBusiness(id, getSessionStaffId(session)),
  })

  if (!existingService) {
    throw new Error('Service not found or does not belong to this business')
  }

  const updateData: any = { ...data }

  // Handle imageUrl - ensure it's properly formatted and included
  if ('imageUrl' in updateData) {
    if (updateData.imageUrl === '' || updateData.imageUrl === null || updateData.imageUrl === undefined) {
      updateData.imageUrl = null
      console.log('Setting imageUrl to null (clearing image)')
    } else if (typeof updateData.imageUrl === 'string' && updateData.imageUrl.trim() !== '') {
      // Ensure imageUrl is stored without leading slash if it's a relative path
      updateData.imageUrl = updateData.imageUrl.startsWith('/')
        ? updateData.imageUrl.substring(1)
        : updateData.imageUrl
      console.log('Updating service with imageUrl:', updateData.imageUrl)
    }
  } else {
    // If imageUrl is not in updateData, don't change it (keep existing)
    console.log('imageUrl not in updateData, keeping existing value')
  }

  if (updateData.description === '') updateData.description = null

  console.log('Final updateData:', JSON.stringify(updateData, null, 2))

  const service = await db.service.update({
    where: { id },
    data: updateData,
    include: { category: true },
  })

  console.log('Updated service imageUrl:', service.imageUrl)

  revalidatePath('/app/services')
  // Convert Decimal to number for serialization
  return {
    ...service,
    price: service.price ? Number(service.price) : null,
  }
}

export async function archiveService(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify service belongs to this business
  const existingService = await db.service.findFirst({
    where: whereServiceByIdForBusiness(id, getSessionStaffId(session)),
  })

  if (!existingService) {
    throw new Error('Service not found or does not belong to this business')
  }

  await db.service.update({
    where: { id },
    data: { isArchived: true },
  })
  revalidatePath('/app/services')
}

export async function restoreService(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify service belongs to this business
  const existingService = await db.service.findFirst({
    where: whereServiceByIdForBusiness(id, getSessionStaffId(session)),
  })

  if (!existingService) {
    throw new Error('Service not found or does not belong to this business')
  }

  await db.service.update({
    where: { id },
    data: { isArchived: false },
  })
  revalidatePath('/app/services')
}

export async function deleteService(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify service belongs to this business
  const existingService = await db.service.findFirst({
    where: whereServiceByIdForBusiness(id, getSessionStaffId(session)),
  })

  if (!existingService) {
    throw new Error('Service not found or does not belong to this business')
  }

  await db.service.delete({ where: { id } })
  revalidatePath('/app/services')
}

export async function getServices(includeArchived: boolean = false, minimal: boolean = false) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  try {
    let services: any[] = []
    try {
      services = await db.service.findMany({
        where: {
          AND: [
            whereServicesForBusiness(getSessionStaffId(session)),
            includeArchived ? { isArchived: true } : { isArchived: false },
          ],
        },
        include: minimal
          ? {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            }
          : {
              category: true,
            },
        orderBy: [{ category: { sortOrder: 'asc' } }, { category: { name: 'asc' } }, { name: 'asc' }],
      })
    } catch (e: any) {
      // Some DBs/clients don't have category.sortOrder yet; fall back to name ordering.
      if (isSortOrderUnavailableError(e)) {
        services = await db.service.findMany({
          where: {
            AND: [
              whereServicesForBusiness(getSessionStaffId(session)),
              includeArchived ? { isArchived: true } : { isArchived: false },
            ],
          },
          include: minimal
            ? {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              }
            : {
                category: true,
              },
          orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
        })
      } else {
        throw e
      }
    }

    // Convert Decimal to number for serialization
    return services.map((service) => ({
      ...service,
      price: service.price ? Number(service.price) : null,
    }))
  } catch (error: any) {
    // If staffId field doesn't exist yet (Prisma client not regenerated)
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      console.error('Prisma client needs to be regenerated. Please run: npx prisma generate')
      console.error('Then run: npx prisma migrate dev --name add_staff_id_to_services_and_inventory')
      // Return empty array until migration is complete
      return []
    }
    throw error
  }
}

export async function getCategories() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  try {
    // First try to filter by staffId on category itself (if field exists)
    let categories
    try {
      // This business, or legacy rows before staffId was set (null).
      try {
        categories = await db.serviceCategory.findMany({
          where: {
            OR: [{ staffId: getSessionStaffId(session) }, { staffId: null }],
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        })
      } catch (orderErr: any) {
        if (isSortOrderUnavailableError(orderErr)) {
          categories = await db.serviceCategory.findMany({
            where: {
              OR: [{ staffId: getSessionStaffId(session) }, { staffId: null }],
            },
            orderBy: [{ name: 'asc' }],
          })
        } else {
          throw orderErr
        }
      }

      categories = categories.filter((cat) => cat.staffId === getSessionStaffId(session) || cat.staffId === null)
    } catch (e: any) {
      // If staffId doesn't exist on category yet, filter by services
      if (e.message?.includes('Unknown argument `staffId`')) {
        // Get all categories that have services for this business
        let services: any[] = []
        try {
          services = await db.service.findMany({
            where: {
              OR: [{ staffId: getSessionStaffId(session) }, { staffId: null }],
            },
            select: {
              categoryId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  sortOrder: true,
                  createdAt: true,
                },
              },
            },
          })
        } catch (selErr: any) {
          if (isSortOrderUnavailableError(selErr)) {
            services = await db.service.findMany({
              where: {
                OR: [{ staffId: getSessionStaffId(session) }, { staffId: null }],
              },
              select: {
                categoryId: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    createdAt: true,
                  },
                },
              },
            })
          } else {
            throw selErr
          }
        }

        // Get unique categories from services
        const categoryMap = new Map()
        services.forEach(service => {
          if (service.category) {
            categoryMap.set(service.category.id, service.category)
          }
        })

        categories = Array.from(categoryMap.values()).sort((a, b) => {
          const ao = (a as { sortOrder?: number }).sortOrder ?? 0
          const bo = (b as { sortOrder?: number }).sortOrder ?? 0
          if (ao !== bo) return ao - bo
          return a.name.localeCompare(b.name)
        })
      } else {
        throw e
      }
    }

    return categories
  } catch (error: any) {
    // If staffId field doesn't exist yet (Prisma client not regenerated)
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      console.error('Prisma client needs to be regenerated. Please run: npx prisma generate')
      // Return empty array - don't show other businesses' categories
      return []
    }
    throw error
  }
}

export async function createCategory(data: z.infer<typeof createCategorySchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = createCategorySchema.parse(data)

  // Check if category already exists for this business
  try {
    // First try to check with staffId (case-insensitive and trimmed)
    const trimmedName = validated.name.trim()
    const existing = await db.serviceCategory.findFirst({
      where: {
        OR: [
          {
            name: trimmedName,
            staffId: getSessionStaffId(session),
          },
          {
            // Also check for null staffId categories that might belong to this business
            name: trimmedName,
            staffId: null,
            services: {
              some: {
                staffId: getSessionStaffId(session),
              },
            },
          },
        ],
      },
    })

    if (existing) {
      // If it has null staffId, update it to belong to this business
      if (!existing.staffId) {
        try {
          await db.serviceCategory.update({
            where: { id: existing.id },
            data: { staffId: getSessionStaffId(session) },
          })
        } catch (updateError) {
          // Silently fail - category still exists
        }
      }
      throw new Error(`Category "${trimmedName}" already exists`)
    }
  } catch (error: any) {
    // If staffId field doesn't exist yet, check without it but only for this business's services
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      // Check if any services for this business use this category name
      try {
        const servicesWithCategory = await db.service.findFirst({
          where: {
            staffId: getSessionStaffId(session),
            category: {
              name: validated.name.trim(),
            },
          },
        })

        if (servicesWithCategory) {
          throw new Error(`Category "${validated.name}" already exists`)
        }
      } catch (serviceError: any) {
        // If staffId doesn't exist on Service either, skip the check
        // This means we can't verify duplicates until Prisma client is regenerated
        if (serviceError.message?.includes('Unknown argument `staffId`')) {
          console.warn('Cannot check for duplicate categories - Prisma client needs regeneration')
          // Allow creation to proceed - duplicates will be caught by unique constraint if it exists
        } else {
          throw serviceError
        }
      }
    } else if (error.message?.includes('already exists')) {
      throw error
    }
  }

  const categoryData: any = {
    name: validated.name.trim(),
  }

  // Try to add staffId if Prisma client has been regenerated
  try {
    if (getSessionStaffId(session)) {
      categoryData.staffId = getSessionStaffId(session)
      try {
        const agg = await db.serviceCategory.aggregate({
          where: { staffId: getSessionStaffId(session) },
          _max: { sortOrder: true },
        })
        categoryData.sortOrder = (agg._max.sortOrder ?? -1) + 1
      } catch (aggErr: any) {
        if (!isSortOrderUnavailableError(aggErr)) throw aggErr
      }
    }

    const category = await db.serviceCategory.create({
      data: categoryData,
    })

    revalidatePath('/app/services')
    return category
  } catch (error: any) {
    // If staffId field doesn't exist yet, create without it
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      console.warn('staffId field not available on ServiceCategory yet. Creating category without staffId.')
      const category = await db.serviceCategory.create({
        data: {
          name: validated.name.trim(),
        },
      })

      revalidatePath('/app/services')
      return category
    }
    // If it's a unique constraint error, the category already exists
    if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
      throw new Error(`Category "${validated.name}" already exists`)
    }
    throw error
  }
}

export async function deleteCategory(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // First, verify the category exists and belongs to this business
  const category = await db.serviceCategory.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      staffId: true,
    },
  })

  if (!category) {
    throw new Error('Category not found')
  }

  // STRICT CHECK: Category MUST belong to this business to be deletable
  // If it has a staffId, it must match this business
  if (category.staffId && category.staffId !== getSessionStaffId(session)) {
    throw new Error(`Category "${category.name}" does not belong to your business and cannot be deleted.`)
  }

  // If category has null staffId, it's a legacy category
  // Only allow deletion if this business is the only one using it
  if (!category.staffId) {
    // Check if this business uses it
    const thisBusinessServicesCount = await db.service.count({
      where: {
        categoryId: id,
        OR: [{ staffId: getSessionStaffId(session) }, { staffId: null }],
      },
    })

    // Check if other businesses use it
    const otherBusinessServicesCount = await db.service.count({
      where: {
        categoryId: id,
        AND: [
          {
            staffId: {
              not: null,
            },
          },
          {
            staffId: {
              not: getSessionStaffId(session),
            },
          },
        ],
      },
    })

    if (otherBusinessServicesCount > 0) {
      throw new Error(`Cannot delete category "${category.name}". It is being used by ${otherBusinessServicesCount} service(s) from other businesses.`)
    }

    if (thisBusinessServicesCount > 0) {
      throw new Error(`Cannot delete category "${category.name}" with ${thisBusinessServicesCount} service(s) in your business. Please reassign or delete services first.`)
    }

    // If no one uses it, assign it to this business before deleting (cleanup)
    await db.serviceCategory.update({
      where: { id },
      data: { staffId: getSessionStaffId(session) },
    })
  } else {
    // Category belongs to this business, check if it's used
    const servicesCount = await db.service.count({
      where: {
        categoryId: id,
        OR: [{ staffId: getSessionStaffId(session) }, { staffId: null }],
      },
    })

    if (servicesCount > 0) {
      throw new Error(`Cannot delete category "${category.name}" with ${servicesCount} service(s). Please reassign or delete services first.`)
    }
  }

  // Safe to delete - no services are using it and it belongs to this business
  await db.serviceCategory.delete({ where: { id } })
  revalidatePath('/app/services')
}

/** Persist category order for public booking + admin (IDs in display order). */
export async function reorderServiceCategories(orderedCategoryIds: string[]) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')
  const ids = orderedCategoryIds.filter(Boolean)
  if (ids.length === 0) return

  const owned = await db.serviceCategory.findMany({
    where: {
      id: { in: ids },
      OR: [{ staffId: getSessionStaffId(session) }, { staffId: null }],
    },
    select: { id: true, staffId: true },
  })
  if (owned.length !== ids.length) {
    throw new Error('Invalid category list')
  }

  try {
    await db.$transaction(
      ids.map((id, index) => {
        const row = owned.find((o) => o.id === id)
        return db.serviceCategory.update({
          where: { id },
          data: {
            sortOrder: index,
            ...(row && row.staffId == null ? { staffId: getSessionStaffId(session) } : {}),
          },
        })
      })
    )
  } catch (e: any) {
    // Some environments have DB column `sort_order` but Prisma client missing `sortOrder`.
    // Fall back to raw SQL so drag/drop still works.
    if (isSortOrderUnavailableError(e) || e?.message?.includes('Unknown argument `sortOrder`')) {
      await db.$transaction(
        ids.map((id, index) => {
          const row = owned.find((o) => o.id === id)
          return db.$executeRaw`
            UPDATE service_categories
            SET sort_order = ${index},
                staff_id = COALESCE(staff_id, ${row && row.staffId == null ? getSessionStaffId(session) : null})
            WHERE id = ${id}
          `
        })
      )
    } else {
      throw e
    }
  }

  revalidatePath('/app/services')
  revalidatePath('/book')
}
