'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { formatCurrency, getStaffDisplayName } from '@/lib/utils'
import { getEstimatedDueFromBooking, getProjectScheduleDisplay } from '@/lib/project-schedule'
import { getProject, updateProject, setProjectAssignees, setProjectStage } from '@/app/actions/projects'
import { toggleTaskComplete, deleteTask } from '@/app/actions/tasks'
import { deleteReminder, toggleReminderComplete } from '@/app/actions/reminders'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  CheckSquare,
  Bell,
  Plus,
  Trash2,
  FileText,
  Users,
  Kanban,
} from 'lucide-react'
import { AddTaskDialog, type TaskAppointmentPick } from '@/components/add-task-dialog'
import { AddReminderDialog } from '@/components/add-reminder-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function getAmount(amount: unknown): number | null {
  if (amount == null) return null
  if (typeof amount === 'number') return amount
  if (typeof amount === 'string') return parseFloat(amount)
  if (typeof (amount as { toNumber?: () => number }).toNumber === 'function') {
    return (amount as { toNumber: () => number }).toNumber()
  }
  return null
}

const PLAN_UNITS = ['MINUTES', 'HOURS', 'DAYS', 'MONTHS', 'YEARS'] as const

type StaffOption = {
  id: string
  firstName: string | null
  lastName: string | null
  userName: string | null
  email: string
  profilePhoto: string | null
  role: 'ADMIN' | 'STAFF'
}

export type PipelineStageOption = {
  id: string
  name: string
  color: string
  sortOrder: number
}

/** Stage color → dot on pipeline pill (keeps labels one neutral tone). */
const STAGE_DOT: Record<string, string> = {
  gray: 'bg-gray-400',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-amber-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
}

interface ProjectDetailModalProps {
  projectId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  staffOptions: StaffOption[]
  pipelineStages: PipelineStageOption[]
  clients: Array<{
    id: string
    firstName: string
    lastName: string
    companyName?: string | null
    type: string
    phone?: string | null
    email?: string | null
  }>
}

