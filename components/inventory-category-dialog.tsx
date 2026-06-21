'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInventoryCategory, deleteInventoryCategory } from '@/app/actions/inventory'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface InventoryCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Array<{ id: string; name: string }>
  onCategoriesUpdated?: (newCategory?: { id: string; name: string }) => void
}

export function InventoryCategoryDialog({ open, onOpenChange, categories, onCategoriesUpdated }: InventoryCategoryDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [categoryName, setCategoryName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState(categories)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [deletedCategoryNames, setDeletedCategoryNames] = useState<Set<string>>(new Set())

  // Update local state when categories prop changes, but respect deletions
  useEffect(() => {
    setLocalCategories((prev) => {
      // Filter out deleted categories first
      const filtered = prev.filter(cat => !deletedCategoryNames.has(cat.name))
      
      // Then merge with new categories from props
      const merged = [...filtered]
      categories.forEach(cat => {
        // Only add if not deleted and not already in list
        if (!deletedCategoryNames.has(cat.name) && !merged.some(c => c.name === cat.name)) {
          merged.push(cat)
        }
      })
      // Keep the merged list sorted
      return merged.sort((a, b) => a.name.localeCompare(b.name))
    })
  }, [categories, deletedCategoryNames])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a category name',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const newCategory = await createInventoryCategory({ name: categoryName.trim() })
      // Update local state immediately for instant feedback
      setLocalCategories([...localCategories, newCategory])
      toast({
        title: 'Success',
        description: 'Category created successfully',
      })
      setCategoryName('')
      // Refresh in background
      router.refresh()
      if (onCategoriesUpdated) {
        onCategoriesUpdated(newCategory)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create category',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClick = (name: string) => {
    setCategoryToDelete(name)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    setDeletingName(categoryToDelete)
    try {
      await deleteInventoryCategory(categoryToDelete)
      // Mark as deleted to prevent it from reappearing
      setDeletedCategoryNames(prev => new Set([...prev, categoryToDelete]))
      // Update local state immediately - remove the deleted category
      setLocalCategories(prev => prev.filter(cat => cat.name !== categoryToDelete))
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      })
      setDeleteConfirmOpen(false)
      setCategoryToDelete(null)
      router.refresh()
      if (onCategoriesUpdated) {
        // Pass undefined to indicate deletion, not a new category
        onCategoriesUpdated(undefined)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
        variant: 'destructive',
      })
    } finally {
      setDeletingName(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Manage Categories</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <form onSubmit={handleCreate} className="space-y-1.5">
            <Label htmlFor="categoryName" className="text-sm">New Category Name</Label>
            <div className="flex gap-2">
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Tools, Cleaners, Supplies"
              />
              <Button type="submit" disabled={isSubmitting}>
                Add
              </Button>
            </div>
          </form>

          <div className="border-t pt-3">
            <Label className="mb-1.5 block text-sm">Existing Categories</Label>
            {localCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">No categories yet</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {localCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 rounded-md border hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category.name)}
                      disabled={deletingName === category.name}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category &quot;{categoryToDelete}&quot;?
              {categoryToDelete && (
                <span className="block mt-2 text-xs text-muted-foreground">
                  This action cannot be undone. Items in this category must be reassigned first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingName !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingName ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
