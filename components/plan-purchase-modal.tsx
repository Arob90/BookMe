'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createAccount } from '@/app/actions/auth'
import { DISTRICTS } from '@/lib/districts'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'

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
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [district, setDistrict] = useState('BELIZE')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function reset() {
    setBusinessName(''); setBusinessCategory(''); setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setPassword(''); setConfirmPassword('')
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
      await createAccount({ businessName, businessCategory, district, firstName, lastName, email, phone, password })
      setLoading(false)
      setSigningIn(true)
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) {
        toast({ title: 'Account created', description: 'Your account is ready — please sign in.' })
        onOpenChange(false)
        router.push('/login')
        return
      }
      router.push('/app/dashboard')
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create account.', variant: 'destructive' })
      setSigningIn(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200) }}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Get started — {planName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">Create your business account and start your 14-day free trial right away.</p>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="m-bn" className="text-xs font-medium text-slate-700">Business name</Label>
            <Input id="m-bn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className={inputCls} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="m-cat" className="text-xs font-medium text-slate-700">Business category</Label>
            <Select value={businessCategory} onValueChange={setBusinessCategory}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200"><SelectValue placeholder="What kind of business?" /></SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
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
          <button type="submit" disabled={loading || signingIn} className="h-11 w-full rounded-full bg-violet-600 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60">
            {loading ? 'Creating…' : signingIn ? 'Signing you in…' : 'Create account — start free'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
