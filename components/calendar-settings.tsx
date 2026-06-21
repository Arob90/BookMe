'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  type HolidayType,
} from '@/app/actions/holidays'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { formatHolidayDateLabel, formatUtcDateToYmd, todayLocalYmd } from '@/lib/date-only'
import { Badge } from '@/components/ui/badge'

const HOLIDAY_TYPES: { value: HolidayType; label: string }[] = [
  { value: 'PUBLIC', label: 'Public holiday' },
  { value: 'BANK', label: 'Bank holiday' },
  { value: 'CUSTOM', label: 'Custom (e.g. business closure)' },
]

const HOLIDAY_TYPE_BADGE: Record<string, string> = {
  PUBLIC: 'Public',
  BANK: 'Bank',
  CUSTOM: 'Custom',
}

type HolidayRow = {
  id: string
  date: Date
  name: string
  type: string
  repeatYearly: boolean
  isOpen: boolean
  openAt: string | null
  closeAt: string | null
}

const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '17:00'

export function CalendarSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [holidays, setHolidays] = useState<HolidayRow[]>([])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [newDate, setNewDate] = useState(() => todayLocalYmd())
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<HolidayType>('PUBLIC')
  const [newRepeat, setNewRepeat] = useState(false)
  const [newIsOpen, setNewIsOpen] = useState(false)
  const [newOpenAt, setNewOpenAt] = useState(DEFAULT_OPEN)
  const [newCloseAt, setNewCloseAt] = useState(DEFAULT_CLOSE)
  const [editDate, setEditDate] = useState('')
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<HolidayType>('PUBLIC')
  const [editRepeat, setEditRepeat] = useState(false)
  const [editIsOpen, setEditIsOpen] = useState(false)
  const [editOpenAt, setEditOpenAt] = useState(DEFAULT_OPEN)
  const [editCloseAt, setEditCloseAt] = useState(DEFAULT_CLOSE)

  const load = async () => {
    setLoading(true)
    try {
      const list = await getHolidays()
      setHolidays(
        list.map((h) => ({
          id: h.id,
          date: new Date(h.date),
          name: h.name,
          type: h.type,
          repeatYearly: h.repeatYearly,
          isOpen: h.isOpen,
          openAt: h.openAt,
          closeAt: h.closeAt,
        }))
      )
    } catch {
      toast({ title: 'Error', description: 'Failed to load holidays', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Holiday name is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createHoliday({
        date: newDate,
        name: newName.trim(),
        type: newType,
        repeatYearly: newRepeat,
        isOpen: newIsOpen,
        openAt: newOpenAt,
        closeAt: newCloseAt,
      })
      toast({ title: 'Added', description: 'Holiday added' })
      setNewName('')
      setNewDate(todayLocalYmd())
      setNewIsOpen(false)
      setNewOpenAt(DEFAULT_OPEN)
      setNewCloseAt(DEFAULT_CLOSE)
      setAdding(false)
      await load()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to add',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await updateHoliday(id, {
        date: editDate,
        name: editName.trim(),
        type: editType,
        repeatYearly: editRepeat,
        isOpen: editIsOpen,
        openAt: editOpenAt,
        closeAt: editCloseAt,
      })
      toast({ title: 'Updated', description: 'Holiday updated' })
      setEditing(null)
      await load()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this holiday?')) return
    setSaving(true)
    try {
      await deleteHoliday(id)
      toast({ title: 'Removed', description: 'Holiday removed' })
      setEditing(null)
      await load()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to remove',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Calendar className="h-5 w-5 text-pink-500" />
          Calendar & Holidays
        </CardTitle>
        <CardDescription className="text-gray-600">
          Add public holidays, bank holidays, and custom dates. For each date, choose whether you are{' '}
          <strong>closed all day</strong> or <strong>open with special hours</strong> (set opening and closing time).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Holidays & closures</Label>
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {holidays.length > 0 && (
              <div className="hidden sm:grid sm:grid-cols-[minmax(7.5rem,9.25rem)_minmax(0,1fr)_minmax(5.5rem,auto)_4.5rem_auto] sm:gap-x-3 sm:items-center px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground bg-slate-50/90">
                <span>Date</span>
                <span>Holiday</span>
                <span>Hours</span>
                <span className="text-center">Type</span>
                <span className="w-[4.5rem] shrink-0" aria-hidden />
              </div>
            )}
            {holidays.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No holidays yet. Add a date below.
              </div>
            )}
            {holidays.map((h) => (
              <div key={h.id} className="bg-white">
                {editing === h.id ? (
                  <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="h-8 w-[140px]"
                        />
                      </div>
                      <div className="space-y-1 flex-1 min-w-[160px]">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Holiday name"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select value={editType} onValueChange={(v) => setEditType(v as HolidayType)}>
                          <SelectTrigger className="h-8 w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOLIDAY_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`open-${h.id}`}
                          checked={editIsOpen}
                          onChange={(e) => setEditIsOpen(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor={`open-${h.id}`} className="text-sm cursor-pointer font-medium">
                          Open on this day (special hours)
                        </Label>
                      </div>
                      {editIsOpen && (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs whitespace-nowrap">Opens</Label>
                            <Input
                              type="time"
                              value={editOpenAt}
                              onChange={(e) => setEditOpenAt(e.target.value)}
                              className="h-8 w-[120px]"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs whitespace-nowrap">Closes</Label>
                            <Input
                              type="time"
                              value={editCloseAt}
                              onChange={(e) => setEditCloseAt(e.target.value)}
                              className="h-8 w-[120px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id={`repeat-${h.id}`}
                          checked={editRepeat}
                          onChange={(e) => setEditRepeat(e.target.checked)}
                          className="rounded"
                        />
                        <Label htmlFor={`repeat-${h.id}`} className="text-xs cursor-pointer">
                          Repeat yearly
                        </Label>
                      </div>
                      <div className="flex gap-2 ml-auto">
                        <Button size="sm" onClick={() => handleUpdate(h.id)} disabled={saving}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex flex-col gap-0.5 w-[8.75rem] shrink-0">
                      <span className="text-sm tabular-nums text-slate-800 leading-snug">
                        {formatHolidayDateLabel(h.date, h.repeatYearly)}
                      </span>
                      {h.repeatYearly && (
                        <Badge variant="secondary" className="w-fit h-5 px-1.5 text-[10px] font-normal">
                          Yearly
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium text-slate-900 flex-1 min-w-[10rem] leading-snug">
                      {h.name}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md border shrink-0 tabular-nums ${
                        h.isOpen && h.openAt && h.closeAt
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                      title={h.isOpen && h.openAt && h.closeAt ? 'Special opening hours' : 'Closed all day'}
                    >
                      {h.isOpen && h.openAt && h.closeAt
                        ? `${h.openAt}–${h.closeAt}`
                        : 'Closed'}
                    </span>
                    <Badge
                      variant="outline"
                      className="h-6 shrink-0 px-2 text-[10px] font-normal text-muted-foreground border-slate-200"
                    >
                      {HOLIDAY_TYPE_BADGE[h.type] ?? h.type}
                    </Badge>
                    <div className="flex items-center gap-0 shrink-0 ml-auto">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditing(h.id)
                          setEditDate(formatUtcDateToYmd(h.date))
                          setEditName(h.name)
                          setEditType(h.type as HolidayType)
                          setEditRepeat(h.repeatYearly)
                          setEditIsOpen(h.isOpen)
                          setEditOpenAt(h.openAt || DEFAULT_OPEN)
                          setEditCloseAt(h.closeAt || DEFAULT_CLOSE)
                        }}
                        aria-label={`Edit ${h.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(h.id)}
                        disabled={saving}
                        aria-label={`Remove ${h.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {adding ? (
              <div className="border-t border-dashed border-pink-200/90 bg-pink-50/40 p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="h-8 w-[140px]"
                    />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[180px]">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Good Friday, Christmas"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={newType} onValueChange={(v) => setNewType(v as HolidayType)}>
                      <SelectTrigger className="h-8 w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOLIDAY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 border-t border-pink-100 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-open"
                      checked={newIsOpen}
                      onChange={(e) => {
                        setNewIsOpen(e.target.checked)
                        if (e.target.checked) {
                          setNewOpenAt((o) => o || DEFAULT_OPEN)
                          setNewCloseAt((c) => c || DEFAULT_CLOSE)
                        }
                      }}
                      className="rounded"
                    />
                    <Label htmlFor="new-open" className="text-sm cursor-pointer font-medium">
                      Open on this day (special hours)
                    </Label>
                  </div>
                  {newIsOpen && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs whitespace-nowrap">Opens</Label>
                        <Input
                          type="time"
                          value={newOpenAt}
                          onChange={(e) => setNewOpenAt(e.target.value)}
                          className="h-8 w-[120px]"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs whitespace-nowrap">Closes</Label>
                        <Input
                          type="time"
                          value={newCloseAt}
                          onChange={(e) => setNewCloseAt(e.target.value)}
                          className="h-8 w-[120px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="new-repeat"
                      checked={newRepeat}
                      onChange={(e) => setNewRepeat(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="new-repeat" className="text-xs cursor-pointer">
                      Repeat yearly
                    </Label>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" onClick={handleAdd} disabled={saving}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdding(false)
                        setNewIsOpen(false)
                        setNewOpenAt(DEFAULT_OPEN)
                        setNewCloseAt(DEFAULT_CLOSE)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-3 py-2.5 bg-slate-50/40">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setAdding(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add holiday
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
