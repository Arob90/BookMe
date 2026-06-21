'use server'

import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSessionStaffId } from '@/lib/session-staff'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.union([z.string(), z.literal(''), z.null()]).optional(),
  quantity: z.number().int().min(0).default(0),
  minQuantity: z.number().int().min(0).default(0),
  unit: z.string().default('unit'),
  cost: z.number().optional(),
  supplier: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

const updateInventoryItemSchema = createInventoryItemSchema.partial()

export async function getInventoryItems(includeArchived: boolean = false) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  try {
    // Check if inventoryItem model exists on db
    if (!db.inventoryItem || typeof db.inventoryItem.findMany !== 'function') {
      console.warn('InventoryItem model not available in Prisma client')
      return []
    }

    const items = await db.inventoryItem.findMany({
      where: {
        staffId: getSessionStaffId(session), // Only show inventory for this business (null staffId means old shared data, exclude it)
        ...(includeArchived ? { isArchived: true } : { isArchived: false }),
      },
      orderBy: { name: 'asc' },
    })

    return items
  } catch (error: any) {
    // If staffId field doesn't exist yet (Prisma client not regenerated)
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      console.error('Prisma client needs to be regenerated. Please run: npx prisma generate')
      console.error('Then run: npx prisma migrate dev --name add_staff_id_to_services_and_inventory')
      return []
    }
    // If table doesn't exist yet, return empty array
    console.error('Error fetching inventory items:', error.message)
    return []
  }
}

export async function getInventoryItem(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const item = await db.inventoryItem.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session), // Verify item belongs to this business
    },
  })

  if (!item) throw new Error('Inventory item not found or does not belong to this business')
  return item
}

export async function getLowStockItems() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  try {
    // Check if inventoryItem model exists on db
    if (!db.inventoryItem || typeof db.inventoryItem.findMany !== 'function') {
      console.warn('InventoryItem model not available in Prisma client')
      return []
    }

    const allItems = await db.inventoryItem.findMany({
      where: {
        staffId: getSessionStaffId(session), // Only show inventory for this business (null staffId means old shared data, exclude it)
        isActive: true,
        isArchived: false,
      },
    })

    // Filter items where quantity <= minQuantity
    const lowStockItems = allItems.filter(item => item.quantity <= item.minQuantity)

    return lowStockItems.sort((a, b) => a.quantity - b.quantity)
  } catch (error: any) {
    // If table doesn't exist yet or model not generated, return empty array
    console.error('Error fetching low stock items:', error.message)
    return []
  }
}

export async function createInventoryItem(data: z.infer<typeof createInventoryItemSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validatedData = createInventoryItemSchema.parse(data)

  // Format imageUrl - remove leading slash if present for storage
  const imageUrl = validatedData.imageUrl
    ? (validatedData.imageUrl.startsWith('/') ? validatedData.imageUrl.substring(1) : validatedData.imageUrl)
    : null

  const itemData: any = {
    ...validatedData,
    imageUrl: imageUrl,
    expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
  }
  
  // Try to add staffId if Prisma client has been regenerated
  if (getSessionStaffId(session)) {
    itemData.staffId = getSessionStaffId(session)
  }

  try {
    const item = await db.inventoryItem.create({
      data: itemData,
    })

    revalidatePath('/app/inventory')
    revalidatePath('/app/dashboard')
    return item
  } catch (error: any) {
    // If staffId field doesn't exist yet, create without it
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      console.warn('staffId field not available on InventoryItem yet. Creating item without staffId.')
      // Remove staffId from data
      const { staffId, ...dataWithoutStaffId } = itemData
      const item = await db.inventoryItem.create({
        data: dataWithoutStaffId,
      })

      revalidatePath('/app/inventory')
      revalidatePath('/app/dashboard')
      return item
    }
    throw error
  }
}

