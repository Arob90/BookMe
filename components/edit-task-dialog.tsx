'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateTask } from '@/app/actions/tasks'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import {
  formatTaskAppointmentPickLabel,
  type TaskAppointmentPick,
} from '@/components/add-task-dialog'

type TaskLike = {
  id: string
  title: string
  notes?: string | null
  dueAt: string | Date
  appointmentId?: string | null
  appointment?: TaskAppointmentPick | null
}

function formatForInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function EditTaskDialog({
  open,
  onOpenChange,
  task,
  appointments = [],
  onViewAppointment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: TaskLike | null
  appointments?: TaskAppointmentPick[]
  onViewAppointment?: (appointmentId: string) => void
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [linkedAppointmentId, setLinkedAppointmentId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !task) return
    setTitle(task.title ?? '')
    setNotes(task.notes ?? '')
    const d = task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt)
    setDueAt(Number.isNaN(d.getTime()) ? '' : formatForInput(d))
    setLinkedAppointmentId(task.appointmentId?.trim() ?? '')
  }, [open, task])

  const handleSave = async () => {
    if (!task) return
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Please enter a task title', variant: 'destructive' })
      return
    }
    if (!dueAt) {
      toast({ title: 'Error', description: 'Please select a due date and time', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      await updateTask(task.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueAt: new Date(dueAt).toISOString(),
        appointmentId: linkedAppointmentId.trim() || null,
      })
      toast({ title: 'Saved', description: 'Task updated' })
      router.refresh()
      onOpenChange(false)
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-task-title">Title</Label>
            <Input
              id="edit-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-task-due">Due date & time</Label>
            <Input id="edit-task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          {appointments.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to appointment</Label>
              <Select
                value={linkedAppointmentId || '__none__'}
                onValueChange={(v) => setLinkedAppointmentId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None — general task</SelectItem>
                  {appointments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {formatTaskAppointmentPickLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {linkedAppointmentId && onViewAppointment ? (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-sm text-pink-700"
              onClick={() => onViewAppointment(linkedAppointmentId)}
            >
              Open linked appointment
            </Button>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="edit-task-notes">Notes (optional)</Label>
            <Textarea
              id="edit-task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting || !task}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
