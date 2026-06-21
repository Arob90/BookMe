'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createInventoryItem, updateInventoryItem, createInventoryCategory, getInventoryCategories } from '@/app/actions/inventory'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Package, Upload, X, Plus } from 'lucide-react'

interface InventoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: any
  categories?: Array<{ id: string; name: string }>
  onItemUpdated?: (updatedItem?: any) => void
  onCategoriesUpdated?: (categories: Array<{ id: string; name: string }>) => void
}

export function InventoryDialog({ open, onOpenChange, item, categories = [], onItemUpdated, onCategoriesUpdated }: InventoryDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [localCategories, setLocalCategories] = useState(categories)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategoryLoading, setIsCreatingCategoryLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    imageUrl: '',
    quantity: 0,
    minQuantity: 0,
    unit: 'unit',
    cost: undefined as number | undefined,
    supplier: '',
    expiryDate: '',
    location: '',
    notes: '',
    isActive: true,
  })

  // Update local categories when prop changes
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

  useEffect(() => {
    if (open) {
      if (item) {
        // Format imageUrl to ensure it's properly displayed
        const imageUrl = item.imageUrl || ''
        const formattedImageUrl = imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') 
          ? `/${imageUrl}` 
          : imageUrl
        
        setFormData({
          name: item.name || '',
          category: item.category || '',
          description: item.description || '',
          imageUrl: formattedImageUrl,
          quantity: item.quantity || 0,
          minQuantity: item.minQuantity || 0,
          unit: item.unit || 'unit',
          cost: item.cost ? Number(item.cost) : undefined,
          supplier: item.supplier || '',
          expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
          location: item.location || '',
          notes: item.notes || '',
          isActive: item.isActive !== undefined ? item.isActive : true,
        })
        setImagePreview(formattedImageUrl)
        setSelectedFile(null)
        // Clear file input
        const fileInput = document.getElementById('file-upload-inventory') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setFormData({
          name: '',
          category: '',
          description: '',
          imageUrl: '',
          quantity: 0,
          minQuantity: 0,
          unit: 'unit',
          cost: undefined,
          supplier: '',
          expiryDate: '',
          location: '',
          notes: '',
          isActive: true,
        })
        setImagePreview('')
        setSelectedFile(null)
        // Clear file input
        const fileInput = document.getElementById('file-upload-inventory') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    }
  }, [open, item])

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
      const newCategory = await createInventoryCategory({ name: newCategoryName.trim() })
      
      // Refresh categories
      const updatedCategories = await getInventoryCategories()
      setLocalCategories(updatedCategories)
      
      // Select the newly created category
      setFormData({ ...formData, category: newCategory.name })
      
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
      uploadFormData.append('type', 'inventory') // Specify upload type

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
      console.log('Storing imageUrl (without leading slash):', imageUrlForStorage)
      
      setFormData((prev) => {
        const updated = { ...prev, imageUrl: imageUrlForStorage }
        console.log('Updated formData.imageUrl to:', updated.imageUrl)
        return updated
      })
      // For preview, add leading slash for display
      const previewUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
      setImagePreview(previewUrl) // Update preview with uploaded image
      console.log('Preview URL:', previewUrl)
      setSelectedFile(null)
      // Clear file input
      const fileInput = document.getElementById('file-upload-inventory') as HTMLInputElement
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

    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Name is required',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Ensure imageUrl is included and properly formatted
      // Remove leading slash before saving (server will handle path formatting)
      let imageUrlToSave = formData.imageUrl
      if (imageUrlToSave && imageUrlToSave.startsWith('/')) {
        imageUrlToSave = imageUrlToSave.substring(1)
      }
      
      // Build submitData, ensuring imageUrl is included if it exists
      const submitData: any = {
        name: formData.name,
        category: formData.category || undefined,
        description: formData.description || undefined,
        quantity: formData.quantity,
        minQuantity: formData.minQuantity,
        unit: formData.unit,
        cost: formData.cost || undefined,
        supplier: formData.supplier || undefined,
        expiryDate: formData.expiryDate || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
      }
      
      // Always include imageUrl in the update (even if empty, to allow clearing it)
      if (item) {
        // When updating, always include imageUrl field
        // Convert empty string to null for proper database handling
        submitData.imageUrl = imageUrlToSave && imageUrlToSave.trim() !== '' ? imageUrlToSave : null
      } else {
        // When creating, only include if it has a value, otherwise send null
        submitData.imageUrl = imageUrlToSave && imageUrlToSave.trim() !== '' ? imageUrlToSave : null
      }
      
      console.log('Submitting inventory item with imageUrl:', submitData.imageUrl)

      let updatedItem
      if (item) {
        updatedItem = await updateInventoryItem(item.id, submitData)
        toast({
          title: 'Success',
          description: 'Inventory item updated successfully',
        })
      } else {
        updatedItem = await createInventoryItem(submitData)
        toast({
          title: 'Success',
          description: 'Inventory item created successfully',
        })
      }
      
      // Close dialog first
      onOpenChange(false)
      
      // Call the callback to update the parent component immediately
      // Pass the updated item data for optimistic update
      if (onItemUpdated) {
        onItemUpdated(updatedItem)
      }
      
      // Also refresh the router to ensure server data is synced
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save inventory item',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const unitOptions = ['unit', 'box', 'bottle', 'pack', 'piece', 'set', 'gallon', 'liter', 'kg', 'lb']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-4 w-4" />
            {item ? 'Edit Inventory Item' : 'Create New Inventory Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Nail Polish, Lotion"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <div className="space-y-2">
                <Select
                  value={formData.category || undefined}
                  onValueChange={(value) => {
                    if (value === '__create_new__') {
                      setIsCreatingCategory(true)
                    } else {
                      setFormData({ ...formData, category: value })
                    }
                  }}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {localCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
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
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div>
            <Label className="text-sm">Item Image</Label>
            <div className="space-y-2">
              {/* Image Preview */}
              {(imagePreview || formData.imageUrl) && (
                <div className="relative w-full h-40 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <img
                    src={imagePreview || formData.imageUrl || ''}
                    alt="Item preview"
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
                    id="file-upload-inventory"
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
            <div>
              <Label htmlFor="quantity">Current Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="minQuantity">Min Quantity (Reorder Point)</Label>
              <Input
                id="minQuantity"
                type="number"
                min="0"
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <select
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cost" className="text-sm">Cost per Unit</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.cost || ''}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Storage Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Shelf A, Cabinet 2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Item is active
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
