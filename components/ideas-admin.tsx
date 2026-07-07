'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Check, X, Trash2, Gift, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  getAllIdeas, setIdeaApproval, updateIdeaProgress, rewardIdea, deleteIdea,
} from '@/app/actions/ideas'
import { IDEA_REWARD_DAYS } from '@/lib/ideas-shared'

type AdminIdea = Awaited<ReturnType<typeof getAllIdeas>>[number]

const STATUS_CLS: Record<string, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  APPROVED: 'border-violet-200 bg-violet-50 text-violet-700',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  DENIED: 'border-slate-200 bg-slate-50 text-slate-500',
}

function IdeaRow({ idea }: { idea: AdminIdea }) {
  const { toast } = useToast()
  const router = useRouter()
  const [progress, setProgress] = useState(idea.progress)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await fn(); toast({ title: ok }); router.refresh() }
    catch (e: any) { toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' }) }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{idea.title}</h3>
            <Badge variant="outline" className={STATUS_CLS[idea.status] ?? ''}>{idea.status}</Badge>
            {idea.rewardedDays > 0 && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">+{idea.rewardedDays}d rewarded</Badge>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 font-mono"><Hash className="h-3 w-3" />{idea.ref}</span>
            <span>· {idea.submitterName ?? 'Unknown'}{idea.submitterEmail ? ` (${idea.submitterEmail})` : ''}</span>
            <span>· {format(new Date(idea.createdAt), 'MMM d, yyyy')}</span>
          </p>
        </div>
      </div>

      {idea.details && <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{idea.details}</p>}

      {idea.status === 'PENDING' ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={busy} className="bg-violet-600 hover:bg-violet-700"
            onClick={() => run(() => setIdeaApproval(idea.id, true), 'Approved — now on the board')}>
            <Check className="mr-1 h-4 w-4" /> Approve
          </Button>
          <Button size="sm" variant="outline" disabled={busy} className="text-red-700 border-red-200"
            onClick={() => run(() => setIdeaApproval(idea.id, false), 'Denied')}>
            <X className="mr-1 h-4 w-4" /> Deny
          </Button>
          <DeleteBtn busy={busy} onClick={() => run(() => deleteIdea(idea.id), 'Deleted')} />
        </div>
      ) : idea.status === 'DENIED' ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" disabled={busy}
            onClick={() => run(() => setIdeaApproval(idea.id, true), 'Approved')}>Re-approve</Button>
          <DeleteBtn busy={busy} onClick={() => run(() => deleteIdea(idea.id), 'Deleted')} />
        </div>
      ) : (
        <div className="mt-3 space-y-2 rounded-xl bg-gray-50/70 p-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Progress</label>
            <input type="range" min={0} max={100} value={progress}
              onChange={(e) => setProgress(Number(e.target.value))} className="flex-1 min-w-[140px] accent-violet-600" />
            <Input type="number" min={0} max={100} value={progress}
              onChange={(e) => setProgress(Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-20 tabular-nums" />
          </div>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Public note (shows on their ideas page) — optional" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} className="bg-violet-600 hover:bg-violet-700"
              onClick={() => run(async () => { await updateIdeaProgress(idea.id, { progress, note: note.trim() || null }); setNote('') }, 'Update posted')}>
              Post update
            </Button>
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => run(async () => { await updateIdeaProgress(idea.id, { progress: 100, note: note.trim() || null }); setNote(''); setProgress(100) }, 'Marked complete')}>
              Mark complete
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !idea.staffId}
              className="border-emerald-200 text-emerald-700"
              title={idea.staffId ? '' : 'No linked account'}
              onClick={() => run(() => rewardIdea(idea.id), `Granted ${IDEA_REWARD_DAYS} free days 🎉`)}>
              <Gift className="mr-1 h-4 w-4" /> Reward {IDEA_REWARD_DAYS}d
            </Button>
            <DeleteBtn busy={busy} onClick={() => run(() => deleteIdea(idea.id), 'Deleted')} />
          </div>
        </div>
      )}
    </div>
  )
}

function DeleteBtn({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" disabled={busy} className="ml-auto text-gray-400 hover:text-red-600" onClick={onClick}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

export function IdeasAdmin({ ideas }: { ideas: AdminIdea[] }) {
  const pending = ideas.filter((i) => i.status === 'PENDING')
  const active = ideas.filter((i) => i.status === 'APPROVED')
  const rest = ideas.filter((i) => i.status === 'COMPLETED' || i.status === 'DENIED')

  const Section = ({ title, items }: { title: string; items: AdminIdea[] }) =>
    items.length === 0 ? null : (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">{title} ({items.length})</h3>
        {items.map((i) => <IdeaRow key={i.id} idea={i} />)}
      </div>
    )

  return (
    <div className="space-y-6">
      {ideas.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">No ideas submitted yet.</div>
      )}
      <Section title="Awaiting review" items={pending} />
      <Section title="In progress" items={active} />
      <Section title="Completed & denied" items={rest} />
    </div>
  )
}
