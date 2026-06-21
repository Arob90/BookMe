'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { createService, updateService, createCategory, getCategories } from '@/app/actions/services'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Upload, X, Plus } from 'lucide-react'
import { durationToMinutes, minutesToDurationAmount, type DurationUnit } from '@/lib/utils'

interface ServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: any
  categories: any[]
  onServiceUpdated?: () => void
  onCategoriesUpdated?: (categories: any[]) => void
}

export function ServiceDialog({ open, onOpenChange, service, categories, onServiceUpdated, onCategoriesUpdated }: ServiceDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [localCategories, setLocalCategories] = useState(categories)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategoryLoading, setIsCreatingCategoryLoading] = useState(false)
  const DURATION_UNITS: { value: DurationUnit; label: string }[] = [
    { value: 'MINUTES', label: 'Minutes' },
    { value: 'HOURS', label: 'Hours' },
    { value: 'DAYS', label: 'Days' },
    { value: 'MONTHS', label: 'Months' },
    { value: 'YEARS', label: 'Years' },
  ]
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    description: '',
    imageUrl: '',
    durationAmount: 30,
    durationUnit: 'MINUTES' as DurationUnit,
    durationMinutes: 30,
    price: 0,
    pointsWorth: 0,
    colorTag: 'blue',
    isActive: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  // Update local categories when prop changes or dialog opens
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  // Refresh categories when dialog opens to ensure we have the latest data
  useEffect(() => {
    if (open) {
      const refreshCategories = async () => {
        try {
          const updatedCategories = await getCategories()
          setLocalCategories(updatedCategories)
          // Notify parent if callback provided
          if (onCategoriesUpdated) {
            onCategoriesUpdated(updatedCategories)
          }
        } catch (error) {
          console.error('Failed to refresh categories:', error)
          // Fallback to prop categories
          setLocalCategories(categories)
        }
      }
      refreshCategories()
    }
  }, [open])

  useEffect(() => {
    if (open) {
      if (service) {
        // Format imageUrl to ensure it's properly displayed
        const imageUrl = service.imageUrl || ''
        const formattedImageUrl = imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') 
          ? `/${imageUrl}` 
          : imageUrl
        
        const unit = (service.durationUnit || 'MINUTES') as DurationUnit
        const minutes = service.durationMinutes || 30
        setFormData({
          name: service.name || '',
          categoryId: service.categoryId || service.category?.id || '',
          description: service.description || '',
          imageUrl: formattedImageUrl,
          durationAmount: minutesToDurationAmount(minutes, unit),
          durationUnit: unit,
          durationMinutes: minutes,
          price: service.price ? Number(service.price) : 0,
          pointsWorth: service.pointsWorth || 0,
          colorTag: service.colorTag || 'blue',
          isActive: service.isActive !== undefined ? service.isActive : true,
        })
        setImagePreview(formattedImageUrl)
        setSelectedFile(null)
        // Clear file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setFormData({
          name: '',
          categoryId: localCategories[0]?.id || '',
          description: '',
          imageUrl: '',
          durationAmount: 30,
          durationUnit: 'MINUTES',
          durationMinutes: 30,
          price: 0,
          pointsWorth: 0,
          colorTag: 'blue',
          isActive: true,
        })
        setImagePreview('')
        setSelectedFile(null)
        // Clear file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    }
  }, [open, service, localCategories])

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a category name',
        variant: 'destructive',
      })
      return
    }

    setIsCreatingCategoryLoading(true)
    try {
      const newCategory = await createCategory({ name: newCategoryName.trim() })
      
      // Refresh categories
      const updatedCategories = await getCategories()
      setLocalCategories(updatedCategories)
      
      // Select the newly created category
      setFormData({ ...formData, categoryId: newCategory.id })
      
      // Reset category creation UI
      setIsCreatingCategory(false)
      setNewCategoryName('')
      
      // Notify parent if callback provided
      if (onCategoriesUpdated) {
        onCategoriesUpdated(updatedCategories)
      }
      
      toast({
        title: 'Success',
        description: 'Category created successfully',
      })
    } catch (error: any) {
      // If category already exists, refresh the list to show it
      if (error.message?.includes('already exists')) {
        try {
          // Force a fresh fetch with cache busting
          const updatedCategories = await getCategories()
          setLocalCategories(updatedCategories)
          
          // Try to find the category (case-insensitive)
          const trimmedName = newCategoryName.trim()
          let existingCategory = updatedCategories.find(
            (cat: any) => cat.name.toLowerCase() === trimmedName.toLowerCase()
          )
          
          // If not found, try fetching directly from API as a last resort
          if (!existingCategory) {
            try {
              const response = await fetch(`/api/services/categories?name=${encodeURIComponent(trimmedName)}`)
              if (response.ok) {
                const data = await response.json()
                if (data.category) {
                  existingCategory = data.category
                  // Add it to local categories if it's not there
                  if (!updatedCategories.find((c: any) => c.id === existingCategory.id)) {
                    const newCategories = [...updatedCategories, existingCategory].sort((a: any, b: any) => 
                      a.name.localeCompare(b.name)
                    )
                    setLocalCategories(newCategories)
                    if (onCategoriesUpdated) {
                      onCategoriesUpdated(newCategories)
                    }
                  }
                }
              }
            } catch (apiError) {
              console.error('Failed to fetch category from API:', apiError)
            }
          }
          
          if (existingCategory) {
            setFormData({ ...formData, categoryId: existingCategory.id })
            setIsCreatingCategory(false)
            setNewCategoryName('')
            
            // Notify parent
            if (onCategoriesUpdated) {
              onCategoriesUpdated(updatedCategories)
            }
            
            toast({
              title: 'Category Found',
              description: `Category "${existingCategory.name}" already exists and has been selected`,
            })
            return
          } else {
            // Category exists but we can't find it - might be a different business
            toast({
              title: 'Error',
              description: `Category "${trimmedName}" exists but is not available. It may belong to another business.`,
              variant: 'destructive',
            })
            return
          }
        } catch (refreshError) {
          console.error('Failed to refresh categories:', refreshError)
        }
      }
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to create category',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingCategoryLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image size must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('type', 'services') // Specify upload type

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload image')
      }

      const data = await response.json()
      const imageUrl = data.url
      console.log('Upload response URL:', imageUrl)
      
      // Store the imageUrl as returned from the server (without leading slash for storage)
      // The display will add the slash when needed
      const imageUrlForStorage = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl
      console.log('Upload response URL:', imageUrl)
      console.log('Storing imageUrl (without leading slash):', imageUrlForStorage)
      
      setFormData((prev) => {
        const updated = { ...prev, imageUrl: imageUrlForStorage }
        console.log('Updated formData.imageUrl to:', updated.imageUrl)
        console.log('Full formData after update:', JSON.stringify(updated, null, 2))
        return updated
      })
      // For preview, add leading slash for display
      const previewUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
      setImagePreview(previewUrl) // Update preview with uploaded image
      console.log('Preview URL:', previewUrl)
      setSelectedFile(null)
      // Clear file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUrl: '' })
    setImagePreview('')
    setSelectedFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.categoryId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Log current formData state before processing
      console.log('=== SUBMITTING SERVICE ===')
      console.log('Current formData.imageUrl:', formData.imageUrl)
      console.log('Current formData:', JSON.stringify(formData, null, 2))
      
      // Ensure imageUrl is included and properly formatted
      // Remove leading slash before saving (server will handle path formatting)
      let imageUrlToSave = formData.imageUrl
      console.log('Form data imageUrl before processing:', imageUrlToSave)
      
      if (imageUrlToSave && imageUrlToSave.startsWith('/')) {
        imageUrlToSave = imageUrlToSave.substring(1)
      }
      
      const durationMinutes = durationToMinutes(formData.durationAmount, formData.durationUnit)
      const submitData: any = {
        name: formData.name,
        categoryId: formData.categoryId,
        description: formData.description || undefined,
        durationMinutes,
        durationUnit: formData.durationUnit,
        price: formData.price,
        colorTag: formData.colorTag,
        isActive: formData.isActive,
        pointsWorth: formData.pointsWorth || undefined,
      }
      
      // Always include imageUrl in the update (even if empty, to allow clearing it)
      // For updates, we need to explicitly include imageUrl to ensure it's saved
      if (service) {
        // When updating, always include imageUrl field
        submitData.imageUrl = imageUrlToSave && imageUrlToSave.trim() !== '' ? imageUrlToSave : null
      } else {
        // When creating, only include if it has a value
        if (imageUrlToSave && imageUrlToSave.trim() !== '') {
          submitData.imageUrl = imageUrlToSave
        }
      }
      
      console.log('Submitting service with imageUrl:', submitData.imageUrl)
      console.log('Full submitData:', JSON.stringify(submitData, null, 2))
      console.log('Is update?', !!service)
      
      if (service) {
        await updateService(service.id, submitData)
        toast({
          title: 'Success',
          description: 'Service updated successfully',
        })
      } else {
        await createService(submitData)
        toast({
          title: 'Success',
          description: 'Service created successfully',
        })
      }
      // Call the callback to update the services list immediately
      if (onServiceUpdated) {
        onServiceUpdated()
      }
      // Also refresh the router to ensure server data is synced
      router.refresh()
      // Small delay to ensure data is saved before closing
      setTimeout(() => {
        onOpenChange(false)
      }, 100)
      setFormData({
        name: '',
        categoryId: localCategories[0]?.id || '',
        description: '',
        imageUrl: '',
        durationAmount: 30,
        durationUnit: 'MINUTES',
        durationMinutes: 30,
        price: 0,
        pointsWorth: 0,
        colorTag: 'blue',
        isActive: true,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save service',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const colorOptions = [
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'pink', label: 'Pink' },
    { value: 'green', label: 'Green' },
    { value: 'orange', label: 'Orange' },
    { value: 'red', label: 'Red' },
    { value: 'yellow', label: 'Yellow' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">{service ? 'Edit Service' : 'Create New Service'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="categoryId">Category *</Label>
              <div className="space-y-2">
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => {
                    if (value === '__create_new__') {
                      setIsCreatingCategory(true)
                    } else {
                      setFormData({ ...formData, categoryId: value })
                    }
                  }}
                  required
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {localCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__create_new__" className="text-pink-600 font-medium">
                      <Plus className="h-4 w-4 inline mr-2" />
                      Create New Category
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isCreatingCategory && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleCreateCategory()
                          } else if (e.key === 'Escape') {
                            setIsCreatingCategory(false)
                            setNewCategoryName('')
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateCategory}
                      disabled={isCreatingCategoryLoading || !newCategoryName.trim()}
                    >
                      {isCreatingCategoryLoading ? 'Creating...' : 'Create'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsCreatingCategory(false)
                        setNewCategoryName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Service description..."
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm">Service Image</Label>
            <div className="space-y-2">
              {/* Image Preview */}
              {(imagePreview || formData.imageUrl) && (
                <div className="relative w-full h-40 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <img
                    src={imagePreview || (formData.imageUrl ? (formData.imageUrl.startsWith('http') ? formData.imageUrl : formData.imageUrl.startsWith('/') ? formData.imageUrl : `/${formData.imageUrl}`) : '')}
                    alt="Service preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-7 w-7"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* File Upload */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepted: JPG, PNG, GIF. Max size: 5MB
                  </p>
                </div>
                {selectedFile && (
                  <Button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex gap-2">
              <div className="flex-1">
                <Label htmlFor="durationAmount">Duration *</Label>
                <Input
                  id="durationAmount"
                  type="number"
                  min="0.01"
                  // Snap to 0.01 for non-minute units to avoid float drift (e.g. 24.00 -> 24.01)
                  step={formData.durationUnit === 'MINUTES' ? 1 : 0.01}
                  value={formData.durationAmount}
                  onChange={(e) => {
                    const amountRaw = parseFloat(e.target.value)
                    const amount = Number.isFinite(amountRaw) ? amountRaw : 0
                    // Quantize to 2 decimals before converting to minutes (prevents .00 becoming .01)
                    const amountRounded = Math.round(amount * 100) / 100
                    const unit = formData.durationUnit
                    const mins = durationToMinutes(amountRounded, unit)
                    const displayAmount = minutesToDurationAmount(mins, unit)
                    setFormData({ ...formData, durationAmount: displayAmount, durationMinutes: mins })
                  }}
                  required
                />
              </div>
              <div className="w-[120px]">
                <Label htmlFor="durationUnit">Unit</Label>
                <Select
                  value={formData.durationUnit}
                  onValueChange={(value: DurationUnit) => {
                    const amount = formData.durationAmount
                    const mins = durationToMinutes(amount, value)
                    const displayAmount = minutesToDurationAmount(mins, value)
                    setFormData({ ...formData, durationUnit: value, durationMinutes: mins, durationAmount: displayAmount })
                  }}
                >
                  <SelectTrigger id="durationUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="pointsWorth">Points Worth</Label>
              <Input
                id="pointsWorth"
                type="number"
                min="0"
                value={formData.pointsWorth}
                onChange={(e) => setFormData({ ...formData, pointsWorth: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="colorTag">Color Tag</Label>
              <Select
                value={formData.colorTag}
                onValueChange={(value) => setFormData({ ...formData, colorTag: value })}
              >
                <SelectTrigger id="colorTag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
