'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  createProject,
  createStage,
  updateStage,
  updateProject,
  moveProject,
  deleteProject,
  deleteStage,
  setProjectAssignees,
} from '@/app/actions/projects'
import {
  Plus,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  GripVertical,
  CheckSquare,
  Bell,
  ListFilter,
  Users,
  UserRound,
  BookOpen,
  Clock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import {
  formatCurrency,
  formatDuration,
  getStaffDisplayName,
  getStaffUserInitials,
  staffAssigneeAvatarGradientClass,
} from '@/lib/utils'
import { getProjectScheduleDisplay } from '@/lib/project-schedule'
import { format } from 'date-fns'
import { AddTaskDialog, type TaskAppointmentPick } from '@/components/add-task-dialog'
import { AddReminderDialog } from '@/components/add-reminder-dialog'
import { ProjectDetailModal } from '@/components/project-detail-modal'

type AssigneeUser = {
  id: string
  firstName: string | null
  lastName: string | null
  userName: string | null
  email: string
  profilePhoto: string | null
  role: 'ADMIN' | 'STAFF'
}

interface Project {
  id: string
  title: string
  description: string | null
  clientName?: string | null
  amount?: number | string | { toNumber?: () => number } | null
  stageId: string
  sortOrder: number
  plannedDurationMinutes?: number | null
  plannedDurationUnit?: string | null
  estimatedDueAt?: Date | string | null
  assignees?: Array<{ id: string; userId: string; user: AssigneeUser }>
  appointmentService?: {
    durationAtTime?: number
    appointment: {
      id?: string
      startAt?: Date | string
      client: {
        id: string
        firstName: string
        lastName: string
        companyName: string | null
        type: string
        phone: string | null
        email: string | null
      }
    } | null
    service?: { durationUnit?: string | null } | null
  } | null
}

export type PipelineStaffOption = {
  id: string
  firstName: string | null
  lastName: string | null
  userName: string | null
  email: string
  profilePhoto: string | null
  role: 'ADMIN' | 'STAFF'
}

const STAGE_COLORS = ['gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink'] as const

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  gray: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  green: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  red: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
}

/** Solid top accent bar per stage (CRM-style pipeline columns). */
const STAGE_ACCENT_BAR: Record<string, string> = {
  gray: 'bg-gray-400',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
}

type ColumnSortMode = 'name-asc' | 'name-desc' | 'amount-desc' | 'amount-asc'

function parseAmount(p: Project): number | null {
  if (p.amount == null) return null
  if (typeof p.amount === 'number') return p.amount
  if (typeof p.amount === 'string') return parseFloat(p.amount)
  if (typeof (p.amount as { toNumber?: () => number }).toNumber === 'function') {
    return (p.amount as { toNumber: () => number }).toNumber()
  }
  return null
}

function displayProjectName(p: Project) {
  return (p.clientName || p.title || 'Untitled').trim()
}

function sortProjectsList(projects: Project[], mode: ColumnSortMode): Project[] {
  const copy = [...projects]
  const nameKey = (p: Project) => displayProjectName(p).toLowerCase()
  const amt = (p: Project) => parseAmount(p) ?? 0
  switch (mode) {
    case 'name-asc':
      return copy.sort((a, b) => nameKey(a).localeCompare(nameKey(b)))
    case 'name-desc':
      return copy.sort((a, b) => nameKey(b).localeCompare(nameKey(a)))
    case 'amount-desc':
      return copy.sort((a, b) => amt(b) - amt(a))
    case 'amount-asc':
      return copy.sort((a, b) => amt(a) - amt(b))
    default:
      return copy
  }
}

interface PipelineStage {
  id: string
  name: string
  color: string
  sortOrder: number
  isFolded: boolean
  projects: Project[]
}

interface ProjectsPipelineProps {
  initialStages: PipelineStage[]
  firstStageId?: string | null
  staffOptions: PipelineStaffOption[]
  clients: Array<{
    id: string
    firstName: string
    lastName: string
    companyName?: string | null
    type: string
    phone?: string | null
    email?: string | null
  }>
  /** Bookable services for the Library tab (reference catalog). */
  services: Array<{
    id: string
    name: string
    description?: string | null
    durationMinutes: number
    durationUnit?: string | null
    price: unknown
    category?: { name: string } | null
  }>
}

