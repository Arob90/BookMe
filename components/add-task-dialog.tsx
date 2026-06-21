'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { createTask } from '@/app/actions/tasks'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Phone, Mail, CalendarClock, Plus, Trash2 } from 'lucide-react'
import { getStaffDisplayName } from '@/lib/utils'
import type { TaskActionType } from '@/lib/task-action'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type AddTaskDialogStaffOption = {
  id: string
  firstName: string | null
  lastName: string | null
  userName: string | null
  email: string
  role: 'ADMIN' | 'STAFF'
}

export type AddTaskDialogClientOption = {
  id: string
  firstName: string
  lastName: string
  companyName?: string | null
  type: string
  phone?: string | null
  email?: string | null
}

export type TaskAppointmentPick = {
  id: string
  startAt: Date | string
  client?: {
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    type?: string | null
  } | null
}

export function formatTaskAppointmentPickLabel(a: TaskAppointmentPick) {
  const d = new Date(a.startAt)
  const time = Number.isNaN(d.getTime()) ? '—' : format(d, 'MMM d, h:mm a')
  const c = a.client
  let name = 'Booking'
  if (c) {
    if (c.type === 'COMPANY' && c.companyName?.trim()) name = c.companyName.trim()
    else {
      const n = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
      if (n) name = n
    }
  }
  return `${time} · ${name}`
}

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate?: Date
  initialHour?: number
  initialMinute?: number
  initialTitle?: string
  projectId?: string
  clientPhone?: string | null
  clientEmail?: string | null
  staffOptions?: AddTaskDialogStaffOption[]
  clients?: AddTaskDialogClientOption[]
  initialStaffUserIds?: string[]
  initialClientIds?: string[]
  appointments?: TaskAppointmentPick[]
  initialAppointmentId?: string | null
}

function formatForInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function clientLabel(c: AddTaskDialogClientOption) {
  if (c.type === 'COMPANY' && c.companyName?.trim()) return c.companyName.trim()
  return `${c.firstName} ${c.lastName}`.trim()
}

const ACTION_LABEL: Record<Exclude<TaskActionType, 'task'>, string> = {
  meeting: 'Meeting',
  call: 'Call',
  email: 'Email',
}

