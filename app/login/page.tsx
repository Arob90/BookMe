'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

function PausedAccountNotice() {
  const searchParams = useSearchParams()
  if (searchParams.get('paused') !== '1') return null
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Your account access has been paused. Please contact BookMeBz support or your administrator to restore access.
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        console.error('Login error:', result.error)
        const errorMessage = result.error === 'CredentialsSignin'
          ? 'Invalid email or password.'
          : result.error.includes('database') || result.error.includes('Database')
          ? 'Database connection error. Please check your server database configuration (.env).'
          : 'Invalid email or password'

        toast({
          title: 'Login failed',
          description: errorMessage,
          variant: 'destructive',
        })
      } else {
        router.push('/app/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

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
            Welcome back to calmer days.
          </h2>
          <p className="mt-4 max-w-sm text-white/80">
            Your whole business — bookings, clients, payments and loyalty — waiting right where you left it.
          </p>
        </div>
        <p className="relative text-sm text-white/60">© 2026 BookMe · Belize</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-white px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm animate-fade-up">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-slate-900">BookMe</span>
          </Link>

          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your credentials to access your account.</p>

          <Suspense fallback={null}><PausedAccountNotice /></Suspense>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="email" type="email" placeholder="you@yourbusiness.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required
                className="h-11 rounded-xl border-slate-200 focus:border-violet-400 focus-visible:ring-violet-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <Input
                id="password" type="password" placeholder="Enter your password"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                className="h-11 rounded-xl border-slate-200 focus:border-violet-400 focus-visible:ring-violet-200"
              />
            </div>
            <div className="flex justify-end text-sm">
              <Link href="/forgot-password" className="font-medium text-violet-600 hover:text-violet-700">Forgot password?</Link>
            </div>
            <button
              type="submit" disabled={isLoading}
              className="h-11 w-full rounded-full bg-violet-600 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-violet-600 hover:text-violet-700">Get started</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
