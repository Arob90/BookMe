'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Megaphone, Plus, Pencil, Trash2, ExternalLink, Play, Pause, CalendarDays } from 'lucide-react'
import {
  createPromotion, updatePromotion, deletePromotion, togglePromotionActive, getMyPromotions,
} from '@/app/actions/promotions'

type Promotion = Awaited<ReturnType<typeof getMyPromotions>>[number]

const emptyForm = { title: '', description: '', imageUrl: '', startsAt: '', endsAt: '' }

/** yyyy-mm-dd for a date input from an ISO string. */
function toDateInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function statusOf(p: Promotion): { label: string; cls: string } {
  if (!p.isActive) return { label: 'Paused', cls: 'bg-slate-100 text-slate-600' }
  const now = Date.now()
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' }
  if (p.endsAt && new Date(p.endsAt).getTime() < now) return { label: 'Expired', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'Live', cls: 'bg-emerald-100 text-emerald-700' }
}

export function PromotionsManager({
  initialPromotions,
  profileHref,
}: {
  initialPromotions: Promotion[]
  profileHref: string | null
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    try {
      setPromotions(await getMyPromotions())
    } catch {
      /* ignore */
    }
    router.refresh()
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (p: Promotion) => {
    setEditing(p)
    setForm({
      title: p.title,
      description: p.description ?? '',
      imageUrl: p.imageUrl ?? '',
      startsAt: toDateInput(p.startsAt),
      endsAt: toDateInput(p.endsAt),
    })
    setOpen(true)
  }

  const save = async () => {
    if (form.title.trim().length < 2) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    if (form.imageUrl.trim() && !/^https?:\/\//i.test(form.imageUrl.trim())) {
      toast({ title: 'Image URL must start with http(s)://', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      }
      if (editing) {
        await updatePromotion(editing.id, payload)
        toast({ title: 'Promotion updated' })
      } else {
        await createPromotion(payload)
        toast({ title: 'Promotion posted' })
      }
      setOpen(false)
      setEditing(null)
      await refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (p: Promotion) => {
    try {
      await togglePromotionActive(p.id, !p.isActive)
      setPromotions((prev) => prev.map((x) => (x.id === p.id ? { ...x, isActive: !p.isActive } : x)))
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  const remove = async (p: Promotion) => {
    try {
      await deletePromotion(p.id)
      setPromotions((prev) => prev.filter((x) => x.id !== p.id))
      toast({ title: 'Promotion deleted' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-500" />
              Promotions
            </CardTitle>
            <CardDescription>
              Post discounts and announcements. Live promos show on your public profile and in the sponsored ad rails.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {profileHref && (
              <Button variant="outline" asChild>
                <Link href={profileHref} target="_blank">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> View profile
                </Link>
              </Button>
            )}
            <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="mr-1.5 h-4 w-4" /> New promotion
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {promotions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-900">No promotions yet</p>
              <p className="mt-1 text-sm text-slate-500">Post your first discount or announcement to feature it on your profile.</p>
              <Button onClick={openCreate} className="mt-4 bg-violet-600 hover:bg-violet-700">
                <Plus className="mr-1.5 h-4 w-4" /> New promotion
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((p) => {
                const st = statusOf(p)
                return (
                  <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{p.title}</p>
                        <Badge className={`border-0 text-[10px] ${st.cls}`}>{st.label}</Badge>
                      </div>
                      {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                      {(p.startsAt || p.endsAt) && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {p.startsAt ? new Date(p.startsAt).toLocaleDateString() : '—'}
                          {' → '}
                          {p.endsAt ? new Date(p.endsAt).toLocaleDateString() : 'no end'}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggle(p)}>
                        {p.isActive ? <><Pause className="mr-1 h-4 w-4" /> Pause</> : <><Play className="mr-1 h-4 w-4" /> Resume</>}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                        <Pencil className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-700 border-red-200 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this promotion?</AlertDialogTitle>
                            <AlertDialogDescription>This removes it from your profile and the ad rails. This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600" onClick={() => remove(p)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit promotion' : 'New promotion'}</DialogTitle>
            <DialogDescription>Discounts and announcements appear on your public profile while live.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Title</div>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 20% off all services this week" />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Details (optional)</div>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the offer, terms, dates…" />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Image URL (optional)</div>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <div className="text-sm font-medium">Starts (optional)</div>
                <Input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <div className="text-sm font-medium">Ends (optional)</div>
                <Input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Leave dates blank to show it immediately with no end date.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Post promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
