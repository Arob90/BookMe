'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createAccount } from '@/app/actions/auth'
import { DISTRICTS } from '@/lib/districts'
import { Check, Upload, Loader2 } from 'lucide-react'

const PAYMENT_METHODS = [
  { label: 'Belize Bank', name: 'Alexis Roberts', value: '163837010220001' },
  { label: 'Atlantic Bank', name: 'Alexis Roberts', value: '211203990' },
  { label: 'DigiWallet', name: '', value: '+501 610 6762' },
  { label: 'E-Kyash', name: '', value: '+501 610 6762' },
]

const inputCls = 'h-10 rounded-xl border-slate-200 focus:border-violet-400 focus-visible:ring-violet-200'

export function PlanPurchaseModal({
  planName,
  open,
  onOpenChange,
}: {
  planName: string
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { toast } = useToast()
  const [step, setStep] = useState<'form' | 'payment'>('form')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [doneName, setDoneName] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [district, setDistrict] = useState('BELIZE')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function reset() {
    setStep('form'); setRequestId(null); setUploaded(false)
    setBusinessName(''); setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setPassword(''); setConfirmPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return
    }
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' }); return
    }
    setLoading(true)
    try {
      const res = await createAccount({ businessName, district, firstName, lastName, email, phone, password })
      if (res.pending) {
        setRequestId(res.requestId ?? null)
        setDoneName(res.firstName ?? firstName)
        setStep('payment')
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create account.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !requestId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('requestId', requestId)
      const res = await fetch('/api/public/payment-proof', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploaded(true)
      toast({ title: 'Payment proof received', description: 'We’ll verify and activate your account.' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Please try again.', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200) }}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Get started — {planName}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500">Create your business account. Payment instructions come next.</p>
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="m-bn" className="text-xs font-medium text-slate-700">Business name</Label>
                <Input id="m-bn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={inputCls} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-d" className="text-xs font-medium text-slate-700">District</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="m-fn" className="text-xs font-medium text-slate-700">First name</Label>
                  <Input id="m-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputCls} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-ln" className="text-xs font-medium text-slate-700">Last name</Label>
                  <Input id="m-ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputCls} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-em" className="text-xs font-medium text-slate-700">Email</Label>
                <Input id="m-em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-ph" className="text-xs font-medium text-slate-700">Phone <span className="text-slate-400">(optional)</span></Label>
                <Input id="m-ph" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="m-pw" className="text-xs font-medium text-slate-700">Password</Label>
                  <Input id="m-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-cp" className="text-xs font-medium text-slate-700">Confirm</Label>
                  <Input id="m-cp" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputCls} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-violet-600 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60">
                {loading ? 'Creating…' : 'Continue to payment'}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-fade-up">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-slate-900">Thank you{doneName ? `, ${doneName}` : ''}! 🎉</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Your account will be activated <span className="font-semibold text-slate-900">within 12 hours</span>. Thanks for signing up and for your patience.
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
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
                    <p className="text-xs text-emerald-700">We’ll activate your account once it’s verified.</p>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
