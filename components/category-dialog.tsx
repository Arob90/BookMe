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
import { createCategory, deleteCategory } from '@/app/actions/services'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: any[]
  onCategoriesUpdated?: () => void
}

export function CategoryDialog({ open, onOpenChange, categories, onCategoriesUpdated }: CategoryDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [categoryName, setCategoryName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState(categories)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null)

  // Update local state when categories prop changes
  useEffect(() => {
    setLocalCategories(categories)
  }, [categories])

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
      const newCategory = await createCategory({ name: categoryName.trim() })
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
        onCategoriesUpdated()
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

  const handleDeleteClick = (id: string, name: string) => {
    setCategoryToDelete({ id, name })
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    setDeletingId(categoryToDelete.id)
    try {
      await deleteCategory(categoryToDelete.id)
      // Update local state immediately
      setLocalCategories(localCategories.filter(cat => cat.id !== categoryToDelete.id))
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      })
      setDeleteConfirmOpen(false)
      setCategoryToDelete(null)
      router.refresh()
      if (onCategoriesUpdated) {
        onCategoriesUpdated()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete category',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
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
                placeholder="e.g., Nails, Facials, Massages"
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
                      onClick={() => handleDeleteClick(category.id, category.name)}
                      disabled={deletingId === category.id}
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
              Are you sure you want to delete the category &quot;{categoryToDelete?.name}&quot;?
              {categoryToDelete && (
                <span className="block mt-2 text-xs text-muted-foreground">
                  This action cannot be undone. Services in this category must be reassigned first.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
