'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Lightbulb, Search, Plus, Sparkles, CheckCircle2, Clock, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { submitIdea } from '@/app/actions/ideas'
import type { PublicIdea } from '@/lib/ideas-shared'

type AdminlessIdea = PublicIdea

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Progress</span>
        <span className="tabular-nums text-violet-700">{v}%</span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${v >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  )
}

function IdeaCard({ idea }: { idea: AdminlessIdea }) {
  const [open, setOpen] = useState(false)
  const done = idea.status === 'COMPLETED'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{idea.title}</h3>
          <span className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <Hash className="h-3 w-3" />{idea.ref}
          </span>
        </div>
        {done ? (
          <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500"><CheckCircle2 className="h-3 w-3" /> Live</Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-violet-200 bg-violet-50 text-violet-700"><Clock className="h-3 w-3" /> In progress</Badge>
        )}
      </div>

      {idea.details && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{idea.details}</p>}

      <ProgressBar value={done ? 100 : idea.progress} />

      {idea.publicNote && (
        <p className="mt-3 rounded-xl bg-violet-50/70 px-3 py-2 text-sm text-violet-900">
          <span className="font-semibold">Update:</span> {idea.publicNote}
        </p>
      )}

      {idea.updates.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 text-xs font-semibold text-violet-600 hover:text-violet-700"
          >
            {open ? 'Hide' : 'Show'} update history ({idea.updates.length})
          </button>
          {open && (
            <ol className="mt-2 space-y-2 border-l-2 border-violet-100 pl-3">
              {[...idea.updates].reverse().map((u, i) => (
                <li key={i} className="text-xs text-slate-500">
                  <span className="font-semibold tabular-nums text-violet-700">{u.progress}%</span>
                  {' · '}
                  <span className="text-slate-400">{format(new Date(u.at), 'MMM d, yyyy')}</span>
                  {u.note && <p className="mt-0.5 text-slate-600">{u.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  )
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Under review', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  APPROVED: { label: 'In progress', cls: 'border-violet-200 bg-violet-50 text-violet-700' },
  COMPLETED: { label: 'Live', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  DENIED: { label: 'Not planned', cls: 'border-slate-200 bg-slate-50 text-slate-500' },
}

export function IdeasBoard({ board, mine }: { board: PublicIdea[]; mine: PublicIdea[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')

  const q = query.trim().toLowerCase()
  const match = (i: PublicIdea) =>
    !q || i.ref.toLowerCase().includes(q) || i.title.toLowerCase().includes(q) || (i.details ?? '').toLowerCase().includes(q)

  const inProgress = useMemo(
    () => board.filter((i) => i.status !== 'COMPLETED').filter(match).sort((a, b) => b.progress - a.progress),
    [board, q]
  )
  const completed = useMemo(() => board.filter((i) => i.status === 'COMPLETED').filter(match), [board, q])

  const send = async () => {
    if (title.trim().length < 3) {
      toast({ title: 'Give your idea a short title', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const r = await submitIdea({ title: title.trim(), details: details.trim() || null })
      toast({
        title: 'Idea received — thank you! 💜',
        description: `Your reference is ${r.ref}. We'll review it and, once approved, you can track its progress here.`,
      })
      setTitle(''); setDetails(''); setSubmitOpen(false)
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e?.message ?? 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Intro */}
      <div className="relative overflow-hidden rounded-3xl bg-violet-600 p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="h-3.5 w-3.5" /> Our job is to make your life easier
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Bring your idea to life</h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/85">
              There are so many things that could make running your business easier. If you have an idea,
              let us know — we’ll try our best to make it happen.
            </p>
          </div>
          <Button
            onClick={() => setSubmitOpen(true)}
            className="shrink-0 bg-white text-violet-700 hover:bg-white/90"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Share an idea
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by reference (e.g. IDEA-7Q2F9K) or keyword…"
          className="pl-9"
        />
      </div>

      {/* My submissions */}
      {mine.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Lightbulb className="h-4 w-4 text-amber-500" /> Your submissions
          </h3>
          <div className="mt-3 space-y-2">
            {mine.map((i) => {
              const s = STATUS_LABEL[i.status] ?? STATUS_LABEL.PENDING
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{i.title}</p>
                    <span className="font-mono text-[11px] text-slate-400">{i.ref}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(i.status === 'APPROVED' || i.status === 'COMPLETED') && (
                      <span className="text-xs font-semibold tabular-nums text-violet-700">{i.status === 'COMPLETED' ? 100 : i.progress}%</span>
                    )}
                    <Badge variant="outline" className={s.cls}>{s.label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Board */}
      <Tabs defaultValue="progress">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="progress" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> In progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="done" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-4">
          {inProgress.length === 0 ? (
            <EmptyState text={q ? 'No matching ideas in progress.' : 'No ideas in progress yet — be the first to share one!'} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {inProgress.map((i) => <IdeaCard key={i.id} idea={i} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="done" className="mt-4">
          {completed.length === 0 ? (
            <EmptyState text={q ? 'No matching completed ideas.' : 'Completed ideas will appear here once they go live.'} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {completed.map((i) => <IdeaCard key={i.id} idea={i} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share your idea</DialogTitle>
            <DialogDescription>Tell us what would make your day easier. We review every idea.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Idea title</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send clients an automatic birthday discount" />
            </div>
            <div className="grid gap-1.5">
              <div className="text-sm font-medium">Details <span className="font-normal text-slate-400">(optional)</span></div>
              <Textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="How would it work? What problem does it solve?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={send} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving ? 'Sending…' : 'Send idea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  )
}