export function AddTaskDialog({
  open,
  onOpenChange,
  initialDate,
  initialHour,
  initialMinute,
  initialTitle,
  projectId,
  clientPhone,
  clientEmail,
  staffOptions = [],
  clients = [],
  initialStaffUserIds = [],
  initialClientIds = [],
  appointments = [],
  initialAppointmentId = null,
}: AddTaskDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionMode, setActionMode] = useState<TaskActionType>('task')
  const [staffUserIds, setStaffUserIds] = useState<string[]>([])
  const [clientIds, setClientIds] = useState<string[]>([])
  /** Manual dial numbers beyond selected clients (call action). */
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([''])
  /** Extra CC-style addresses beyond selected clients (email action). */
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([''])
  const [linkedAppointmentId, setLinkedAppointmentId] = useState('')

  const staffKey = initialStaffUserIds.join(',')
  const clientKey = initialClientIds.join(',')
  const initialApptKey = initialAppointmentId ?? ''

  useEffect(() => {
    if (!open) return
    if (initialDate) {
      const date = new Date(initialDate)
      if (initialHour !== undefined) {
        date.setHours(initialHour, initialMinute ?? 0, 0, 0)
        setDueAt(formatForInput(date))
      } else {
        date.setHours(9, 0, 0, 0)
        setDueAt(formatForInput(date))
      }
    } else {
      const now = new Date()
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0)
      if (now.getMinutes() === 60) now.setHours(now.getHours() + 1, 0, 0, 0)
      setDueAt(formatForInput(now))
    }
    setTitle(initialTitle ?? '')
    setNotes('')
    setActionMode('task')
    setStaffUserIds([...new Set(initialStaffUserIds)])
    setClientIds([...new Set(initialClientIds)])
    setAdditionalPhones(clientPhone?.trim() ? [clientPhone.trim()] : [''])
    setAdditionalEmails(clientEmail?.trim() ? [clientEmail.trim()] : [''])
    setLinkedAppointmentId(initialAppointmentId?.trim() ?? '')
  }, [
    open,
    initialDate,
    initialHour,
    initialMinute,
    initialTitle,
    clientPhone,
    clientEmail,
    staffKey,
    clientKey,
    initialApptKey,
  ])

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => clientLabel(a).localeCompare(clientLabel(b))),
    [clients],
  )

  const dueLabel =
    actionMode === 'meeting'
      ? 'Meeting date & time'
      : actionMode === 'call'
        ? 'Scheduled call date & time'
        : actionMode === 'email'
          ? 'Follow-up by (date & time)'
          : 'Due date & time'

  const toggleStaff = (id: string, on: boolean) => {
    setStaffUserIds((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
  }

  const toggleClient = (id: string, on: boolean) => {
    setClientIds((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
  }

  const buildMetadata = () => {
    if (actionMode === 'task') return undefined
    const meta: {
      staffUserIds?: string[]
      clientIds?: string[]
      additionalPhones?: string[]
      additionalEmails?: string[]
    } = {}
    if (staffUserIds.length) meta.staffUserIds = staffUserIds
    if (clientIds.length) meta.clientIds = clientIds
    if (actionMode === 'call') {
      const phones = additionalPhones.map((p) => p.trim()).filter(Boolean)
      if (phones.length) meta.additionalPhones = phones
    }
    if (actionMode === 'email') {
      const extras = additionalEmails.map((e) => e.trim()).filter(Boolean)
      if (extras.length) meta.additionalEmails = extras
    }
    if (
      !meta.staffUserIds &&
      !meta.clientIds &&
      !meta.additionalPhones?.length &&
      !meta.additionalEmails?.length
    ) {
      return undefined
    }
    return meta
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a task title',
        variant: 'destructive',
      })
      return
    }
    if (!dueAt) {
      toast({
        title: 'Error',
        description: 'Please select a date and time',
        variant: 'destructive',
      })
      return
    }
    if (actionMode === 'call') {
      for (const line of additionalPhones) {
        const t = line.trim()
        if (!t) continue
        if (t.length > 80) {
          toast({
            title: 'Error',
            description: 'Each phone number must be 80 characters or less.',
            variant: 'destructive',
          })
          return
        }
      }
    }
    if (actionMode === 'email') {
      for (const line of additionalEmails) {
        const t = line.trim()
        if (!t) continue
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
        if (!ok) {
          toast({
            title: 'Error',
            description: `Invalid email: ${t}`,
            variant: 'destructive',
          })
          return
        }
      }
    }

    setIsSubmitting(true)
    try {
      await createTask({
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueAt: new Date(dueAt).toISOString(),
        projectId,
        appointmentId: linkedAppointmentId.trim() || undefined,
        actionType: actionMode,
        metadata: buildMetadata(),
      })
      toast({ title: 'Success', description: 'Task created successfully' })
      router.refresh()
      onOpenChange(false)
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickActionBtn = (mode: Exclude<TaskActionType, 'task'>, icon: ReactNode, label: string) => {
    const active = actionMode === mode
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`gap-1.5 ${active ? 'border-pink-500 bg-pink-50 text-pink-900 ring-1 ring-pink-400' : ''}`}
        onClick={() => setActionMode(mode)}
      >
        {icon}
        {label}
      </Button>
    )
  }

  const participantPickers =
    actionMode !== 'task' ? (
      <>
        {staffOptions.length > 0 ? (
          <div className="space-y-2">
            <Label>Team members</Label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 p-2">
              {staffOptions.map((s) => {
                const checked = staffUserIds.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 hover:bg-gray-50"
                  >
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleStaff(s.id, v === true)} />
                    <span className="min-w-0 flex-1 truncate text-sm">{getStaffDisplayName(s)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : null}
        {sortedClients.length > 0 ? (
          <div className="space-y-2">
            <Label>Clients</Label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 p-2">
              {sortedClients.map((c) => {
                const checked = clientIds.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 hover:bg-gray-50"
                  >
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleClient(c.id, v === true)} />
                    <span className="min-w-0 flex-1 truncate text-sm">{clientLabel(c)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground leading-snug">
            No clients loaded here — open from Calendar or Pipeline with clients to attach people.
          </p>
        )}
      </>
    ) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
            />
          </div>

          {actionMode === 'task' ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-muted-foreground">Quick actions</p>
              <div className="flex flex-wrap gap-2">
                {quickActionBtn('call', <Phone className="h-3.5 w-3.5" />, 'Call')}
                {quickActionBtn('email', <Mail className="h-3.5 w-3.5" />, 'Email')}
                {quickActionBtn('meeting', <CalendarClock className="h-3.5 w-3.5" />, 'Set meeting')}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Pick an action to add participants and details. Stay on this screen — nothing opens in an external calendar.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
              <span className="text-xs text-muted-foreground">Action</span>
              <Badge variant="secondary" className="font-medium">
                {ACTION_LABEL[actionMode]}
              </Badge>
              <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setActionMode('task')}>
                Change
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-due">{dueLabel}</Label>
            <Input id="task-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-2">
              <Label>Link to appointment (optional)</Label>
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
              <p className="text-[11px] text-muted-foreground leading-snug">
                Tie this task to a booking for context on the calendar, or leave unlinked.
              </p>
            </div>
          ) : null}

          {actionMode === 'call' ? (
            <div className="space-y-2">
              <Label>Phone numbers (optional)</Label>
              <div className="space-y-2">
                {additionalPhones.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="tel"
                      autoComplete="tel"
                      value={line}
                      onChange={(e) => {
                        const v = e.target.value
                        setAdditionalPhones((prev) => {
                          const next = [...prev]
                          next[i] = v
                          return next
                        })
                      }}
                      placeholder="e.g. +501-622-0000"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      disabled={additionalPhones.length <= 1}
                      onClick={() =>
                        setAdditionalPhones((prev) => prev.filter((_, j) => j !== i))
                      }
                      aria-label="Remove phone number"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setAdditionalPhones((prev) => [...prev, ''])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another number
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Use when no client above is selected, or to add extra numbers for this call task.
              </p>
            </div>
          ) : null}

          {actionMode === 'email' ? (
            <div className="space-y-2">
              <Label>Additional emails (optional)</Label>
              <div className="space-y-2">
                {additionalEmails.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="email"
                      autoComplete="email"
                      value={line}
                      onChange={(e) => {
                        const v = e.target.value
                        setAdditionalEmails((prev) => {
                          const next = [...prev]
                          next[i] = v
                          return next
                        })
                      }}
                      placeholder="name@example.com"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      disabled={additionalEmails.length <= 1}
                      onClick={() =>
                        setAdditionalEmails((prev) => prev.filter((_, j) => j !== i))
                      }
                      aria-label="Remove email"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => setAdditionalEmails((prev) => [...prev, ''])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another email
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Selected clients still use their profile emails; these are extra addresses for this follow-up.
              </p>
            </div>
          ) : null}

          {participantPickers}

          <div className="space-y-2">
            <Label htmlFor="task-notes">Notes (optional)</Label>
            <Textarea
              id="task-notes"
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
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Add Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
