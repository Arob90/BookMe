'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Loader2 } from 'lucide-react'

const PAYMENT_METHODS = [
  { label: 'Belize Bank', name: 'Alexis Roberts', value: '163837010220001' },
  { label: 'Atlantic Bank', name: 'Alexis Roberts', value: '211203990' },
  { label: 'DigiWallet', name: '', value: '+501 610 6762' },
  { label: 'E-Kyash', name: '', value: '+501 610 6762' },
]

export function UpgradePaymentModal({
  planName,
  open,
  onOpenChange,
}: {
  planName: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('plan', planName)
      const res = await fetch('/api/upgrade-payment-proof', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploaded(true)
      toast({ title: 'Payment proof received', description: 'We’ll verify and activate your plan.' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Please try again.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(() => setUploaded(false), 200) }}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Activate the {planName} plan</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Send your payment using any method below, then upload a screenshot. We’ll verify and
          activate your plan — your account will be set within 12 hours.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="font-display text-sm font-bold text-slate-900">Payment can be made to:</h3>
          <ul className="mt-2.5 space-y-2">
            {PAYMENT_METHODS.map((m) => (
              <li key={m.label} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                  {m.name ? <p className="text-xs text-slate-500">{m.name}</p> : null}
                </div>
                <code className="shrink-0 rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">{m.value}</code>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          {uploaded ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Payment received — processing</p>
                <p className="text-xs text-emerald-700">We’ll activate your {planName} plan once it’s verified.</p>
              </div>
            </div>
          ) : (
            <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-4 py-4 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              {uploading ? 'Uploading…' : 'Upload payment screenshot'}
              <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
          )}
          <p className="mt-2 text-center text-xs text-slate-400">Any file type · up to 10MB</p>
        </div>

        <button onClick={() => onOpenChange(false)} className="mt-5 h-11 w-full rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
          Done
        </button>
      </DialogContent>
    </Dialog>
  )
}
