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
import { Clock, Check } from 'lucide-react'

export default function SignupPage() {
  const { toast } = useToast()
  const [showPendingModal, setShowPendingModal] = useState(false)
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
        setShowPendingModal(true)
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
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 lg:flex lg:flex-col lg:justify-between lg:p-12">
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
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-slate-900">BookMe</span>
          </Link>

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
              className="h-11 w-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading ? 'Creating account…' : 'Create account — start free'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700">Sign in</Link>
          </p>
        </div>
      </div>

      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-600" />
              Request received
            </DialogTitle>
            <DialogDescription>
              Thank you for signing up. Your account request has been submitted. Please wait for payment confirmation.
              Once we receive your payment, we will approve your account and notify you. You can then sign in to access BookMe.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:opacity-90">
              <Link href="/login">Go to sign in</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

