'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { createAccount } from '@/app/actions/auth'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, Upload, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const { toast } = useToast()
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null)
  const [submittedFirstName, setSubmittedFirstName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [district, setDistrict] = useState('BELIZE')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const DISTRICTS = [
    { value: 'COROZAL', label: 'Corozal' },
    { value: 'ORANGE_WALK', label: 'Orange Walk' },
    { value: 'BELIZE', label: 'Belize' },
    { value: 'CAYO', label: 'Cayo' },
    { value: 'STANN_CREEK', label: 'Stann Creek' },
    { value: 'TOLEDO', label: 'Toledo' },
    { value: 'SAN_PEDRO', label: 'San Pedro' },
    { value: 'CAYE_CAULKER', label: 'Caye Caulker' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await createAccount({
        businessName,
        district,
        firstName,
        lastName,
        email,
        phone,
        password,
      })
      if (result.pending) {
        setSubmittedRequestId(result.requestId ?? null)
        setSubmittedFirstName(result.firstName ?? firstName)
      } else {
        toast({
          title: 'Account created',
          description: 'Your business account has been created. You can now sign in.',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls = 'h-11 rounded-xl border-slate-200 focus:border-violet-400 focus-visible:ring-violet-200'
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-violet-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-blob-drift" />
          <div className="absolute -bottom-16 right-0 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl animate-blob-drift" style={{ animationDelay: '5s' }} />
        </div>
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight text-white">BookMe</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-bold leading-tight text-white">
            Start your 14 days, free.
          </h2>
          <ul className="mt-6 space-y-3">
            {['Bookings, clients & payments in one place', 'Public booking link for your clients', 'No card required to start'].map((t) => (
              <li key={t} className="flex items-center gap-3 text-white/85">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15"><Check className="h-3.5 w-3.5 text-white" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">© 2026 BookMe · Belize</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center overflow-y-auto bg-white px-5 py-12 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-slate-900">BookMe</span>
          </Link>

          {submittedRequestId ? (
            <PaymentActivation requestId={submittedRequestId} firstName={submittedFirstName} />
          ) : (
          <>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-500">Set up your business and start taking bookings today.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName" className="text-sm font-medium text-slate-700">Business name</Label>
              <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district" className="text-sm font-medium text-slate-700">District</Label>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:border-violet-400 focus:ring-violet-200">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">First name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">Last name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input id="email" type="email" placeholder="business@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone <span className="text-slate-400">(optional)</span></Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputCls} />
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="h-11 w-full rounded-full bg-violet-600 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading ? 'Creating account…' : 'Create account — start free'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">Sign in</Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  )
}

const PAYMENT_METHODS = [
  { label: 'Belize Bank', name: 'Alexis Roberts', value: '163837010220001' },
  { label: 'Atlantic Bank', name: 'Alexis Roberts', value: '211203990' },
  { label: 'DigiWallet', name: '', value: '+501 610 6762' },
  { label: 'E-Kyash', name: '', value: '+501 610 6762' },
]

function PaymentActivation({ requestId, firstName }: { requestId: string; firstName: string }) {
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
    <div className="animate-fade-up">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
        <Check className="h-7 w-7" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-900">
        Thank you{firstName ? `, ${firstName}` : ''}! 🎉
      </h1>
      <p className="mt-2 text-slate-600">
        Your account will be activated <span className="font-semibold text-slate-900">within 12 hours</span>.
        Thanks so much for signing up — we appreciate your patience.
      </p>

      {/* Payment instructions */}
      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <h2 className="font-display text-base font-bold text-slate-900">Payment can be made to:</h2>
        <ul className="mt-3 space-y-2.5">
          {PAYMENT_METHODS.map((m) => (
            <li key={m.label} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                {m.name ? <p className="text-xs text-slate-500">{m.name}</p> : null}
              </div>
              <code className="shrink-0 rounded-lg bg-violet-50 px-2.5 py-1 text-sm font-semibold text-violet-700">{m.value}</code>
            </li>
          ))}
        </ul>
      </div>

      {/* Upload proof */}
      <div className="mt-5">
        {uploaded ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Payment received — processing</p>
              <p className="text-xs text-emerald-700">We’ll activate your account once it’s verified.</p>
            </div>
          </div>
        ) : (
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/50 px-4 py-5 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            {uploading ? 'Uploading…' : 'Upload payment screenshot'}
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        )}
        <p className="mt-2 text-center text-xs text-slate-400">Any file type · up to 10MB</p>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/" className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
          Back to home
        </Link>
        <Link href="/login" className="flex-1 rounded-full bg-violet-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
          Go to sign in
        </Link>
      </div>
    </div>
  )
}

