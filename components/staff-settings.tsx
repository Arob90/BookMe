'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  createTeamMemberForBusiness,
  deleteTeamMemberForBusiness,
  getTeamMembersForBusiness,
  updateTeamMemberForBusiness,
} from '@/app/actions/team-members'

type TeamMember = Awaited<ReturnType<typeof getTeamMembersForBusiness>>['members'][number]

type Draft = {
  id?: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: 'ADMIN' | 'STAFF'
  password: string
}

function toDraft(m?: TeamMember): Draft {
  return {
    id: m?.id,
    email: m?.email ?? '',
    firstName: m?.firstName ?? '',
    lastName: m?.lastName ?? '',
    phone: m?.phone ?? '',
    role: (m?.role as 'ADMIN' | 'STAFF') ?? 'STAFF',
    password: '',
  }
}

export function StaffSettings(props: { variant?: 'card' | 'plain' } = {}) {
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [seatCap, setSeatCap] = useState<number>(1)
  const [seatsUsed, setSeatsUsed] = useState<number>(1)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'add' | 'edit'>('add')
  const [draft, setDraft] = useState<Draft>(() => toDraft())

  const seatText = useMemo(() => {
    return `${seatsUsed} / ${seatCap} seat${seatCap === 1 ? '' : 's'} used`
  }, [seatsUsed, seatCap])

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await getTeamMembersForBusiness()
      setMembers(res.members)
      setSeatCap(res.seatCap)
      setSeatsUsed(res.seatsUsed)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to load staff', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openAdd = () => {
    setMode('add')
    setDraft(toDraft())
    setOpen(true)
  }

  const openEdit = (m: TeamMember) => {
    setMode('edit')
    setDraft(toDraft(m))
    setOpen(true)
  }

  const onSave = async () => {
    setIsSaving(true)
    try {
      if (mode === 'add') {
        await createTeamMemberForBusiness({
          email: draft.email.trim(),
          password: draft.password,
          role: draft.role,
          firstName: draft.firstName.trim() || undefined,
          lastName: draft.lastName.trim() || undefined,
          phone: draft.phone.trim() || undefined,
        })
        toast({ title: 'Staff member added', description: `${draft.email.trim()} can now sign in.` })
      } else {
        if (!draft.id) throw new Error('Missing staff id')
        await updateTeamMemberForBusiness(draft.id, {
          email: draft.email.trim(),
          password: draft.password ? draft.password : undefined,
          role: draft.role,
          firstName: draft.firstName.trim() || null,
          lastName: draft.lastName.trim() || null,
          phone: draft.phone.trim() || null,
        })
        toast({ title: 'Saved', description: 'Staff member updated.' })
      }
      setOpen(false)
      await load()
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to save', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async (m: TeamMember) => {
    const ok = window.confirm(`Remove ${m.email}? They will no longer be able to sign in.`)
    if (!ok) return
    try {
      await deleteTeamMemberForBusiness(m.id)
      toast({ title: 'Removed', description: `${m.email} removed.` })
      await load()
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to remove', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {props.variant !== 'plain' ? (
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-200 bg-white py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-gray-800">Staff</CardTitle>
                <CardDescription className="text-gray-600">
                  Add logins for your team. Staff accounts share the same business data.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{seatText}</div>
                <Button size="sm" className="h-8 px-3 text-sm" onClick={openAdd} disabled={isLoading}>
                  Add staff
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading staff…</div>
            ) : members.length === 0 ? (
              <div className="text-sm text-muted-foreground">No staff members yet.</div>
            ) : (
              <div className="divide-y rounded-lg border bg-white">
                {members.map((m) => {
                  const name = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
                  return (
                    <div key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-sm text-gray-900 truncate">{m.email}</div>
                          <span className="text-[11px] rounded-full border px-2 py-0.5 text-muted-foreground">
                            {String(m.role)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {name ? name : '—'}
                          {m.phone ? ` • ${m.phone}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(m)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="h-8" onClick={() => onDelete(m)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-xs text-muted-foreground">{seatText}</div>
            <Button size="sm" className="h-8 px-3 text-sm" onClick={openAdd} disabled={isLoading}>
              Add staff
            </Button>
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading staff…</div>
          ) : members.length === 0 ? (
            <div className="text-sm text-muted-foreground">No staff members yet.</div>
          ) : (
            <div className="divide-y rounded-lg border bg-white">
              {members.map((m) => {
                const name = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
                return (
                  <div key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-sm text-gray-900 truncate">{m.email}</div>
                        <span className="text-[11px] rounded-full border px-2 py-0.5 text-muted-foreground">
                          {String(m.role)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {name ? name : '—'}
                        {m.phone ? ` • ${m.phone}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(m)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="h-8" onClick={() => onDelete(m)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'add' ? 'Add staff member' : 'Edit staff member'}</DialogTitle>
            <DialogDescription>
              {mode === 'add'
                ? 'Create a login for a team member.'
                : 'Update staff details. Leave password blank to keep the existing password.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Email</Label>
              <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </div>
            <div>
              <Label>First name</Label>
              <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as Draft['role'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>{mode === 'add' ? 'Password' : 'New password (optional)'}</Label>
              <Input
                type="password"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                placeholder={mode === 'add' ? 'At least 6 characters' : 'Leave blank to keep current'}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={
                isSaving ||
                !draft.email.trim() ||
                (mode === 'add' && draft.password.length < 6) ||
                (mode === 'edit' && draft.password.length > 0 && draft.password.length < 6)
              }
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