export function ProjectDetailModal({
  projectId,
  open,
  onOpenChange,
  staffOptions,
  pipelineStages,
  clients,
}: ProjectDetailModalProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [project, setProject] = useState<Awaited<ReturnType<typeof getProject>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [savingStage, setSavingStage] = useState(false)
  const [planMinutes, setPlanMinutes] = useState('')
  const [planUnit, setPlanUnit] = useState<string>('MINUTES')
  const [dueDateStr, setDueDateStr] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  useEffect(() => {
    if (open && projectId) {
      setLoading(true)
      getProject(projectId)
        .then((p) => {
          setProject(p)
          setNotes(p.notes ?? '')
        })
        .catch(() => toast({ title: 'Failed to load project', variant: 'destructive' }))
        .finally(() => setLoading(false))
    } else {
      setProject(null)
    }
  }, [open, projectId, toast])

  useEffect(() => {
    if (!project) return
    if (getEstimatedDueFromBooking(project)) {
      setPlanMinutes('')
      setPlanUnit('MINUTES')
      setDueDateStr('')
      return
    }
    const pm = project.plannedDurationMinutes
    setPlanMinutes(pm != null && Number.isFinite(Number(pm)) ? String(pm) : '')
    setPlanUnit(project.plannedDurationUnit || 'MINUTES')
    if (project.estimatedDueAt) {
      const d = new Date(project.estimatedDueAt as string | Date)
      if (!Number.isNaN(d.getTime())) {
        setDueDateStr(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        )
      } else setDueDateStr('')
    } else setDueDateStr('')
  }, [project])

  const projectAppointmentLinkOptions = useMemo((): TaskAppointmentPick[] => {
    const apt = project?.appointmentService?.appointment
    if (!apt?.id) return []
    return [{ id: apt.id, startAt: apt.startAt, client: apt.client }]
  }, [project])

  const handleSaveNotes = async () => {
    if (!projectId) return
    setSavingNotes(true)
    try {
      await updateProject(projectId, { notes })
      toast({ title: 'Notes saved' })
      router.refresh()
      const p = await getProject(projectId)
      setProject(p)
    } catch {
      toast({ title: 'Failed to save notes', variant: 'destructive' })
    } finally {
      setSavingNotes(false)
    }
  }

  const handleToggleTask = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId)
      router.refresh()
      if (projectId) {
        const p = await getProject(projectId)
        setProject(p)
      }
    } catch {
      toast({ title: 'Failed to update task', variant: 'destructive' })
    }
  }

  const handleToggleReminder = async (reminderId: string) => {
    try {
      await toggleReminderComplete(reminderId)
      router.refresh()
      if (projectId) {
        const p = await getProject(projectId)
        setProject(p)
      }
    } catch {
      toast({ title: 'Failed to update reminder', variant: 'destructive' })
    }
  }

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    try {
      await deleteTask(taskId)
      toast({ title: 'Task deleted' })
      router.refresh()
      if (projectId) {
        const p = await getProject(projectId)
        setProject(p)
      }
    } catch {
      toast({ title: 'Failed to delete task', variant: 'destructive' })
    }
  }

  const handleDeleteReminder = async (e: React.MouseEvent, reminderId: string) => {
    e.stopPropagation()
    try {
      await deleteReminder(reminderId)
      toast({ title: 'Reminder deleted' })
      router.refresh()
      if (projectId) {
        const p = await getProject(projectId)
        setProject(p)
      }
    } catch {
      toast({ title: 'Failed to delete reminder', variant: 'destructive' })
    }
  }

  const refreshProject = async () => {
    if (projectId) {
      const p = await getProject(projectId)
      setProject(p)
    }
  }

  const handleSelectStage = async (targetStageId: string) => {
    if (!projectId || !project || savingStage) return
    if (targetStageId === project.stageId) return
    setSavingStage(true)
    try {
      await setProjectStage(projectId, targetStageId)
      toast({ title: 'Stage updated' })
      router.refresh()
      await refreshProject()
    } catch {
      toast({ title: 'Could not update stage', variant: 'destructive' })
    } finally {
      setSavingStage(false)
    }
  }

  const handleSavePlan = async () => {
    if (!projectId || !project) return
    if (getEstimatedDueFromBooking(project)) {
      toast({
        title: 'Timeline is fixed',
        description: 'This card is linked to an appointment — duration and due time come from the booking.',
      })
      return
    }
    setSavingPlan(true)
    try {
      const raw = planMinutes.trim()
      const mins = raw === '' ? null : Math.round(parseFloat(raw))
      let estimatedDueAt: Date | null = null
      if (dueDateStr.trim()) {
        const [y, mo, d] = dueDateStr.split('-').map(Number)
        estimatedDueAt = new Date(y, mo - 1, d)
        if (Number.isNaN(estimatedDueAt.getTime())) estimatedDueAt = null
      }
      await updateProject(projectId, {
        plannedDurationMinutes:
          mins != null && !Number.isNaN(mins) && mins > 0 ? mins : null,
        plannedDurationUnit: planUnit || 'MINUTES',
        estimatedDueAt,
      })
      toast({ title: 'Timeline saved' })
      router.refresh()
      await refreshProject()
    } catch {
      toast({ title: 'Failed to save timeline', variant: 'destructive' })
    } finally {
      setSavingPlan(false)
    }
  }

  const toggleTeamMember = async (userId: string, checked: boolean) => {
    if (!projectId || !project) return
    const ids = new Set(
      (project.assignees ?? []).map((a: { userId: string }) => a.userId),
    )
    if (checked) ids.add(userId)
    else ids.delete(userId)
    setSavingTeam(true)
    try {
      await setProjectAssignees(projectId, [...ids])
      toast({ title: 'Team updated' })
      router.refresh()
      await refreshProject()
    } catch {
      toast({ title: 'Could not update team', variant: 'destructive' })
    } finally {
      setSavingTeam(false)
    }
  }

  if (!projectId) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : project ? (
            <div className="space-y-5">
              {/* Details */}
              <div className="space-y-2 border-b pb-4">
                <h3 className="text-base font-bold text-gray-900">
                  {project.clientName || project.title}
                </h3>
                <dl className="space-y-1.5 text-sm">
                  {project.clientName && (
                    <div className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0">
                      <dt className="text-muted-foreground">Client</dt>
                      <dd className="min-w-0 text-gray-900">{project.clientName}</dd>
                    </div>
                  )}
                  <div className="grid grid-cols-[5.5rem_1fr] gap-x-2">
                    <dt className="text-muted-foreground">Service</dt>
                    <dd className="min-w-0 break-words text-gray-900">{project.title}</dd>
                  </div>
                  {getAmount(project.amount) != null && (
                    <div className="grid grid-cols-[5.5rem_1fr] gap-x-2">
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="font-semibold text-pink-600">{formatCurrency(getAmount(project.amount))}</dd>
                    </div>
                  )}
                  {(() => {
                    const booking = getEstimatedDueFromBooking(project)
                    const sched = getProjectScheduleDisplay(project)
                    const desc = project.description?.trim()
                    const isAutoAppointmentDesc = !!desc && /^Appointment:\s*/i.test(desc)
                    if (booking) {
                      return (
                        <>
                          <div className="grid grid-cols-[5.5rem_1fr] gap-x-2">
                            <dt className="text-muted-foreground">Appointment</dt>
                            <dd className="text-gray-900">{format(booking.startAt, 'MMM d, yyyy h:mm a')}</dd>
                          </div>
                          <div className="grid grid-cols-[5.5rem_1fr] gap-x-2">
                            <dt className="text-muted-foreground">Duration</dt>
                            <dd className="text-gray-900">{booking.durationLabel}</dd>
                          </div>
                          <div className="grid grid-cols-[5.5rem_1fr] gap-x-2">
                            <dt className="text-muted-foreground">Est. due</dt>
                            <dd className="font-medium text-gray-900">
                              {format(booking.estimatedDue, 'MMM d, yyyy h:mm a')}
                            </dd>
                          </div>
                          {desc && !isAutoAppointmentDesc ? (
                            <p className="border-t border-gray-100 pt-2 text-xs text-muted-foreground">{desc}</p>
                          ) : null}
                        </>
                      )
                    }
                    return (
                      <>
                        {sched.durationLabel ? (
                          <div className="grid grid-cols-[5.5rem_1fr] gap-x-2">
                            <dt className="text-muted-foreground">Duration</dt>
                            <dd className="text-gray-900">{sched.durationLabel}</dd>
                          </div>
                        ) : null}
                        {sched.dueAt ? (
                          <div className="grid grid-cols-[5.5rem_1fr] gap-x-2">
                            <dt className="text-muted-foreground">Est. due</dt>
                            <dd className="font-medium text-gray-900">
                              {format(sched.dueAt, 'MMM d, yyyy')}
                            </dd>
                          </div>
                        ) : null}
                        {desc && !isAutoAppointmentDesc ? (
                          <p className="mt-1 text-xs text-muted-foreground">{project.description}</p>
                        ) : null}
                      </>
                    )
                  })()}
                </dl>
              </div>

              {project && !getEstimatedDueFromBooking(project) ? (
                <div className="rounded-xl border border-border/60 bg-muted/15 p-3 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Timeline (optional)</h4>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Set a planned duration and target due date — they appear on pipeline cards, same as for
                    appointment-linked projects.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Duration amount</label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="h-9 text-sm"
                        placeholder="e.g. 40"
                        value={planMinutes}
                        onChange={(e) => setPlanMinutes(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Unit</label>
                      <Select value={planUnit} onValueChange={setPlanUnit}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLAN_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u.toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Target due date</label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={dueDateStr}
                      onChange={(e) => setDueDateStr(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-pink-600 hover:bg-pink-700"
                    disabled={savingPlan}
                    onClick={handleSavePlan}
                  >
                    {savingPlan ? 'Saving…' : 'Save timeline'}
                  </Button>
                </div>
              ) : null}

              {/* Pipeline stage */}
              {pipelineStages.length > 0 ? (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <h4 className="mb-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Kanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                    Stage
                  </h4>
                  <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
                    Tap a stage to move this card — same as dragging on the board.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...pipelineStages]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((stage) => {
                        const dot = STAGE_DOT[stage.color] ?? STAGE_DOT.gray
                        const isCurrent = stage.id === project.stageId
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            disabled={savingStage}
                            onClick={() => handleSelectStage(stage.id)}
                            className={
                              isCurrent
                                ? 'inline-flex max-w-full min-h-[2.25rem] items-center gap-2 rounded-full border border-pink-300 bg-pink-50/90 px-3 py-1.5 text-left text-xs font-medium text-gray-900 shadow-sm transition hover:bg-pink-50 disabled:opacity-60'
                                : 'inline-flex max-w-full min-h-[2.25rem] items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition hover:border-muted-foreground/25 hover:bg-muted/40 hover:text-foreground disabled:opacity-60'
                            }
                          >
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
                            <span className="min-w-0 break-words">{stage.name}</span>
                          </button>
                        )
                      })}
                  </div>
                </div>
              ) : null}

              {/* Team (admin / staff on project) */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                  <Users className="h-4 w-4" />
                  Team
                </h4>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2 space-y-2">
                  {staffOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-1">No team members found.</p>
                  ) : (
                    staffOptions.map((s) => {
                      const checked = (project.assignees ?? []).some(
                        (a: { userId: string }) => a.userId === s.id,
                      )
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-100 cursor-pointer hover:bg-gray-50/80"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={savingTeam}
                            onCheckedChange={(v) => toggleTeamMember(s.id, v === true)}
                          />
                          <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">
                            {getStaffDisplayName(s)}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {s.role === 'ADMIN' ? 'Admin' : 'Staff'}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Tasks - checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4" />
                    Tasks
                  </h4>
                  <Button variant="outline" size="sm" onClick={() => setIsTaskDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add task
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-2 min-h-[60px]">
                  {project.tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">No tasks yet</p>
                  ) : (
                    project.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-2 p-2 rounded bg-white border border-gray-100 ${
                          task.isCompleted ? 'opacity-60' : ''
                        }`}
                      >
                        <Checkbox
                          checked={task.isCompleted}
                          onCheckedChange={() => handleToggleTask(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className={`text-sm ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                            {'actionType' in task &&
                            (task as { actionType?: string }).actionType &&
                            (task as { actionType: string }).actionType !== 'task' ? (
                              <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-normal capitalize">
                                {(task as { actionType: string }).actionType}
                              </Badge>
                            ) : null}
                          </div>
                          {task.notes && (
                            <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>
                          )}
                          {task.dueAt && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Due: {format(new Date(task.dueAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-destructive"
                          onClick={(e) => handleDeleteTask(e, task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reminders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-amber-600" />
                    Reminders
                  </h4>
                  <Button variant="outline" size="sm" onClick={() => setIsReminderDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add reminder
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/30 p-2 min-h-[50px]">
                  {project.reminders.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">No reminders yet</p>
                  ) : (
                    project.reminders.map((r) => (
                      <div
                        key={r.id}
                        className={`flex items-start gap-2 p-2 rounded bg-white border border-amber-100 ${
                          (r as { isCompleted?: boolean }).isCompleted ? 'opacity-60' : ''
                        }`}
                      >
                        <Checkbox
                          checked={!!(r as { isCompleted?: boolean }).isCompleted}
                          onCheckedChange={() => handleToggleReminder(r.id)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p
                              className={`text-sm ${
                                (r as { isCompleted?: boolean }).isCompleted
                                  ? 'line-through text-gray-500'
                                  : 'text-gray-900'
                              }`}
                            >
                              {r.title}
                            </p>
                            {'actionType' in r &&
                            (r as { actionType?: string }).actionType &&
                            (r as { actionType: string }).actionType !== 'task' ? (
                              <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-normal capitalize">
                                {(r as { actionType: string }).actionType}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {format(new Date(r.dueAt), 'MMM d, yyyy h:mm a')}
                          </p>
                          {'notes' in r && (r as { notes?: string | null }).notes ? (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{(r as { notes: string }).notes}</p>
                          ) : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-destructive"
                          onClick={(e) => handleDeleteReminder(e, r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h4>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes..."
                  rows={3}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? 'Saving...' : 'Save notes'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AddTaskDialog
        open={isTaskDialogOpen}
        onOpenChange={(open) => {
          setIsTaskDialogOpen(open)
          if (!open) refreshProject()
        }}
        initialTitle={project ? (project.clientName ? `${project.title} – ${project.clientName}` : project.title) : undefined}
        projectId={projectId ?? undefined}
        clientPhone={project?.appointmentService?.appointment?.client?.phone}
        clientEmail={project?.appointmentService?.appointment?.client?.email}
        staffOptions={staffOptions}
        clients={clients}
        initialStaffUserIds={project?.assignees?.map((a: { userId: string }) => a.userId) ?? []}
        initialClientIds={
          project?.appointmentService?.appointment?.client?.id
            ? [project.appointmentService.appointment.client.id]
            : []
        }
        initialAppointmentId={project?.appointmentService?.appointment?.id ?? null}
        appointments={projectAppointmentLinkOptions}
      />

      <AddReminderDialog
        open={isReminderDialogOpen}
        onOpenChange={(open) => {
          setIsReminderDialogOpen(open)
          if (!open) refreshProject()
        }}
        initialTitle={project ? (project.clientName ? `${project.title} – ${project.clientName}` : project.title) : undefined}
        projectId={projectId ?? undefined}
        clientPhone={project?.appointmentService?.appointment?.client?.phone}
        clientEmail={project?.appointmentService?.appointment?.client?.email}
        staffOptions={staffOptions}
        clients={clients}
        initialStaffUserIds={project?.assignees?.map((a: { userId: string }) => a.userId) ?? []}
        initialClientIds={
          project?.appointmentService?.appointment?.client?.id
            ? [project.appointmentService.appointment.client.id]
            : []
        }
        initialAppointmentId={project?.appointmentService?.appointment?.id ?? null}
        appointments={projectAppointmentLinkOptions}
      />
    </>
  )
}
