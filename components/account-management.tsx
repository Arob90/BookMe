'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, Archive, Users } from 'lucide-react'
import {
  archiveManagedUser,
  createManagedUser,
  deleteManagedUser,
  getAllManagedUsers,
  updateManagedUser,
} from '@/app/actions/account-admin'
import { AccountDetailDialog } from '@/components/account-detail-dialog'
import { SubscriptionBadge } from '@/components/subscription-badge'

export type ManagedUser = Awaited<ReturnType<typeof getAllManagedUsers>>[number]

export function AccountManagement({ initialUsers }: { initialUsers: ManagedUser[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const hay = `${u.email} ${u.businessName ?? ''} ${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [users, search])

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<ManagedUser | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailOwnerId, setDetailOwnerId] = useState<string | null>(null)

  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'ADMIN' | 'STAFF'>('STAFF')
  const [formBusinessName, setFormBusinessName] = useState('')
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formMaxUsers, setFormMaxUsers] = useState<1 | 5 | 10>(1)
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = () => {
    setFormEmail('')
    setFormPassword('')
    setFormRole('STAFF')
    setFormBusinessName('')
    setFormFirstName('')
    setFormLastName('')
    setFormPhone('')
    setFormMaxUsers(1)
  }

  const openCreate = () => {
    resetForm()
    setCreateOpen(true)
  }

  const planSeatsFromUser = (u: ManagedUser): 1 | 5 | 10 => {
    const m = u.maxUsers
    if (m === 5 || m === 10) return m
    return 1
  }

  const openDetail = (u: ManagedUser) => {
    setDetailOwnerId(u.id)
    setDetailOpen(true)
  }

  const refreshAccountsList = async () => {
    router.refresh()
    try {
      const fresh = await getAllManagedUsers()
      setUsers(fresh)
    } catch {
      /* ignore */
    }
  }

  const openEdit = (u: ManagedUser) => {
    setEditing(u)
    setFormEmail(u.email)
    setFormPassword('')
    setFormRole(u.role as any)
    setFormBusinessName(u.businessName ?? '')
    setFormFirstName(u.firstName ?? '')
    setFormLastName(u.lastName ?? '')
    setFormPhone(u.phone ?? '')
    setFormMaxUsers(planSeatsFromUser(u))
    setEditOpen(true)
  }

  const handleCreate = async () => {
    if (!formEmail.trim()) {
      toast({ title: 'Missing email', variant: 'destructive' })
      return
    }
    if (!formPassword || formPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const created = await createManagedUser({
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        businessName: formBusinessName.trim() || undefined,
        firstName: formFirstName.trim() || undefined,
        lastName: formLastName.trim() || undefined,
        phone: formPhone.trim() || undefined,
        maxUsers: formMaxUsers,
      })
      setUsers((prev) => [created as any, ...prev])
      toast({ title: 'Created', description: 'Account created successfully.' })
      setCreateOpen(false)
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to create', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    if (!formEmail.trim()) {
      toast({ title: 'Missing email', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const updated = await updateManagedUser(editing.id, {
        email: formEmail.trim(),
        role: formRole,
        businessName: formBusinessName.trim() || null,
        firstName: formFirstName.trim() || null,
        lastName: formLastName.trim() || null,
        phone: formPhone.trim() || null,
        maxUsers: formMaxUsers,
        ...(formPassword ? { password: formPassword } : {}),
      })
      setUsers((prev) => prev.map((u) => (u.id === editing.id ? (updated as any) : u)))
      toast({ title: 'Saved', description: 'Account updated.' })
      setEditOpen(false)
      setEditing(null)
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to update', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500" />
              Accounts
            </CardTitle>
            <CardDescription>Click a row for full details, team users, and password reset. Or use the row actions.</CardDescription>
          </div>
          <Button onClick={openCreate} className="bg-pink-500 hover:bg-pink-600">
            <Plus className="h-4 w-4 mr-1.5" />
            New account
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email / name / business…" />
            <div className="text-sm text-gray-500 self-center sm:self-auto sm:ml-auto">
              {filtered.length} shown
            </div>
          </div>

          <div className="divide-y rounded-lg border border-gray-200 bg-white">
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No accounts found.</div>
            ) : (
              filtered.map((u) => (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left rounded-md -m-1 p-1 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                    onClick={() => openDetail(u)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{u.businessName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'}</div>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {u.role}
                      </Badge>
                      {u.maxUsers != null && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {u.maxUsers} seat{u.maxUsers === 1 ? '' : 's'}
                        </Badge>
                      )}
                      {u.isArchived && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          Archived
                        </Badge>
                      )}
                      <SubscriptionBadge endsAt={(u as { subscriptionEndsAt?: string | Date | null }).subscriptionEndsAt} compact showActive={false} />
                    </div>
                    <div className="text-sm text-gray-600 truncate">{u.email}</div>
                    {(u.phone || u.district) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {u.phone ? u.phone : null}
                        {u.phone && u.district ? ' • ' : null}
                        {u.district ? u.district : null}
                      </div>
                    )}
                  </button>

                  <div className="flex items-center gap-2 justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)} disabled={u.isArchived}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-orange-700 border-orange-200 hover:bg-orange-50" disabled={u.isArchived}>
                          <Archive className="h-4 w-4 mr-1" />
                          Archive
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Archive account?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will disable login by revoking sessions and changing the login email. You can “restore” only by editing the account to a real email and setting a new password.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await archiveManagedUser(u.id)
                                toast({ title: 'Archived', description: 'Account disabled.' })
                                await refreshAccountsList()
                              } catch (e: any) {
                                toast({ title: 'Error', description: e?.message ?? 'Failed to archive', variant: 'destructive' })
                              }
                            }}
                          >
                            Archive
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete account?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete the user and their sessions.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await deleteManagedUser(u.id)
                                setUsers((prev) => prev.filter((x) => x.id !== u.id))
                                toast({ title: 'Deleted', description: 'Account deleted.' })
                                await refreshAccountsList()
                              } catch (e: any) {
                                toast({ title: 'Error', description: e?.message ?? 'Failed to delete', variant: 'destructive' })
                              }
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(o) => setCreateOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create account</DialogTitle>
            <DialogDescription>Create an admin or staff login.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Email</div>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Password</div>
              <Input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} type="password" placeholder="At least 6 characters" />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Role</div>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Plan seats</div>
              <Select
                value={String(formMaxUsers)}
                onValueChange={(v) => setFormMaxUsers(Number(v) as 1 | 5 | 10)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 seat (single user)</SelectItem>
                  <SelectItem value="5">5 seats</SelectItem>
                  <SelectItem value="10">10 seats</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">License cap for this business (same as signup approval plans).</p>
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Business name (optional)</div>
              <Input value={formBusinessName} onChange={(e) => setFormBusinessName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <div className="text-sm font-medium">First name</div>
                <Input value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <div className="text-sm font-medium">Last name</div>
                <Input value={formLastName} onChange={(e) => setFormLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Phone</div>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSaving} className="bg-pink-500 hover:bg-pink-600">
              {isSaving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditing(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit account</DialogTitle>
            <DialogDescription>Update details. Set a new password only if you want to change it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Email</div>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">New password (optional)</div>
              <Input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} type="password" placeholder="Leave blank to keep current" />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Role</div>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Plan seats</div>
              <Select
                value={String(formMaxUsers)}
                onValueChange={(v) => setFormMaxUsers(Number(v) as 1 | 5 | 10)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 seat (single user)</SelectItem>
                  <SelectItem value="5">5 seats</SelectItem>
                  <SelectItem value="10">10 seats</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Stored on this account’s business settings (max users).</p>
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Business name</div>
              <Input value={formBusinessName} onChange={(e) => setFormBusinessName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <div className="text-sm font-medium">First name</div>
                <Input value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <div className="text-sm font-medium">Last name</div>
                <Input value={formLastName} onChange={(e) => setFormLastName(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Phone</div>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving || !editing} className="bg-pink-500 hover:bg-pink-600">
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountDetailDialog
        ownerId={detailOwnerId}
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o)
          if (!o) setDetailOwnerId(null)
        }}
        onChanged={refreshAccountsList}
      />
    </div>
  )
}

