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
import { Clock } from 'lucide-react'

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-pink-500 flex items-center justify-center shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-display text-2xl font-semibold tracking-tight text-pink-600">BookMeBz</span>
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-800 mb-2">Create Business Account</h1>
          <p className="text-gray-600 text-sm">Sign up to manage your business with BookMeBz</p>
        </div>

        <Card className="animate-fade-up rounded-[22px] border border-pink-200/70 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-800">Business Owner Sign Up</CardTitle>
            <CardDescription className="text-gray-600">
              Create your business account to start managing appointments and clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-gray-700">Business Name</Label>
                <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="border-gray-300 focus:border-pink-500 focus:ring-pink-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district" className="text-gray-700">District</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger className="border-gray-300 focus:border-pink-500 focus:ring-pink-500">
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
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="border-gray-300 focus:border-pink-500 focus:ring-pink-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="border-gray-300 focus:border-pink-500 focus:ring-pink-500" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input id="email" type="email" placeholder="business@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-gray-300 focus:border-pink-500 focus:ring-pink-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700">Phone (optional)</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-gray-300 focus:border-pink-500 focus:ring-pink-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-gray-300 focus:border-pink-500 focus:ring-pink-500" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="border-gray-300 focus:border-pink-500 focus:ring-pink-500" />
              </div>

              <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white shadow-sm" disabled={isLoading}>
                {isLoading ? 'Creating business account...' : 'Create Business Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Already have an account? </span>
              <Link href="/login" className="text-pink-600 hover:text-pink-700 font-medium">Sign in</Link>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-pink-500" />
                Request received
              </DialogTitle>
              <DialogDescription>
                Thank you for signing up. Your account request has been submitted. Please wait for payment confirmation.
                Once we receive your payment, we will approve your account and notify you. You can then sign in to access BookMeBz.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
              <Button asChild className="bg-pink-500 hover:bg-pink-600">
                <Link href="/login">Go to sign in</Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

