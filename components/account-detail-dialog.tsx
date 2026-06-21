'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BillingHistoryList } from '@/components/billing-history-list'
import {
  Loader2,
  KeyRound,
  Trash2,
  UserPlus,
  Archive,
  PauseCircle,
  PlayCircle,
  Building2,
  Shield,
  Users,
  History,
  Pencil,
} from 'lucide-react'
import {
  adminSendPasswordResetLink,
  archiveManagedUser,
  createTeamMemberForAccount,
  deleteManagedUser,
  deleteTeamMemberAccount,
  getManagedAccountDetail,
  setManagedBusinessPaused,
  updateManagedUser,
} from '@/app/actions/account-admin'
import { SUPER_ADMIN_EMAIL } from '@/lib/authz'
import { format } from 'date-fns'

type Detail = Awaited<ReturnType<typeof getManagedAccountDetail>>

export function AccountDetailDialog(props: {
  ownerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const { ownerId, open, onOpenChange, onChanged } = props
  const { toast } = useToast()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formUserName, setFormUserName] = useState('')
  const [formBusinessName, setFormBusinessName] = useState('')
  const [formDistrict, setFormDistrict] = useState('')
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formRole, setFormRole] = useState<'ADMIN' | 'STAFF'>('ADMIN')
  const [formMaxUsers, setFormMaxUsers] = useState<1 | 5 | 10>(1)
  const [formPassword, setFormPassword] = useState('')

  const [teamEmail, setTeamEmail] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [teamRole, setTeamRole] = useState<'ADMIN' | 'STAFF'>('STAFF')
  const [teamFirstName, setTeamFirstName] = useState('')
  const [teamLastName, setTeamLastName] = useState('')

  const [staffEditOpen, setStaffEditOpen] = useState(false)
  const [staffEditId, setStaffEditId] = useState<string | null>(null)
  const [staffEditLabel, setStaffEditLabel] = useState('')
  const [staffEditEmail, setStaffEditEmail] = useState('')
  const [staffEditFirstName, setStaffEditFirstName] = useState('')
  const [staffEditLastName, setStaffEditLastName] = useState('')
  const [staffEditUserName, setStaffEditUserName] = useState('')
  const [staffEditPhone, setStaffEditPhone] = useState('')
  const [staffEditRole, setStaffEditRole] = useState<'ADMIN' | 'STAFF'>('STAFF')
  const [staffEditSaving, setStaffEditSaving] = useState(false)

  const openStaffEdit = (u: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    userName?: string | null
    phone?: string | null
    role: string
    label: string
  }) => {
    setStaffEditId(u.id)
    setStaffEditLabel(u.label)
    setStaffEditEmail(u.email)
    setStaffEditFirstName(u.firstName?.trim() ?? '')
    setStaffEditLastName(u.lastName?.trim() ?? '')
    setStaffEditUserName(u.userName?.trim() ?? '')
    setStaffEditPhone(u.phone?.trim() ?? '')
    setStaffEditRole(u.role === 'ADMIN' ? 'ADMIN' : 'STAFF')
    setStaffEditOpen(true)
  }

  const saveStaffEdit = async () => {
    if (!staffEditId) return
    if (!staffEditEmail.trim()) {
      toast({ title: 'Email required', variant: 'destructive' })
      return
    }
    const editedId = staffEditId
    setStaffEditSaving(true)
    try {
      await updateManagedUser(editedId, {
        email: staffEditEmail.trim(),
        firstName: staffEditFirstName.trim() || null,
        lastName: staffEditLastName.trim() || null,
        userName: staffEditUserName.trim() || null,
        phone: staffEditPhone.trim() || null,
        role: staffEditRole,
      })
      toast({ title: 'Saved' })
      setStaffEditOpen(false)
      setStaffEditId(null)
      await load()
      onChanged()
      if (editedId === ownerId) {
        setFormEmail(staffEditEmail.trim())
        setFormFirstName(staffEditFirstName.trim())
        setFormLastName(staffEditLastName.trim())
        setFormUserName(staffEditUserName.trim())
        setFormPhone(staffEditPhone.trim())
        setFormRole(staffEditRole)
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Save failed', variant: 'destructive' })
    } finally {
      setStaffEditSaving(false)
    }
  }

  const load = useCallback(async () => {
    if (!ownerId) return
    setLoading(true)
    try {
      const d = await getManagedAccountDetail(ownerId)
      setDetail(d)
      const o = d.owner
      setFormUserName(o.userName ?? '')
      setFormBusinessName(o.businessName ?? '')
      setFormDistrict(o.district ?? '')
      setFormFirstName(o.firstName ?? '')
      setFormLastName(o.lastName ?? '')
      setFormEmail(o.email)
      setFormPhone(o.phone ?? '')
      setFormAddress(o.address ?? '')
      setFormRole(o.role as 'ADMIN' | 'STAFF')
      const m = d.maxUsers
      setFormMaxUsers(m === 5 || m === 10 ? m : 1)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to load account', variant: 'destructive' })
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [ownerId, toast])

  useEffect(() => {
    if (open && ownerId) {
      load()
    } else if (!open) {
      setDetail(null)
      setFormPassword('')
      setTeamEmail('')
      setTeamPassword('')
      setTeamFirstName('')
      setTeamLastName('')
      setStaffEditOpen(false)
      setStaffEditId(null)
    }
  }, [open, ownerId, load])

  const handleSaveOwner = async () => {
    if (!ownerId || !detail) return
    if (!formEmail.trim()) {
      toast({ title: 'Email required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await updateManagedUser(ownerId, {
        email: formEmail.trim(),
        role: formRole,
        businessName: formBusinessName.trim() || null,
        district: formDistrict.trim() || null,
        firstName: formFirstName.trim() || null,
        lastName: formLastName.trim() || null,
        phone: formPhone.trim() || null,
        userName: formUserName.trim() || null,
        address: formAddress.trim() || null,
        maxUsers: formMaxUsers,
        ...(formPassword ? { password: formPassword } : {}),
      })
      toast({ title: 'Saved' })
      setFormPassword('')
      await load()
      onChanged()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const copyResetUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Copied', description: 'Reset link copied to clipboard.' })
    } catch {
      toast({ title: 'Reset link', description: url, duration: 20000 })
    }
  }

  const sendReset = async (userId: string) => {
    try {
      const r = await adminSendPasswordResetLink(userId)
      toast({
        title: 'Reset link ready',
        description: 'Copy the link and send it to the user securely.',
      })
      await copyResetUrl(r.resetUrl)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  const addTeamMember = async () => {
    if (!ownerId) return
    if (!teamEmail.trim() || !teamPassword || teamPassword.length < 6) {
      toast({ title: 'Email and password (6+ chars) required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createTeamMemberForAccount(ownerId, {
        email: teamEmail.trim(),
        password: teamPassword,
        role: teamRole,
        firstName: teamFirstName.trim() || undefined,
        lastName: teamLastName.trim() || undefined,
      })
      toast({ title: 'User added' })
      setTeamEmail('')
      setTeamPassword('')
      setTeamFirstName('')
      setTeamLastName('')
      await load()
      onChanged()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to add user', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const removeMember = async (userId: string) => {
    setSaving(true)
    try {
      await deleteTeamMemberAccount(userId)
      toast({ title: 'User removed' })
      await load()
      onChanged()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const archiveBusiness = async () => {
    if (!ownerId) return
    setSaving(true)
    try {
      await archiveManagedUser(ownerId)
      toast({ title: 'Archived', description: 'Login disabled for this account.' })
      onOpenChange(false)
      onChanged()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deleteBusiness = async () => {
    if (!ownerId) return
    setSaving(true)
    try {
      await deleteManagedUser(ownerId)
      toast({ title: 'Deleted' })
      onOpenChange(false)
      onChanged()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const isPlatformAdminAccount = (email: string) =>
    email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()

  const setPaused = async (paused: boolean) => {
    if (!ownerId) return
    setSaving(true)
    try {
      await setManagedBusinessPaused(ownerId, paused)
      toast({
        title: paused ? 'Account paused' : 'Account unpaused',
        description: paused
          ? 'They cannot sign in until you unpause. Active sessions were signed out.'
          : 'They can sign in again.',
      })
      await load()
      onChanged()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const o = detail?.owner

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(90vh,900px)] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
          <DialogTitle className="pr-8">
            {o?.businessName || [o?.firstName, o?.lastName].filter(Boolean).join(' ') || 'Account'}
          </DialogTitle>
          <DialogDescription>
            Business owner and team logins. Changes save to the database immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 px-6 pb-2">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {!loading && detail && o && (
            <>
              <div className="flex flex-wrap gap-2 py-3 shrink-0 border-b">
                <Badge variant="outline">{o.role}</Badge>
                {o.isArchived && <Badge variant="secondary">Archived</Badge>}
                {o.isPaused && <Badge variant="destructive">Paused</Badge>}
                <Badge variant="secondary">
                  {detail.seatsUsed} / {detail.seatCap} seats
                </Badge>
              </div>

              <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0 pt-3">
                <TabsList className="flex w-full h-auto shrink-0 flex-wrap gap-1 bg-muted p-1">
                  <TabsTrigger value="details" className="min-w-[5.5rem] flex-1 gap-1.5 text-xs sm:text-sm">
                    <Building2 className="h-3.5 w-3.5 hidden sm:inline shrink-0" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="security" className="min-w-[5.5rem] flex-1 gap-1.5 text-xs sm:text-sm">
                    <Shield className="h-3.5 w-3.5 hidden sm:inline shrink-0" />
                    Security
                  </TabsTrigger>
                  <TabsTrigger value="team" className="min-w-[5.5rem] flex-1 gap-1.5 text-xs sm:text-sm">
                    <Users className="h-3.5 w-3.5 hidden sm:inline shrink-0" />
                    Team
                  </TabsTrigger>
                  <TabsTrigger value="history" className="min-w-[5.5rem] flex-1 gap-1.5 text-xs sm:text-sm">
                    <History className="h-3.5 w-3.5 hidden sm:inline shrink-0" />
                    History
                  </TabsTrigger>
                  <TabsTrigger
                    value="danger"
                    className="min-w-[5.5rem] flex-1 gap-1.5 text-xs sm:text-sm text-red-900 data-[state=active]:text-red-950"
                  >
                    Danger
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="max-h-[min(52vh,440px)] overflow-y-auto pr-1 pt-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Business & profile</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5 sm:col-span-2">
                        <div className="text-xs font-medium text-muted-foreground">Business name</div>
                        <Input value={formBusinessName} onChange={(e) => setFormBusinessName(e.target.value)} disabled={o.isArchived} />
                      </div>
                      <div className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Display name (username)</div>
                        <Input value={formUserName} onChange={(e) => setFormUserName(e.target.value)} disabled={o.isArchived} placeholder="Optional" />
                      </div>
                      <div className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Location (district)</div>
                        <Input value={formDistrict} onChange={(e) => setFormDistrict(e.target.value)} disabled={o.isArchived} placeholder="e.g. BELIZE" />
                      </div>
                      <div className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">First name</div>
                        <Input value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} disabled={o.isArchived} />
                      </div>
                      <div className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Last name</div>
                        <Input value={formLastName} onChange={(e) => setFormLastName(e.target.value)} disabled={o.isArchived} />
                      </div>
                      <div className="grid gap-1.5 sm:col-span-2">
                        <div className="text-xs font-medium text-muted-foreground">Address</div>
                        <Textarea
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          disabled={o.isArchived}
                          placeholder="Street, city, country…"
                          rows={3}
                          className="min-h-[4.5rem] resize-y"
                        />
                      </div>
                      <div className="grid gap-1.5 sm:col-span-2">
                        <div className="text-xs font-medium text-muted-foreground">Login email</div>
                        <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} disabled={o.isArchived} />
                      </div>
                      <div className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Phone</div>
                        <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} disabled={o.isArchived} />
                      </div>
                      <div className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Role</div>
                        <Select value={formRole} onValueChange={(v) => setFormRole(v as any)} disabled={o.isArchived}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="STAFF">STAFF</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {o.birthday && (
                      <p className="text-xs text-muted-foreground">
                        Birthday on file: {format(new Date(o.birthday), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="security" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="max-h-[min(52vh,440px)] overflow-y-auto pr-1 pt-4 space-y-4">
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">Password</h3>
                      <div className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Set new password (optional)</div>
                        <Input
                          type="password"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          disabled={o.isArchived}
                          placeholder="Leave blank to keep current"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Use Save changes below to apply a new password.</p>
                    </section>
                    <section className="space-y-2 border-t pt-4">
                      <h3 className="text-sm font-semibold text-gray-900">Password reset link</h3>
                      <p className="text-xs text-muted-foreground">
                        Generates a one-time link (check server logs in dev). Copy and send it to the customer.
                      </p>
                      <Button type="button" variant="outline" size="sm" disabled={o.isArchived} onClick={() => sendReset(o.id)}>
                        <KeyRound className="h-4 w-4 mr-1.5" />
                        Email-style reset link (owner)
                      </Button>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="team" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="max-h-[min(52vh,440px)] overflow-y-auto pr-1 pt-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Team logins
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Shared calendar and clients for the team (limited by plan seats). STAFF cannot edit business settings
                      or policies; only ADMIN logins can—use STAFF for day-to-day access, ADMIN only if they should
                      co-manage settings.
                    </p>

                    <div className="rounded-lg border bg-gray-50/80 p-3 space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">Plan seats</div>
                      <Select
                        value={String(formMaxUsers)}
                        onValueChange={(v) => setFormMaxUsers(Number(v) as 1 | 5 | 10)}
                        disabled={o.isArchived}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 seat</SelectItem>
                          <SelectItem value="5">5 seats</SelectItem>
                          <SelectItem value="10">10 seats</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {detail.seatsUsed} / {detail.seatCap} seats in use (saved cap). Change the plan above, then Save
                        changes below to apply.
                      </p>
                    </div>

                    <div className="rounded-lg border divide-y bg-white">
                      <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                        <div>
                          <div className="font-medium text-sm">{o.email}</div>
                          <div className="text-xs text-muted-foreground">Owner · {o.role}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={o.isArchived}
                            onClick={() =>
                              openStaffEdit({
                                id: o.id,
                                email: o.email,
                                firstName: o.firstName,
                                lastName: o.lastName,
                                userName: o.userName,
                                phone: o.phone,
                                role: o.role,
                                label: 'Owner',
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button type="button" variant="outline" size="sm" disabled={o.isArchived} onClick={() => sendReset(o.id)}>
                            Reset link
                          </Button>
                        </div>
                      </div>
                      {detail.members.map((m) => (
                        <div key={m.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                          <div>
                            <div className="font-medium text-sm">{m.email}</div>
                            <div className="text-xs text-muted-foreground">
                              {[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'} · {m.role}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openStaffEdit({
                                  id: m.id,
                                  email: m.email,
                                  firstName: m.firstName,
                                  lastName: m.lastName,
                                  userName: m.userName,
                                  phone: m.phone,
                                  role: m.role,
                                  label: 'Team member',
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => sendReset(m.id)}>
                              Reset link
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="text-red-700 border-red-200">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove this login?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    They will no longer be able to sign in. This does not delete business data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removeMember(m.id)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                      {detail.members.length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground bg-muted/20">
                          No team logins yet—only the owner appears above. Add a real user below; then{' '}
                          <span className="font-medium text-foreground">Remove</span> will work for those saved logins.
                        </div>
                      )}
                    </div>

                    {!o.isArchived && !o.isPaused && (
                      <div className="rounded-lg border border-dashed p-3 space-y-3 bg-gray-50/80">
                        <div className="text-sm font-medium">Add team member</div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input placeholder="Email" value={teamEmail} onChange={(e) => setTeamEmail(e.target.value)} />
                          <Input
                            type="password"
                            placeholder="Temporary password"
                            value={teamPassword}
                            onChange={(e) => setTeamPassword(e.target.value)}
                          />
                          <Input placeholder="First name" value={teamFirstName} onChange={(e) => setTeamFirstName(e.target.value)} />
                          <Input placeholder="Last name" value={teamLastName} onChange={(e) => setTeamLastName(e.target.value)} />
                          <div className="sm:col-span-2">
                            <Select value={teamRole} onValueChange={(v) => setTeamRole(v as any)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="STAFF">STAFF</SelectItem>
                                <SelectItem value="ADMIN">ADMIN</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button type="button" size="sm" className="bg-pink-500 hover:bg-pink-600" onClick={addTeamMember} disabled={saving}>
                          Add user
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="max-h-[min(52vh,440px)] overflow-y-auto pr-1 pt-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Billing & plan history
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Timeline of seat-plan changes, approvals, and account pause/unpause. Card or subscription charges are
                      not wired in yet—this is the internal activity log for this business.
                    </p>
                    <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Account created</span>{' '}
                      {format(new Date(o.createdAt), 'PPp')}
                    </div>
                    <BillingHistoryList items={detail.billingHistory ?? []} maxHeightClass="max-h-[min(48vh,360px)]" />
                  </div>
                </TabsContent>

                <TabsContent value="danger" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden">
                  <div className="max-h-[min(52vh,440px)] overflow-y-auto pr-1 pt-4 space-y-3">
                    <h3 className="text-sm font-semibold text-red-900">Danger zone</h3>
                    <p className="text-xs text-muted-foreground">
                      Pause blocks sign-in; archive disables logins but keeps data; delete is permanent.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {!isPlatformAdminAccount(o.email) && !o.isArchived && (
                        <>
                          {o.isPaused ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="border-emerald-200 text-emerald-800"
                              disabled={saving}
                              onClick={() => setPaused(false)}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              Unpause account
                            </Button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-amber-300 text-amber-900"
                                  disabled={saving}
                                >
                                  <PauseCircle className="h-4 w-4 mr-1" />
                                  Pause account
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Pause this business?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    The owner and team logins cannot sign in until you unpause. Current sessions are
                                    signed out. Their data is not deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => setPaused(true)}>Pause</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="outline" className="text-orange-800 border-orange-200" disabled={o.isArchived || saving}>
                            <Archive className="h-4 w-4 mr-1" />
                            Archive account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive this business?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Disables login for the owner and all team logins under this business. Data is kept; you can restore access later by fixing emails and passwords.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={archiveBusiness}>Archive</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="destructive" disabled={saving}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Removes the owner user, team logins, and related sessions. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600" onClick={deleteBusiness}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className="bg-pink-500 hover:bg-pink-600"
            disabled={saving || loading || !detail || detail.owner.isArchived}
            onClick={handleSaveOwner}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={staffEditOpen} onOpenChange={setStaffEditOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {staffEditLabel}</DialogTitle>
          <DialogDescription>
            Update name, login email, phone, or role. Use Reset link on the Team tab for password setup.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">First name</div>
            <Input value={staffEditFirstName} onChange={(e) => setStaffEditFirstName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">Last name</div>
            <Input value={staffEditLastName} onChange={(e) => setStaffEditLastName(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">Display name (username)</div>
            <Input value={staffEditUserName} onChange={(e) => setStaffEditUserName(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">Login email</div>
            <Input type="email" value={staffEditEmail} onChange={(e) => setStaffEditEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">Phone</div>
            <Input value={staffEditPhone} onChange={(e) => setStaffEditPhone(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid gap-1.5">
            <div className="text-xs font-medium text-muted-foreground">Role</div>
            <Select value={staffEditRole} onValueChange={(v) => setStaffEditRole(v as 'ADMIN' | 'STAFF')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">STAFF</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setStaffEditOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-pink-500 hover:bg-pink-600"
            disabled={staffEditSaving}
            onClick={saveStaffEdit}
          >
            {staffEditSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