export async function updateInventoryItem(id: string, data: z.infer<typeof updateInventoryItemSchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify item belongs to this business
  const existingItem = await db.inventoryItem.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session),
    },
  })

  if (!existingItem) {
    throw new Error('Inventory item not found or does not belong to this business')
  }

  const validatedData = updateInventoryItemSchema.parse(data)

  const updateData: any = { ...validatedData }

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
      console.log('Updating inventory item with imageUrl:', updateData.imageUrl)
    }
  } else {
    // If imageUrl is not in updateData, don't change it (keep existing)
    console.log('imageUrl not in updateData, keeping existing value')
  }
  if (updateData.expiryDate !== undefined) {
    updateData.expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null
  }

  const item = await db.inventoryItem.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/app/inventory')
  revalidatePath('/app/dashboard')
  return item
}

export async function archiveInventoryItem(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify item belongs to this business
  const existingItem = await db.inventoryItem.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session),
    },
  })

  if (!existingItem) {
    throw new Error('Inventory item not found or does not belong to this business')
  }

  await db.inventoryItem.update({
    where: { id },
    data: { isArchived: true },
  })

  revalidatePath('/app/inventory')
  revalidatePath('/app/dashboard')
}

export async function restoreInventoryItem(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify item belongs to this business
  const existingItem = await db.inventoryItem.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session),
    },
  })

  if (!existingItem) {
    throw new Error('Inventory item not found or does not belong to this business')
  }

  await db.inventoryItem.update({
    where: { id },
    data: { isArchived: false },
  })

  revalidatePath('/app/inventory')
  revalidatePath('/app/dashboard')
}

export async function deleteInventoryItem(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // Verify item belongs to this business
  const existingItem = await db.inventoryItem.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session),
    },
  })

  if (!existingItem) {
    throw new Error('Inventory item not found or does not belong to this business')
  }

  await db.inventoryItem.delete({
    where: { id },
  })

  revalidatePath('/app/inventory')
  revalidatePath('/app/dashboard')
}

export async function adjustQuantity(id: string, adjustment: number) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const item = await db.inventoryItem.findFirst({
    where: {
      id,
      staffId: getSessionStaffId(session), // Verify item belongs to this business
    },
  })

  if (!item) throw new Error('Inventory item not found or does not belong to this business')

  const newQuantity = Math.max(0, item.quantity + adjustment)

  const updated = await db.inventoryItem.update({
    where: { id },
    data: { quantity: newQuantity },
  })

  revalidatePath('/app/inventory')
  revalidatePath('/app/dashboard')
  return updated
}

const createInventoryCategorySchema = z.object({
  name: z.string().min(1),
})

export async function getInventoryCategories() {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  try {
    // Prefer InventoryCategory table (per-business)
    if (db.inventoryCategory && typeof db.inventoryCategory.findMany === 'function') {
      try {
        const categories = await db.inventoryCategory.findMany({
          where: {
            staffId: getSessionStaffId(session),
          },
          orderBy: { name: 'asc' },
        })
        return categories.map((cat) => ({ id: cat.id, name: cat.name }))
      } catch (error: any) {
        // Backward compatibility if staffId isn't available yet
        if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
          const categories = await db.inventoryCategory.findMany({
            orderBy: { name: 'asc' },
          })
          return categories.map((cat) => ({ id: cat.id, name: cat.name }))
        }
        throw error
      }
    }

    // Fallback: Get categories from inventory items (backward compatibility)
    if (db.inventoryItem && typeof db.inventoryItem.findMany === 'function') {
      const items = await db.inventoryItem.findMany({
        where: {
          staffId: getSessionStaffId(session), // Only items for this business
          category: { not: null },
          isArchived: false,
        },
        select: {
          category: true,
        },
        distinct: ['category'],
      })

      const categories = items
        .map(item => item.category)
        .filter((cat): cat is string => cat !== null)
        .sort()

      return categories.map((name, index) => ({ id: `cat_${index}`, name }))
    }

    return []
  } catch (error: any) {
    console.error('Error fetching inventory categories:', error.message)
    return []
  }
}

