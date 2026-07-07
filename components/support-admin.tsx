'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Trash2, Gift, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  getAllSupportReports, updateSupportStatus, rewardSupport, deleteSupportReport,
} from '@/app/actions/support'
import { SUPPORT_STATUSES, SUPPORT_REWARD_DAYS } from '@/lib/support-shared'

type AdminReport = Awaited<ReturnType<typeof getAllSupportReports>>[number]

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending', IN_PROGRESS: 'In progress', HALFWAY: 'Halfway there', COMPLETED: 'Completed',
}
const STATUS_CLS: Record<string, string> = {
  PENDING: 'border-slate-200 bg-slate-50 text-slate-600',
  IN_PROGRESS: 'border-amber-200 bg-amber-50 text-amber-700',
  HALFWAY: 'border-sky-200 bg-sky-50 text-sky-700',
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function ReportRow({ report }: { report: AdminReport }) {
  const { toast } = useToast()
  const router = useRouter()
  const [status, setStatus] = useState(report.status)
  const [note, setNote] = useState(report.adminNote ?? '')
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
            <h3 className="font-semibold text-gray-900">{report.title}</h3>
            <Badge variant="outline" className={STATUS_CLS[report.status] ?? ''}>{STATUS_LABEL[report.status] ?? report.status}</Badge>
            {report.rewardedDays > 0 && (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">+{report.rewardedDays}d rewarded</Badge>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 font-mono"><Hash className="h-3 w-3" />{report.ref}</span>
            <span>· {report.submitterName ?? 'Unknown'}{report.submitterEmail ? ` (${report.submitterEmail})` : ''}</span>
            <span>· {format(new Date(report.createdAt), 'MMM d, yyyy')}</span>
          </p>
        </div>
      </div>

      {report.details && <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{report.details}</p>}

      <div className="mt-3 space-y-2 rounded-xl bg-gray-50/70 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUPPORT_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Note to the reporter (shows on their support page) — optional" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} className="bg-slate-900 hover:bg-slate-800"
            onClick={() => run(() => updateSupportStatus(report.id, { status: status as any, note: note.trim() || null }), 'Updated')}>
            Save
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !report.staffId}
            className="border-emerald-200 text-emerald-700" title={report.staffId ? '' : 'No linked account'}
            onClick={() => run(() => rewardSupport(report.id), `Granted ${SUPPORT_REWARD_DAYS} free days 🎉`)}>
            <Gift className="mr-1 h-4 w-4" /> Reward {SUPPORT_REWARD_DAYS}d
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} className="ml-auto text-gray-400 hover:text-red-600"
            onClick={() => run(() => deleteSupportReport(report.id), 'Deleted')}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SupportAdmin({ reports }: { reports: AdminReport[] }) {
  const open = reports.filter((r) => r.status !== 'COMPLETED')
  const done = reports.filter((r) => r.status === 'COMPLETED')
  return (
    <div className="space-y-6">
      {reports.length === 0 && (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-gray-500">No reports yet.</div>
      )}
      {open.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Open ({open.length})</h3>
          {open.map((r) => <ReportRow key={r.id} report={r} />)}
        </div>
      )}
      {done.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Completed ({done.length})</h3>
          {done.map((r) => <ReportRow key={r.id} report={r} />)}
        </div>
      )}
    </div>
  )
}
