'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { LifeBuoy, Plus, Hash, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { submitSupportReport } from '@/app/actions/support'
import type { SupportReportView } from '@/lib/support-shared'

const STATUS: Record<string, { label: string; cls: string; pct: number }> = {
  PENDING: { label: 'Received', cls: 'border-slate-200 bg-slate-50 text-slate-600', pct: 10 },
  IN_PROGRESS: { label: 'In progress', cls: 'border-amber-200 bg-amber-50 text-amber-700', pct: 40 },
  HALFWAY: { label: 'Halfway there', cls: 'border-sky-200 bg-sky-50 text-sky-700', pct: 70 },
  COMPLETED: { label: 'Completed!', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', pct: 100 },
}

export function SupportPanel({ mine }: { mine: SupportReportView[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')

  const send = async () => {
    if (title.trim().length < 3) {
      toast({ title: 'Briefly describe the problem', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const r = await submitSupportReport({ title: title.trim(), details: details.trim() || null })
      toast({
        title: 'Report sent — thank you for your patience 🙏',
        description: `Your reference is ${r.ref}. We'll get on it and keep you posted here.`,
      })
      setTitle(''); setDetails(''); setOpen(false)
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Could not send', description: e?.message ?? 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-500/20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <LifeBuoy className="h-3.5 w-3.5" /> Tech support
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Found a bug or error?</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/80">
              Let us know and we’ll fix it. You can follow the status of every report right here.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="shrink-0 bg-white text-slate-900 hover:bg-white/90">
            <Plus className="mr-1.5 h-4 w-4" /> Report a problem
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Bug className="h-4 w-4 text-slate-500" /> Your reports
        </h3>
        {mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
            <p className="text-sm text-slate-500">No reports yet. If something isn’t working, tell us above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((r) => {
              const s = STATUS[r.status] ?? STATUS.PENDING
              return (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{r.title}</p>
                      <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <Hash className="h-3 w-3" />{r.ref} · {format(new Date(r.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                  </div>
                  {r.details && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{r.details}</p>}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${r.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-violet-500'}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                  {r.adminNote && (
                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="font-semibold">Support:</span> {r.adminNote}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>Describe what went wrong. The more detail, the faster we can fix it.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">What happened?</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Calendar won't load on my phone" />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Details <span className="font-normal text-slate-400">(optional)</span></div>
              <Textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What were you doing? What did you expect vs. what happened?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={send} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? 'Sending…' : 'Send report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