export function ProjectsPipeline({
  initialStages,
  firstStageId,
  staffOptions,
  clients,
  services,
}: ProjectsPipelineProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [stages, setStages] = useState(initialStages)

  useEffect(() => {
    setStages(initialStages)
  }, [initialStages])
  const [draggedProject, setDraggedProject] = useState<{ project: Project; fromStageId: string } | null>(null)
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState('')
  const [addProjectStageId, setAddProjectStageId] = useState<string | null>(null)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectTitle, setEditingProjectTitle] = useState('')
  const [isAddingStage, setIsAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [taskProject, setTaskProject] = useState<Project | null>(null)
  const [reminderProject, setReminderProject] = useState<Project | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [columnSort, setColumnSort] = useState<Record<string, ColumnSortMode>>({})
  const [pipelineTab, setPipelineTab] = useState<'projects' | 'library'>('projects')

  const refresh = () => router.refresh()

  const getProjectAmount = (p: Project): number | null => parseAmount(p)

  const totalProjectCount = useMemo(
    () => stages.reduce((n, s) => n + s.projects.length, 0),
    [stages],
  )

  const taskProjectAppointmentPicks = useMemo((): TaskAppointmentPick[] => {
    const apt = taskProject?.appointmentService?.appointment
    if (!apt?.id) return []
    return [{ id: apt.id, startAt: apt.startAt ?? new Date(), client: apt.client }]
  }, [taskProject])

  const reminderProjectAppointmentPicks = useMemo((): TaskAppointmentPick[] => {
    const apt = reminderProject?.appointmentService?.appointment
    if (!apt?.id) return []
    return [{ id: apt.id, startAt: apt.startAt ?? new Date(), client: apt.client }]
  }, [reminderProject])

  const handleAddStage = async () => {
    const name = newStageName.trim() || 'New Stage'
    try {
      await createStage({ name })
      setNewStageName('')
      setIsAddingStage(false)
      toast({ title: 'Stage added' })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const effectiveFirstStageId = firstStageId ?? stages[0]?.id

  const handleAddProject = async (stageId: string) => {
    const title = newProjectTitle.trim()
    if (!title) return
    try {
      await createProject({ title, stageId })
      setNewProjectTitle('')
      setAddProjectStageId(null)
      toast({ title: 'Project added' })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleStartEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id)
    setEditingStageName(stage.name)
  }

  const handleSaveStageName = async () => {
    if (!editingStageId) return
    try {
      await updateStage(editingStageId, { name: editingStageName.trim() || 'Stage' })
      setEditingStageId(null)
      toast({ title: 'Stage updated' })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleStageColor = async (stageId: string, color: string) => {
    try {
      await updateStage(stageId, { color })
      toast({ title: 'Stage color updated' })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleToggleFold = async (stage: PipelineStage) => {
    try {
      await updateStage(stage.id, { isFolded: !stage.isFolded })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Delete this stage? Projects will be moved to another stage.')) return
    try {
      await deleteStage(stageId)
      toast({ title: 'Stage deleted' })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleSaveProjectTitle = async () => {
    if (!editingProjectId || !editingProjectTitle.trim()) {
      setEditingProjectId(null)
      return
    }
    try {
      await updateProject(editingProjectId, { title: editingProjectTitle.trim() })
      setEditingProjectId(null)
      toast({ title: 'Project updated' })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return
    try {
      await deleteProject(projectId)
      toast({ title: 'Project deleted' })
      refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleDragStart = (e: React.DragEvent, project: Project, stageId: string) => {
    setDraggedProject({ project, fromStageId: stageId })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', project.id)
    e.dataTransfer.setData('application/json', JSON.stringify({ projectId: project.id, stageId }))
  }

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStageId(stageId)
  }

  const handleDragLeave = () => setDragOverStageId(null)

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault()
    setDragOverStageId(null)
    setDraggedProject(null)
    const data = e.dataTransfer.getData('application/json')
    if (!data) return
    try {
      const { projectId, stageId } = JSON.parse(data)
      if (stageId === targetStageId) return
      const targetStage = stages.find((s) => s.id === targetStageId)
      const maxOrder = targetStage?.projects.length ?? 0
      await moveProject(projectId, targetStageId, maxOrder)
      toast({ title: 'Project moved' })
      refresh()
    } catch (err) {
      toast({ title: 'Error moving project', variant: 'destructive' })
    }
  }

  const handleDragEnd = () => {
    setDraggedProject(null)
    setDragOverStageId(null)
  }

  const handleAddNewProject = () => {
    if (effectiveFirstStageId) setAddProjectStageId(effectiveFirstStageId)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 mb-4">
        <Link
          href="/app/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Home
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-1">Pipeline</h1>
        <div className="flex items-center gap-8 border-b border-gray-200 mt-3">
          <button
            type="button"
            onClick={() => setPipelineTab('projects')}
            className={`inline-flex items-center gap-1 pb-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              pipelineTab === 'projects'
                ? 'text-pink-700 border-pink-600'
                : 'text-muted-foreground border-transparent hover:text-gray-800'
            }`}
          >
            Projects
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-700 tabular-nums">
              {totalProjectCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPipelineTab('library')}
            className={`inline-flex items-center gap-1 pb-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              pipelineTab === 'library'
                ? 'text-pink-700 border-pink-600'
                : 'text-muted-foreground border-transparent hover:text-gray-800'
            }`}
          >
            Library
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-700 tabular-nums">
              {services.length}
            </span>
          </button>
        </div>
        {pipelineTab === 'projects' ? (
          <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Drag cards between stages to update progress. Sort is per column (view only).
            </p>
            <Button onClick={handleAddNewProject} className="bg-pink-600 hover:bg-pink-700 shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add project
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between items-center gap-3 mt-4">
            <p className="text-sm text-muted-foreground max-w-2xl">
              Your bookable services—use this catalog as a reference when planning work on the board. Editing
              happens under Services.
            </p>
            <Button variant="outline" asChild className="shrink-0">
              <Link href="/app/services">Manage services</Link>
            </Button>
          </div>
        )}
      </div>

      {pipelineTab === 'library' ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {services.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-muted-foreground">
              <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <p className="font-medium text-gray-700">No services in your library yet</p>
              <p className="mt-1 mb-4">Add services under Services so they appear here.</p>
              <Button asChild className="bg-pink-600 hover:bg-pink-700">
                <Link href="/app/services">Go to Services</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
              {services.map((svc) => {
                const price =
                  typeof svc.price === 'number'
                    ? svc.price
                    : typeof svc.price === 'string'
                      ? parseFloat(svc.price)
                      : typeof (svc.price as { toNumber?: () => number })?.toNumber === 'function'
                        ? (svc.price as { toNumber: () => number }).toNumber()
                        : NaN
                const unit = svc.durationUnit ?? 'MINUTES'
                return (
                  <Card
                    key={svc.id}
                    className="border-gray-200 shadow-sm overflow-hidden flex flex-col"
                  >
                    <CardContent className="p-4 flex flex-col flex-1 gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{svc.name}</h3>
                        {!Number.isNaN(price) && (
                          <span className="text-sm font-semibold text-pink-600 tabular-nums shrink-0">
                            {formatCurrency(price)}
                          </span>
                        )}
                      </div>
                      {svc.category?.name ? (
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {svc.category.name}
                        </span>
                      ) : null}
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-auto pt-1">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        {formatDuration(svc.durationMinutes, unit)}
                      </div>
                      {svc.description?.trim() ? (
                        <p className="text-xs text-gray-500 line-clamp-3">{svc.description.trim()}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-0 flex-1 items-stretch">
        {stages.map((stage) => {
          const colors = COLOR_MAP[stage.color] || COLOR_MAP.gray
          const accent = STAGE_ACCENT_BAR[stage.color] || STAGE_ACCENT_BAR.gray
          const isDragOver = dragOverStageId === stage.id
          const sortMode = columnSort[stage.id] ?? 'name-asc'
          const sortedProjects = sortProjectsList(stage.projects, sortMode)
          const columnTotal = stage.projects.reduce((sum, p) => sum + (parseAmount(p) ?? 0), 0)
          const count = stage.projects.length

          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 w-[248px] flex flex-col rounded-lg border bg-white shadow-sm overflow-hidden transition-[box-shadow,ring] ${
                isDragOver ? 'ring-2 ring-blue-400 ring-offset-1 shadow-md' : 'border-gray-200'
              }`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className={`h-1 w-full shrink-0 ${accent}`} aria-hidden />

              <div className="px-2 pt-2 pb-1.5 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleFold(stage)}
                    className="p-0.5 rounded hover:bg-gray-100 text-gray-600"
                    aria-label={stage.isFolded ? 'Expand stage' : 'Collapse stage'}
                  >
                    {stage.isFolded ? (
                      <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {editingStageId === stage.id ? (
                    <Input
                      value={editingStageName}
                      onChange={(e) => setEditingStageName(e.target.value)}
                      onBlur={handleSaveStageName}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveStageName()}
                      className="h-7 text-xs flex-1 px-2"
                      autoFocus
                    />
                  ) : (
                    <h2 className={`font-semibold text-xs flex-1 truncate leading-tight ${colors.text}`}>
                      {stage.name}
                    </h2>
                  )}
                  <span className="rounded-full bg-gray-100 px-1.5 py-0 text-[10px] font-medium text-gray-700 tabular-nums shrink-0 leading-5 min-w-[1.375rem] text-center">
                    {count}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStartEditStage(stage)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <div className="px-2 py-1.5">
                        <p className="text-xs font-medium text-gray-500 mb-1">Color</p>
                        <div className="flex flex-wrap gap-1">
                          {STAGE_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => handleStageColor(stage.id, c)}
                              className={`w-6 h-6 rounded border-2 ${
                                stage.color === c ? 'border-gray-800 ring-1' : 'border-transparent'
                              } ${COLOR_MAP[c]?.bg || 'bg-gray-200'} hover:ring-2 hover:ring-gray-300`}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>
                      <DropdownMenuItem
                        onClick={() => handleDeleteStage(stage.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete stage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-xs font-semibold text-gray-900 mt-1 tabular-nums leading-tight">
                  {formatCurrency(columnTotal)}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ListFilter className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />
                  <Select
                    value={sortMode}
                    onValueChange={(v) =>
                      setColumnSort((prev) => ({ ...prev, [stage.id]: v as ColumnSortMode }))
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px] px-2 border-gray-200 bg-gray-50/80">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name-asc">Name A–Z</SelectItem>
                      <SelectItem value="name-desc">Name Z–A</SelectItem>
                      <SelectItem value="amount-desc">Amount high–low</SelectItem>
                      <SelectItem value="amount-asc">Amount low–high</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!stage.isFolded && (
                <div className="flex-1 p-1.5 overflow-y-auto min-h-[96px] max-h-[min(70vh,720px)] bg-slate-50/80">
                  {sortedProjects.map((project) => {
                    const isDragging = draggedProject?.project.id === project.id
                    return (
                      <Card
                        key={project.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, project, stage.id)}
                        onDragEnd={handleDragEnd}
                        className={`mb-1.5 cursor-grab active:cursor-grabbing border border-gray-200 bg-white shadow-sm hover:shadow transition-all rounded-md ${
                          isDragging
                            ? 'opacity-90 ring-2 ring-blue-500 shadow-md scale-[1.01] z-10'
                            : ''
                        }`}
                      >
                        <CardContent className="p-2 flex flex-col gap-1 min-h-0 relative">
                          {editingProjectId === project.id ? (
                            <div className="flex items-start gap-1.5">
                              <GripVertical className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-1" />
                              <Input
                                value={editingProjectTitle}
                                onChange={(e) => setEditingProjectTitle(e.target.value)}
                                onBlur={handleSaveProjectTitle}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveProjectTitle()}
                                className="h-7 text-xs flex-1 px-2"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-1 pr-0">
                                <button
                                  type="button"
                                  className="flex-1 min-w-0 text-left"
                                  onClick={() => setSelectedProject(project)}
                                >
                                  <p
                                    className="text-xs font-semibold text-gray-900 truncate leading-snug"
                                    title={displayProjectName(project)}
                                  >
                                    {displayProjectName(project)}
                                  </p>
                                  {project.clientName && (
                                    <p className="text-[10px] text-muted-foreground truncate mt-px leading-tight">
                                      {project.title}
                                    </p>
                                  )}
                                  {getProjectAmount(project) != null && (
                                    <p className="text-xs font-medium text-gray-800 tabular-nums mt-0.5 leading-tight">
                                      {formatCurrency(getProjectAmount(project))}
                                    </p>
                                  )}
                                  {(() => {
                                    const sched = getProjectScheduleDisplay(project)
                                    if (!sched.durationLabel && !sched.dueAt) return null
                                    return (
                                      <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground leading-tight">
                                        {sched.durationLabel ? (
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 shrink-0 text-gray-400" />
                                            <span>{sched.durationLabel}</span>
                                          </div>
                                        ) : null}
                                        {sched.dueAt ? (
                                          <div className="tabular-nums pl-4">
                                            Due {format(sched.dueAt, 'MMM d, yyyy')}
                                          </div>
                                        ) : null}
                                      </div>
                                    )
                                  })()}
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0 -mr-0.5 -mt-0.5"
                                      onPointerDown={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5 text-gray-500" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingProjectId(project.id)
                                        setEditingProjectTitle(project.title)
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteProject(project.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-gray-100">
                                <div className="flex items-center -ml-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Add task (calendar)"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setTaskProject(project)
                                    }}
                                  >
                                    <CheckSquare className="h-3.5 w-3.5 text-gray-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Add reminder (calendar)"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setReminderProject(project)
                                    }}
                                  >
                                    <Bell className="h-3.5 w-3.5 text-amber-600" />
                                  </Button>
                                </div>
                                {(() => {
                                  const assigneeUsers = [
                                    ...(project.assignees?.map((a) => a.user) ?? []),
                                  ].sort((a, b) =>
                                    getStaffDisplayName(a).localeCompare(getStaffDisplayName(b)),
                                  )
                                  const assigneeIds = new Set(assigneeUsers.map((u) => u.id))
                                  const extra = Math.max(0, assigneeUsers.length - 3)
                                  const visible = assigneeUsers.slice(0, 3)
                                  const teamTitle =
                                    assigneeUsers.map((u) => getStaffDisplayName(u)).join(', ') ||
                                    'No one assigned — pick team'

                                  return (
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-gray-500"
                                            title="Who’s on this project"
                                            onPointerDown={(e) => e.stopPropagation()}
                                          >
                                            <Users className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="w-[min(88vw,260px)] max-h-[min(50vh,280px)] overflow-y-auto"
                                          onCloseAutoFocus={(e) => e.preventDefault()}
                                        >
                                          <p className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
                                            Team on project
                                          </p>
                                          {staffOptions.map((s) => (
                                            <DropdownMenuCheckboxItem
                                              key={s.id}
                                              checked={assigneeIds.has(s.id)}
                                              onSelect={(e) => e.preventDefault()}
                                              onCheckedChange={async (checked) => {
                                                const next = new Set(assigneeIds)
                                                if (checked) next.add(s.id)
                                                else next.delete(s.id)
                                                try {
                                                  await setProjectAssignees(project.id, [...next])
                                                  toast({ title: 'Team updated' })
                                                  refresh()
                                                } catch (err: unknown) {
                                                  toast({
                                                    title: 'Could not update team',
                                                    description:
                                                      err instanceof Error ? err.message : undefined,
                                                    variant: 'destructive',
                                                  })
                                                }
                                              }}
                                            >
                                              <span className="truncate">
                                                {getStaffDisplayName(s)}
                                                <span className="text-muted-foreground font-normal">
                                                  {' '}
                                                  · {s.role === 'ADMIN' ? 'Admin' : 'Staff'}
                                                </span>
                                              </span>
                                            </DropdownMenuCheckboxItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                      <div
                                        className="flex items-center"
                                        title={teamTitle}
                                      >
                                        {assigneeUsers.length === 0 ? (
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                                            <UserRound className="h-3 w-3" />
                                          </div>
                                        ) : (
                                          <>
                                            {extra > 0 && (
                                              <div
                                                className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[9px] font-semibold text-gray-700"
                                                title={`${extra} more`}
                                              >
                                                +{extra}
                                              </div>
                                            )}
                                            {visible.map((u, i) => (
                                              <div
                                                key={u.id}
                                                className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-[10px] font-semibold leading-none ${staffAssigneeAvatarGradientClass(u.id)} ${i > 0 || extra > 0 ? '-ml-1.5' : ''}`}
                                                style={{ zIndex: i + 2 }}
                                              >
                                                {getStaffUserInitials(u)}
                                              </div>
                                            ))}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}

                  {addProjectStageId === stage.id ? (
                    <div className="flex flex-col gap-2 p-2 rounded-lg border border-dashed border-gray-300 bg-white">
                      <Input
                        value={newProjectTitle}
                        onChange={(e) => setNewProjectTitle(e.target.value)}
                        placeholder="Project name"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddProject(stage.id)
                          if (e.key === 'Escape') {
                            setAddProjectStageId(null)
                            setNewProjectTitle('')
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAddProject(stage.id)}>
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddProjectStageId(null)
                            setNewProjectTitle('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs text-gray-500 hover:text-pink-700 px-2"
                      onClick={() => setAddProjectStageId(stage.id)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add project
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <div className="flex-shrink-0 w-[248px]">
        {isAddingStage ? (
          <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-white">
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Stage name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddStage()
                if (e.key === 'Escape') setIsAddingStage(false)
              }}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleAddStage}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setIsAddingStage(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingStage(true)}
            className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:border-pink-300 hover:text-pink-600 hover:bg-pink-50/50 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add stage
          </button>
        )}
      </div>
    </div>
      )}

      <ProjectDetailModal
        projectId={selectedProject?.id ?? null}
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        staffOptions={staffOptions}
        clients={clients}
        pipelineStages={stages.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          sortOrder: s.sortOrder,
        }))}
      />

      <AddTaskDialog
        open={!!taskProject}
        onOpenChange={(open) => !open && setTaskProject(null)}
        initialTitle={taskProject ? (taskProject.clientName ? `${taskProject.title} – ${taskProject.clientName}` : taskProject.title) : undefined}
        projectId={taskProject?.id}
        clientPhone={taskProject?.appointmentService?.appointment?.client?.phone}
        clientEmail={taskProject?.appointmentService?.appointment?.client?.email}
        staffOptions={staffOptions}
        clients={clients}
        initialStaffUserIds={taskProject?.assignees?.map((a) => a.userId) ?? []}
        initialClientIds={
          taskProject?.appointmentService?.appointment?.client?.id
            ? [taskProject.appointmentService.appointment.client.id]
            : []
        }
        initialAppointmentId={taskProject?.appointmentService?.appointment?.id ?? null}
        appointments={taskProjectAppointmentPicks}
      />

      <AddReminderDialog
        open={!!reminderProject}
        onOpenChange={(open) => !open && setReminderProject(null)}
        initialTitle={reminderProject ? (reminderProject.clientName ? `${reminderProject.title} – ${reminderProject.clientName}` : reminderProject.title) : undefined}
        projectId={reminderProject?.id}
        clientPhone={reminderProject?.appointmentService?.appointment?.client?.phone}
        clientEmail={reminderProject?.appointmentService?.appointment?.client?.email}
        staffOptions={staffOptions}
        clients={clients}
        initialStaffUserIds={reminderProject?.assignees?.map((a) => a.userId) ?? []}
        initialClientIds={
          reminderProject?.appointmentService?.appointment?.client?.id
            ? [reminderProject.appointmentService.appointment.client.id]
            : []
        }
        initialAppointmentId={reminderProject?.appointmentService?.appointment?.id ?? null}
        appointments={reminderProjectAppointmentPicks}
      />
    </div>
  )
}