export async function createInventoryCategory(data: z.infer<typeof createInventoryCategorySchema>) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  const validated = createInventoryCategorySchema.parse(data)
  const name = validated.name.trim()

  // Check if category already exists for this business
  if (db.inventoryCategory && typeof db.inventoryCategory.findFirst === 'function') {
    try {
      const existing = await db.inventoryCategory.findFirst({
        where: {
          name,
          staffId: getSessionStaffId(session),
        },
      })
      if (existing) throw new Error(`Category "${name}" already exists`)
    } catch (error: any) {
      // Backward compatibility if staffId isn't available yet
      if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
        const existing = await db.inventoryCategory.findFirst({
          where: { name },
        })
        if (existing) throw new Error(`Category "${name}" already exists`)
      } else if (error.message?.includes('already exists')) {
        throw error
      } else {
        throw error
      }
    }
  }

  try {
    // Try to create in InventoryCategory table first
    // @ts-ignore - inventoryCategory might not be in types yet if Prisma client wasn't regenerated
    if (db.inventoryCategory && typeof db.inventoryCategory.create === 'function') {
      const categoryData: any = { name, staffId: getSessionStaffId(session) }
      
      // @ts-ignore
      const category = await db.inventoryCategory.create({
        data: categoryData,
      })
      revalidatePath('/app/inventory')
      console.log('Created inventory category:', category)
      return { id: category.id, name: category.name }
    }
  } catch (error: any) {
    // If staffId field doesn't exist yet, try without it
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      try {
        // @ts-ignore
        const category = await db.inventoryCategory.create({
          data: { name },
        })
        revalidatePath('/app/inventory')
        return { id: category.id, name: category.name }
      } catch (retryError: any) {
        // If category already exists, throw error
        if (retryError.code === 'P2002' || retryError.message?.includes('Unique constraint') || retryError.message?.includes('already exists')) {
          throw new Error(`Category "${name}" already exists`)
        }
        throw retryError
      }
    }
    // If category already exists, throw error
    if (error.code === 'P2002' || error.message?.includes('Unique constraint') || error.message?.includes('already exists')) {
      throw new Error(`Category "${name}" already exists`)
    }
    // If the model doesn't exist yet, fall through to fallback
    console.log('InventoryCategory model not available, using fallback:', error.message)
  }

  // Fallback: Return temporary category (will be created when item uses it)
  // Note: This won't persist until Prisma client is regenerated
  revalidatePath('/app/inventory')
  const tempId = `cat_${Date.now()}`
  console.log('Created temporary category (Prisma client needs regeneration):', tempId, name)
  return { id: tempId, name }
}

export async function deleteInventoryCategory(categoryName: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error('Unauthorized')

  // First, check if any items for this business use this category
  let itemsCount = 0
  try {
    itemsCount = await db.inventoryItem.count({
      where: {
        staffId: getSessionStaffId(session), // Only count items for this business
        category: categoryName,
        isArchived: false,
      },
    })
  } catch (error: any) {
    // If staffId field doesn't exist yet, count all items (fallback)
    if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
      itemsCount = await db.inventoryItem.count({
        where: {
          category: categoryName,
          isArchived: false,
        },
      })
    } else {
      throw error
    }
  }

  if (itemsCount > 0) {
    throw new Error(`Cannot delete category with ${itemsCount} item(s). Please reassign or delete items first.`)
  }

  // If InventoryCategory table exists, verify the category belongs to this business and delete it
  if (db.inventoryCategory && typeof db.inventoryCategory.deleteMany === 'function') {
    try {
      // Only delete categories for this business
      // @ts-ignore
      await db.inventoryCategory.deleteMany({
        where: {
          name: categoryName,
          staffId: getSessionStaffId(session),
        },
      })
    } catch (error: any) {
      // Backward compatibility if staffId isn't available yet
      if (error.message?.includes('Unknown argument `staffId`') || error.message?.includes('staffId')) {
        // @ts-ignore
        await db.inventoryCategory.deleteMany({
          where: { name: categoryName },
        })
      } else {
        throw error
      }
    }
  }

  revalidatePath('/app/inventory')
}
