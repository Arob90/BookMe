'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, Trash2, ShieldCheck, Check, X } from 'lucide-react'
import {
  RIGHT_KEYS, RIGHT_LABELS, RIGHT_DESCRIPTIONS, DEFAULT_STAFF_RIGHTS, normalizeRights,
  type RightKey, type StaffRights,
} from '@/lib/staff-rights'
import {
  createTeamMemberForBusiness, updateTeamMemberForBusiness, deleteTeamMemberForBusiness,
} from '@/app/actions/team-members'

type Member = {
  id: string
  email: string
  role: 'ADMIN' | 'STAFF'
  firstName: string | null
  lastName: string | null
  staffRights?: unknown
}

type Data = {
  owner: { id: string; email: string; businessName: string | null }
  members: Member[]
  seatsUsed: number
  seatCap: number
}

function RightsToggles({ rights, disabled, onToggle }: { rights: StaffRights; disabled?: boolean; onToggle?: (k: RightKey, v: boolean) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RIGHT_KEYS.map((k) => {
        const on = rights[k]
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onToggle?.(k, !on)}
            title={RIGHT_DESCRIPTIONS[k]}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              on
                ? 'bg-violet-600 text-white'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-violet-200'
            } ${disabled ? 'cursor-default opacity-90' : ''}`}
          >
            {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {RIGHT_LABELS[k]}
          </button>
        )
      })}
    </div>
  )
}

export function StaffManager({ data }: { data: Data }) {
  const { toast } = useToast()
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(data.members)
  const [busy, setBusy] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<'STAFF' | 'ADMIN'>('STAFF')
  const [newRights, setNewRights] = useState<StaffRights>({ ...DEFAULT_STAFF_RIGHTS })

  const seatsUsed = 1 + members.length
  const full = seatsUsed >= data.seatCap

  const setRight = async (m: Member, k: RightKey, v: boolean) => {
    const next = { ...normalizeRights(m.staffRights), [k]: v }
    setMembers((arr) => arr.map((x) => (x.id === m.id ? { ...x, staffRights: next } : x)))
    try {
      await updateTeamMemberForBusiness(m.id, { staffRights: next })
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to update', variant: 'destructive' })
      router.refresh()
    }
  }

  const addStaff = async () => {
    if (!email.trim() || password.length < 6) {
      toast({ title: 'Email and password (6+ chars) required', variant: 'destructive' }); return
    }
    setBusy('add')
    try {
      const m = await createTeamMemberForBusiness({
        email: email.trim(), password, role,
        firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined,
        staffRights: role === 'STAFF' ? newRights : undefined,
      })
      setMembers((arr) => [...arr, m as Member])
      setOpen(false); setEmail(''); setPassword(''); setFirstName(''); setLastName(''); setRole('STAFF'); setNewRights({ ...DEFAULT_STAFF_RIGHTS })
      toast({ title: 'Staff added' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Could not add staff', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const remove = async (m: Member) => {
    if (!confirm(`Remove ${m.email}? They will lose access immediately.`)) return
    setBusy(m.id)
    try {
      await deleteTeamMemberForBusiness(m.id)
      setMembers((arr) => arr.filter((x) => x.id !== m.id))
      toast({ title: 'Staff removed' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-violet-600" /> Your team</CardTitle>
            <CardDescription>Add staff logins and choose exactly what each can access.</CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{seatsUsed} / {data.seatCap} seats</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Owner */}
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-slate-900">{data.owner.email}</span>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">Owner</span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Full access</p>
            </div>
          </div>

          {/* Members */}
          {members.map((m) => {
            const isAdmin = m.role === 'ADMIN'
            const rights = isAdmin ? { calendar: true, clients: true, services: true, payments: true } : normalizeRights(m.staffRights)
            return (
              <div key={m.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-slate-900">{`${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.email}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isAdmin ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{m.role}</span>
                    </div>
                    <p className="truncate text-sm text-slate-500">{m.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" disabled={busy === m.id} onClick={() => remove(m)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-slate-500">{isAdmin ? 'Admins have full access' : 'Can access'}</p>
                  <RightsToggles rights={rights} disabled={isAdmin} onToggle={(k, v) => setRight(m, k, v)} />
                </div>
              </div>
            )
          })}

          {/* Add */}
          {open ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
              <h4 className="font-display text-sm font-bold text-slate-900">Add a staff member</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input placeholder="Password (6+ chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="mt-3">
                <Label className="text-xs">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'STAFF' | 'ADMIN')}>
                  <SelectTrigger className="mt-1 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff (limited)</SelectItem>
                    <SelectItem value="ADMIN">Admin (full access)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === 'STAFF' && (
                <div className="mt-3">
                  <Label className="text-xs">Rights</Label>
                  <div className="mt-1.5">
                    <RightsToggles rights={newRights} onToggle={(k, v) => setNewRights({ ...newRights, [k]: v })} />
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button onClick={addStaff} disabled={busy === 'add'} className="bg-violet-600 hover:bg-violet-700">{busy === 'add' ? 'Adding…' : 'Add staff'}</Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setOpen(true)} disabled={full} variant="outline" className="w-full border-dashed">
              <UserPlus className="mr-2 h-4 w-4" /> {full ? `Seat limit reached (${data.seatCap})` : 'Add staff member'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
