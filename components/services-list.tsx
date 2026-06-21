'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Settings, Edit, Trash2, Clock, DollarSign, Sparkles, Image as ImageIcon, ChevronDown, Archive, RotateCcw, GripVertical } from 'lucide-react'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { archiveService, restoreService, deleteService, reorderServiceCategories } from '@/app/actions/services'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { ServiceDialog } from '@/components/service-dialog'
import { CategoryDialog } from '@/components/category-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface ServicesListProps {
  initialServices: any[]
  initialCategories: any[]
  view?: string
}

const colorMap: Record<string, string> = {
  pink: 'bg-pink-100 border-pink-300',
  purple: 'bg-purple-100 border-purple-300',
  blue: 'bg-pink-100 border-pink-300',
  green: 'bg-green-100 border-green-300',
  orange: 'bg-orange-100 border-orange-300',
  red: 'bg-red-100 border-red-300',
  yellow: 'bg-yellow-100 border-yellow-300',
}

export function ServicesList({ initialServices, initialCategories, view }: ServicesListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [services, setServices] = useState(initialServices)
  const [categories, setCategories] = useState(initialCategories)
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [serviceToArchive, setServiceToArchive] = useState<string | null>(null)
  const [serviceToRestore, setServiceToRestore] = useState<string | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const isArchivedView = view === 'archived'
  const draggedCategoryRef = useRef<string | null>(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null)

  // Track which categories are expanded (default: all expanded)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const grouped = services.reduce((acc, service) => {
      const categoryName = service.category?.name || 'Uncategorized'
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

  const handleArchive = async (id: string) => {
    try {
      await archiveService(id)
      // Remove from local state immediately (it will move to archived view)
      setServices(prevServices => prevServices.filter((s) => s && s.id !== id))
      setServiceToArchive(null)
      toast({
        title: 'Success',
        description: 'Service archived successfully',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive service',
        variant: 'destructive',
      })
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await restoreService(id)
      // Remove from local state immediately (it will move to active view)
      setServices(services.filter((s) => s.id !== id))
      setServiceToRestore(null)
      toast({
        title: 'Success',
        description: 'Service restored successfully',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore service',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteService(id)
      setServices(services.filter((s) => s.id !== id))
      setServiceToDelete(null)
      toast({
        title: 'Success',
        description: 'Service permanently deleted',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete service',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (service: any) => {
    setSelectedService(service)
    setIsServiceDialogOpen(true)
  }

  const handleCreate = () => {
    setSelectedService(null)
    setIsServiceDialogOpen(true)
  }

  // Filter services by archive status (client-side safety check)
  // Handle cases where isArchived might be undefined/null
  const filteredServices = (services || []).filter(service => {
    if (!service) return false
    const isArchived = Boolean(service.isArchived)
    return isArchivedView ? isArchived : !isArchived
  })

  const groupedServices = filteredServices.reduce((acc, service) => {
    if (!service) return acc
    const categoryName = service.category?.name || 'Uncategorized'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(service)
    return acc
  }, {} as Record<string, any[]>)

  const categoriesWithServices = useMemo(() => {
    const keys = new Set(Object.keys(groupedServices))
    const ordered = [...categories]
      .filter((c) => keys.has(c.name))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    const rows: { id: string; name: string; draggable: boolean }[] = ordered.map((c) => ({
      id: c.id,
      name: c.name,
      draggable: true,
    }))
    const covered = new Set(ordered.map((c) => c.name))
    for (const name of [...keys]
      .filter((n) => n !== 'Uncategorized' && !covered.has(n))
      .sort((a, b) => a.localeCompare(b))) {
      const first = (groupedServices[name] as any[])?.[0]
      const cid = first?.category?.id
      if (cid) rows.push({ id: cid, name, draggable: true })
    }
    if (keys.has('Uncategorized')) {
      rows.push({ id: '__uncategorized__', name: 'Uncategorized', draggable: false })
    }
    return rows
  }, [categories, groupedServices])

  const handleCategoryDrop = useCallback(
    async (targetId: string) => {
      const dragId = draggedCategoryRef.current
      draggedCategoryRef.current = null
      setDragOverCategoryId(null)
      if (!dragId || dragId === targetId || dragId === '__uncategorized__' || targetId === '__uncategorized__') {
        return
      }
      const orderIds = categoriesWithServices.filter((r) => r.draggable).map((r) => r.id)
      const from = orderIds.indexOf(dragId)
      const to = orderIds.indexOf(targetId)
      if (from < 0 || to < 0) return
      const next = [...orderIds]
      next.splice(from, 1)
      next.splice(to, 0, dragId)
      try {
        await reorderServiceCategories(next)
        const { getCategories } = await import('@/app/actions/services')
        setCategories(await getCategories())
        toast({
          title: 'Category order saved',
          description: 'This is how categories appear on your public booking page.',
        })
        router.refresh()
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to save order',
          variant: 'destructive',
        })
      }
    },
    [categoriesWithServices, router, toast]
  )

  return (
    <div className="flex flex-col h-full space-y-3 overflow-y-auto">
      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isArchivedView && (
          <>
            <Button onClick={handleCreate} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              New Service
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
            const url = isArchivedView ? '/app/services' : '/app/services?view=archived'
            router.push(url)
            // Refresh services after navigation
            setTimeout(async () => {
              try {
                const { getServices } = await import('@/app/actions/services')
                const updatedServices = await getServices(!isArchivedView)
                setServices(updatedServices)
              } catch (error) {
                console.error('Failed to refresh services:', error)
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

      {Object.keys(groupedServices).length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No services yet. Create your first service!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {categoriesWithServices.map(({ id: categoryId, name: categoryName, draggable }) => {
            const categoryServices = groupedServices[categoryName] as any[] | undefined
            if (!categoryServices?.length) return null
            const isExpanded = expandedCategories[categoryName] !== false // Default to true
            const services = categoryServices
            const showDrag = !isArchivedView && draggable
            return (
              <div
                key={categoryId}
                className={`border border-gray-200 rounded-lg overflow-hidden shadow-sm ${
                  dragOverCategoryId === categoryId && showDrag ? 'ring-2 ring-primary/30' : ''
                }`}
              >
                {/* Category Header — drag handle + expand */}
                <div
                  className="w-full flex items-stretch bg-white border-b border-gray-200"
                  onDragOver={(e) => {
                    if (!showDrag) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverCategoryId(categoryId)
                  }}
                  onDragLeave={(e) => {
                    if (!showDrag) return
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverCategoryId((prev) => (prev === categoryId ? null : prev))
                    }
                  }}
                  onDrop={(e) => {
                    if (!showDrag) return
                    e.preventDefault()
                    handleCategoryDrop(categoryId)
                  }}
                >
                  {showDrag && (
                    <span
                      draggable
                      onDragStart={(e) => {
                        draggedCategoryRef.current = categoryId
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', categoryId)
                      }}
                      onDragEnd={() => {
                        draggedCategoryRef.current = null
                        setDragOverCategoryId(null)
                      }}
                      className="flex items-center px-2 py-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none select-none"
                      aria-label="Drag to reorder category"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCategory(categoryName)}
                    className="flex-1 flex items-center justify-between min-w-0 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      {categoryName}
                      <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                        ({services.length})
                      </span>
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 shrink-0 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Category Content - Collapsible */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <div className="p-4">
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {services.map((service) => (
                  <Card
                    key={service.id}
                    className={`overflow-hidden transition-all hover:shadow-lg border-gray-200 shadow-sm flex flex-col h-full ${colorMap[service.colorTag] || colorMap.blue} ${!service.isActive ? 'opacity-60' : ''}`}
                  >
                    {/* Image Section - Reduced height */}
                    <div className="relative h-28 bg-gray-200 overflow-hidden">
                      {service.imageUrl ? (
                        <>
                          <img
                            src={service.imageUrl.startsWith('http') ? service.imageUrl : service.imageUrl.startsWith('/') ? service.imageUrl : `/${service.imageUrl}`}
                            alt={service.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Replace with placeholder on error
                              const img = e.currentTarget as HTMLImageElement
                              img.style.display = 'none'
                              const placeholder = img.nextElementSibling as HTMLElement
                              if (placeholder) {
                                placeholder.style.display = 'flex'
                              }
                            }}
                          />
                          {/* Fallback placeholder - hidden by default */}
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 hidden">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      {!service.isActive && (
                        <div className="absolute top-1 right-1">
                          <Badge variant="secondary" className="text-xs px-1 py-0">Inactive</Badge>
                        </div>
                      )}
                    </div>

                    <CardHeader className="pb-1 pt-2 px-3">
                      <CardTitle className="text-sm font-semibold leading-tight line-clamp-1">{service.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="px-3 pb-3 flex-1 flex flex-col min-h-0 gap-y-1.5">
                      {/* Compact info display - stack time then price for neat alignment */}
                      <div className="text-xs space-y-1 min-h-[2.75rem]">
                        <div className="flex items-center gap-1 min-w-0">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium whitespace-nowrap">
                            {formatDuration(service.durationMinutes, service.durationUnit)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-bold whitespace-nowrap">{formatCurrency(service.price)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs min-h-[1.5rem] shrink-0">
                        <Sparkles className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                        <span className="font-medium text-yellow-600">
                          {service.pointsWorth || 0} pts
                        </span>
                      </div>

                      {/* Compact buttons - grid keeps buttons inside narrow cards */}
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-300 mt-auto">
                        {!isArchivedView && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(service)}
                              className="w-full gap-1 h-7 text-xs px-2"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setServiceToArchive(service.id)}
                              className="w-full gap-1 h-7 text-xs px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <Archive className="h-3 w-3" />
                              Archive
                            </Button>
                          </>
                        )}
                        {isArchivedView && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setServiceToRestore(service.id)}
                              className="w-full gap-1 h-7 text-xs px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setServiceToDelete(service.id)}
                              className="w-full gap-1 h-7 text-xs px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ServiceDialog
        open={isServiceDialogOpen}
        onOpenChange={(open) => {
          setIsServiceDialogOpen(open)
          if (!open) {
            setSelectedService(null)
            // Refresh services when dialog closes
            router.refresh()
          }
        }}
        service={selectedService}
        categories={categories}
        onCategoriesUpdated={(updatedCategories) => {
          setCategories(updatedCategories)
        }}
        onServiceUpdated={async () => {
          // Fetch updated services immediately for instant feedback
          try {
            const { getServices } = await import('@/app/actions/services')
            const updatedServices = await getServices(isArchivedView)
            // Ensure we only show services matching the current view
            const filtered = updatedServices.filter(service => {
              const isArchived = service.isArchived === true
              return isArchivedView ? isArchived : !isArchived
            })
            setServices(filtered)
          } catch (error) {
            console.error('Failed to refresh services:', error)
          }
        }}
      />

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open)
          if (!open) {
            // Refresh categories when dialog closes
            router.refresh()
          }
        }}
        categories={categories}
        onCategoriesUpdated={async () => {
          // Fetch updated categories immediately for instant feedback
          try {
            const { getCategories } = await import('@/app/actions/services')
            const updatedCategories = await getCategories()
            setCategories(updatedCategories)
          } catch (error) {
            console.error('Failed to refresh categories:', error)
          }
          // Also refresh the page data in the background
          router.refresh()
        }}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={serviceToArchive !== null} onOpenChange={(open) => !open && setServiceToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this service? You can restore it later from the archived view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => serviceToArchive && handleArchive(serviceToArchive)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={serviceToRestore !== null} onOpenChange={(open) => !open && setServiceToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this service? It will be moved back to the active services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => serviceToRestore && handleRestore(serviceToRestore)}
              className="bg-green-600 hover:bg-green-700"
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={serviceToDelete !== null} onOpenChange={(open) => !open && setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this service? This action cannot be undone. Consider archiving instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => serviceToDelete && handleDelete(serviceToDelete)}
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
