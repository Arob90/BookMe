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
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
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
          <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-800 mb-2">Welcome back</h1>
          <p className="text-gray-600 text-sm">Sign in to your account to continue</p>
        </div>

        <Card className="animate-fade-up rounded-[22px] border border-pink-200/70 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <Suspense fallback={null}>
              <PausedAccountNotice />
            </Suspense>
            <CardTitle className="text-xl font-semibold text-gray-800">Login</CardTitle>
            <CardDescription className="text-gray-600">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@yourbusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-gray-300 focus:border-pink-500 focus:ring-pink-500"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link href="/forgot-password" className="text-pink-600 hover:text-pink-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <Button
                type="submit"
                className="w-full bg-pink-500 hover:bg-pink-600 text-white shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600">Don&apos;t have an account? </span>
              <Link href="/signup" className="text-pink-600 hover:text-pink-700 font-medium">
                Create account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
