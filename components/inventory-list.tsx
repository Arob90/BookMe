'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Package, AlertTriangle, Edit, Trash2, DollarSign, MapPin, Calendar, Building2, Box, ChevronDown, Archive, RotateCcw, Image as ImageIcon, Settings } from 'lucide-react'
import { InventoryDialog } from '@/components/inventory-dialog'
import { InventoryCategoryDialog } from '@/components/inventory-category-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { archiveInventoryItem, restoreInventoryItem, deleteInventoryItem } from '@/app/actions/inventory'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface InventoryListProps {
  items: any[]
  filter?: string
  view?: string
  categories?: Array<{ id: string; name: string }>
  initialItemId?: string
}

const categoryColorMap: Record<string, string> = {
  'TOOLS': 'bg-pink-100 border-pink-300',
  'CLEANERS': 'bg-purple-100 border-purple-300',
  'SUPPLIES': 'bg-green-100 border-green-300',
  'EQUIPMENT': 'bg-orange-100 border-orange-300',
  'CONSUMABLES': 'bg-pink-100 border-pink-300',
  'OTHER': 'bg-gray-100 border-gray-300',
}

export function InventoryList({ items: initialItems, filter, view, categories: initialCategories = [], initialItemId }: InventoryListProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [categories, setCategories] = useState(initialCategories)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [itemToArchive, setItemToArchive] = useState<string | null>(null)
  const [itemToRestore, setItemToRestore] = useState<string | null>(null)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const isArchivedView = view === 'archived'
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const hasScrolledToItem = useRef(false)
  
  // Filter items based on view and filter parameter
  const filteredItems = useMemo(() => {
    let result = items
    
    // First filter by archive status
    if (isArchivedView) {
      result = result.filter(item => item.isArchived === true)
    } else {
      result = result.filter(item => item.isArchived === false)
    }
    
    // Then apply additional filters if needed
    if (filter === 'lowStock') {
      result = result.filter(item => item.isActive && item.quantity <= item.minQuantity)
    }
    
    return result
  }, [items, isArchivedView, filter])
  
  // Scroll to and highlight the initial item if provided
  useEffect(() => {
    if (initialItemId && !hasScrolledToItem.current && filteredItems.length > 0) {
      // Wait for items to render
      setTimeout(() => {
        const itemElement = itemRefs.current[initialItemId]
        if (itemElement) {
          // Find which category this item belongs to and expand it
          const item = filteredItems.find(i => i.id === initialItemId)
          if (item && item.category) {
            setExpandedCategories(prev => ({ ...prev, [item.category]: true }))
          }
          
          // Scroll to the item
          setTimeout(() => {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Add a highlight effect
            itemElement.classList.add('ring-4', 'ring-pink-500', 'ring-opacity-50', 'transition-all')
            setTimeout(() => {
              itemElement.classList.remove('ring-4', 'ring-pink-500', 'ring-opacity-50')
            }, 2000)
            hasScrolledToItem.current = true
          }, 200)
        }
      }, 300)
    }
  }, [initialItemId, filteredItems])

  const handleCreate = () => {
    setSelectedItem(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (item: any) => {
    setSelectedItem(item)
    setIsDialogOpen(true)
  }

  const handleArchive = async (id: string) => {
    try {
      await archiveInventoryItem(id)
      setItems(items.filter(item => item.id !== id))
      setItemToArchive(null)
      toast({
        title: 'Success',
        description: 'Item archived successfully',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive item',
        variant: 'destructive',
      })
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreInventoryItem(id)
      // Remove from local state immediately (it will move to active view)
      setItems(items.filter(item => item.id !== id))
      setItemToRestore(null)
      toast({
        title: 'Success',
        description: 'Item restored successfully',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore item',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteInventoryItem(id)
      setItems(items.filter(item => item.id !== id))
      setItemToDelete(null)
      toast({
        title: 'Success',
        description: 'Inventory item permanently deleted',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inventory item',
        variant: 'destructive',
      })
    }
  }

  const lowStockItems = items.filter(item => item.isActive && item.quantity <= item.minQuantity)
  const expiredItems = items.filter(item => item.isActive && item.expiryDate && new Date(item.expiryDate) < new Date())

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, any[]>)
  
  // Track which categories are expanded (default: all expanded)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const grouped = filteredItems.reduce((acc, item) => {
      const categoryName = item.category || 'Uncategorized'
      if (!acc[categoryName]) {
        acc[categoryName] = true // Start with all expanded
      }
      return acc
    }, {} as Record<string, boolean>)
    return grouped
  })

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }))
  }
  
  // Scroll to low stock section when filter is active
  const lowStockRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (filter === 'lowStock' && lowStockRef.current) {
      setTimeout(() => {
        lowStockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [filter])

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-shrink-0">
        {!isArchivedView && (
          <>
            <Button onClick={handleCreate} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New Item
            </Button>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)} className="gap-2" size="sm">
              <Settings className="h-4 w-4" />
              Manage Categories
            </Button>
          </>
        )}
         <Button 
           variant={isArchivedView ? "default" : "outline"}
           onClick={async () => {
             const url = isArchivedView ? '/app/inventory' : '/app/inventory?view=archived'
             router.push(url)
             // Refresh items after navigation
             setTimeout(async () => {
               try {
                 const { getInventoryItems } = await import('@/app/actions/inventory')
                 const updatedItems = await getInventoryItems(!isArchivedView)
                 setItems(updatedItems)
               } catch (error) {
                 console.error('Failed to refresh inventory:', error)
               }
               router.refresh()
             }, 100)
           }}
           className="gap-2"
           size="sm"
         >
           <Archive className="h-4 w-4" />
           {isArchivedView ? 'Back to Active' : 'View Archived'}
         </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div ref={lowStockRef}>
          <Card className={`border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm flex-shrink-0 transition-all ${
            filter === 'lowStock' ? 'ring-4 ring-orange-300 shadow-lg' : ''
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Low Stock Alert ({lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''})
                {filter === 'lowStock' && (
                  <Badge className="ml-auto bg-orange-600 text-white">
                    Filtered
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map((item) => (
                  <Badge key={item.id} variant="outline" className="border-orange-300 bg-orange-100 text-orange-800">
                    {item.name} ({item.quantity} {item.unit})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expired Items Alert */}
      {expiredItems.length > 0 && (
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-rose-50 shadow-sm flex-shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Expired Items ({expiredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {expiredItems.map((item) => (
                <Badge key={item.id} variant="destructive">
                  {item.name} - Expired: {formatDate(item.expiryDate)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Info */}
      {filter === 'lowStock' && (
        <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              Showing only low stock items ({filteredItems.length})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/app/inventory')}
            className="text-orange-700 hover:text-orange-800 hover:bg-orange-100"
          >
            Clear Filter
          </Button>
        </div>
      )}

      {/* Inventory Items */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {Object.keys(groupedItems).length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              {filter === 'lowStock' 
                ? 'No low stock items found. All items are well stocked!' 
                : 'No inventory items yet. Create your first item!'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedItems).map(([categoryName, categoryItems]) => {
              const isExpanded = expandedCategories[categoryName] !== false // Default to true
              const items = categoryItems as any[]
              
              return (
                <div key={categoryName} className="border rounded-lg overflow-hidden">
                  {/* Category Header - Clickable */}
                  <button
                    onClick={() => toggleCategory(categoryName)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      {categoryName}
                      <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                        ({items.length})
                      </span>
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Category Content - Collapsible */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                  >
                    <div className="p-4">
                      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(168px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
                        {items.map((item) => {
                          const isLowStock = item.quantity <= item.minQuantity
                          const needsRestock = item.minQuantity > 0 && item.quantity <= item.minQuantity * 1.5
                          const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date()
                          const isInactive = !item.isActive
                          
                          // Get category color, default to pink if not found
                          const categoryKey = (item.category || 'OTHER').toUpperCase()
                          const cardColor = categoryColorMap[categoryKey] || categoryColorMap['OTHER']

                          return (
                            <div
                              key={item.id}
                              ref={(el) => {
                                if (el) {
                                  itemRefs.current[item.id] = el
                                }
                              }}
                            >
                            <Card
                              className={`overflow-hidden transition-all hover:shadow-md flex flex-col h-full min-h-0 ${cardColor} ${!item.isActive ? 'opacity-60' : ''}`}
                            >
                              {/* Image — fixed aspect avoids crop gaps; object-cover fills */}
                              <div className="relative aspect-[4/3] w-full shrink-0 bg-muted/40 overflow-hidden rounded-t-lg">
                                {item.imageUrl ? (
                                  <>
                                    <img
                                      src={item.imageUrl.startsWith('http') ? item.imageUrl : item.imageUrl.startsWith('/') ? item.imageUrl : `/${item.imageUrl}`}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const img = e.currentTarget as HTMLImageElement
                                        img.style.display = 'none'
                                        const placeholder = img.nextElementSibling as HTMLElement
                                        if (placeholder) {
                                          placeholder.style.display = 'flex'
                                        }
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 hidden">
                                      <Package className="h-8 w-8 text-gray-400" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                    <Package className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                {!item.isActive && (
                                  <div className="absolute top-1 right-1 z-20">
                                    <Badge variant="secondary" className="text-xs px-1 py-0">Inactive</Badge>
                                  </div>
                                )}
                                {/* Badge Container - Stack badges vertically to prevent overlap */}
                                {!isArchivedView && (isExpired || isLowStock || needsRestock) && (
                                  <div className="absolute top-1 left-1 z-10 flex flex-col gap-0.5">
                                    {/* Expired Badge - Highest Priority */}
                                    {isExpired && (
                                      <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 shadow-md whitespace-nowrap">
                                        ⚠️ Expired
                                      </Badge>
                                    )}
                                    {/* Low Stock Badge */}
                                    {isLowStock && (
                                      <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 shadow-md whitespace-nowrap">
                                        ⚠️ Low
                                      </Badge>
                                    )}
                                    {/* Restock Indicator Badge */}
                                    {needsRestock && !isLowStock && (
                                      <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 animate-pulse shadow-md whitespace-nowrap">
                                        🔄 Restock
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>

                              <CardContent className="flex flex-1 flex-col gap-2.5 p-3 pt-2.5 pb-3 min-h-0">
                                <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 text-foreground pr-0.5">
                                  {item.name}
                                </CardTitle>

                                {/* Qty | price — grid keeps one line per side (no awkward wrap) */}
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs items-baseline">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span
                                      className={`font-semibold tabular-nums whitespace-nowrap truncate ${
                                        isLowStock ? 'text-orange-600' : 'text-green-700'
                                      }`}
                                    >
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                  {item.cost != null && !Number.isNaN(Number(item.cost)) && (
                                    <div className="flex items-center justify-end gap-1 min-w-0 text-right">
                                      <DollarSign className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                      <span className="font-semibold tabular-nums text-foreground whitespace-nowrap">
                                        {formatCurrency(Number(item.cost))}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                  {item.minQuantity > 0 && (
                                    <p className="leading-snug">
                                      Min:{' '}
                                      <span className="text-foreground/90 font-medium tabular-nums">
                                        {item.minQuantity} {item.unit}
                                      </span>
                                    </p>
                                  )}

                                  {item.expiryDate && (
                                    <div
                                      className={`flex items-start gap-2 min-w-0 ${
                                        isExpired ? 'text-red-600 font-medium' : ''
                                      }`}
                                    >
                                      <Calendar
                                        className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isExpired ? 'text-red-600' : 'text-muted-foreground'}`}
                                      />
                                      <span className="min-w-0 leading-snug">{formatDate(item.expiryDate)}</span>
                                    </div>
                                  )}

                                  {item.supplier && (
                                    <div className="flex items-start gap-2 min-w-0">
                                      <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                                      <span className="truncate leading-snug">{item.supplier}</span>
                                    </div>
                                  )}

                                  {item.location && (
                                    <div className="flex items-start gap-2 min-w-0">
                                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                                      <span className="truncate leading-snug">{item.location}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 pt-2.5 mt-auto border-t border-border/60">
                                  {!isArchivedView && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(item)}
                                        className="flex-1 gap-1 h-8 text-xs px-2"
                                      >
                                        <Edit className="h-3.5 w-3.5 shrink-0" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setItemToArchive(item.id)}
                                        className="flex-1 gap-1 h-8 text-xs px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                      >
                                        <Archive className="h-3.5 w-3.5 shrink-0" />
                                        Archive
                                      </Button>
                                    </>
                                  )}
                                  {isArchivedView && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setItemToRestore(item.id)}
                                        className="flex-1 gap-1 h-8 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                                        Restore
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setItemToDelete(item.id)}
                                        className="flex-1 gap-1 h-8 text-xs px-2"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <InventoryDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setSelectedItem(null)
            // Refresh inventory when dialog closes
            router.refresh()
          }
        }}
        item={selectedItem}
        categories={categories}
        onCategoriesUpdated={(updatedCategories) => {
          setCategories(updatedCategories)
        }}
        onItemUpdated={async (updatedItem) => {
          // Optimistically update the local state if we have the updated item
          if (updatedItem) {
            setItems(prevItems => {
              const existingIndex = prevItems.findIndex(i => i.id === updatedItem.id)
              if (existingIndex >= 0) {
                // Update existing item
                const newItems = [...prevItems]
                newItems[existingIndex] = updatedItem
                return newItems
              } else {
                // Add new item
                return [...prevItems, updatedItem]
              }
            })
          }
          
          // Also fetch from server to ensure we have the latest data
          try {
            const { getInventoryItems } = await import('@/app/actions/inventory')
            const updatedItems = await getInventoryItems(isArchivedView)
            setItems(updatedItems)
          } catch (error) {
            console.error('Failed to refresh inventory:', error)
            // Fallback: refresh the page if fetch fails
            router.refresh()
          }
        }}
      />

      <InventoryCategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open)
          if (!open) {
            router.refresh()
          }
        }}
        categories={categories}
        onCategoriesUpdated={async (newCategory?: { id: string; name: string }) => {
          // If a new category was created, add it to the list immediately
          if (newCategory) {
            setCategories((prev) => {
              // Check if category already exists
              const exists = prev.some(cat => cat.name === newCategory.name)
              if (exists) return prev
              return [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))
            })
          }
          
          // Fetch updated categories from server
          try {
            const { getInventoryCategories } = await import('@/app/actions/inventory')
            const updatedCategories = await getInventoryCategories()
            // Use server categories as source of truth (this will reflect deletions)
            setCategories(updatedCategories.sort((a, b) => a.name.localeCompare(b.name)))
          } catch (error) {
            console.error('Failed to refresh categories:', error)
            // If fetch fails and we have a new category, keep it
            if (newCategory) {
              setCategories((prev) => {
                const exists = prev.some(cat => cat.name === newCategory.name)
                if (exists) return prev
                return [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))
              })
            }
          }
          // Also refresh the page data in the background
          router.refresh()
        }}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={itemToArchive !== null} onOpenChange={(open) => !open && setItemToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this item? You can restore it later from the archived view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToArchive && handleArchive(itemToArchive)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={itemToRestore !== null} onOpenChange={(open) => !open && setItemToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this item? It will be moved back to the active inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToRestore && handleRestore(itemToRestore)}
              className="bg-green-600 hover:bg-green-700"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this item? This action cannot be undone. Consider archiving instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handleDelete(itemToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
