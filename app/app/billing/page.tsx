import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccountLockState } from '@/lib/account-status'
import { BillingPlans, type BillingPlan } from '@/components/billing-plans'

export const dynamic = 'force-dynamic'

const PLANS: BillingPlan[] = [
  { name: 'Basic', price: 45, seats: '1 user', highlight: false, features: ['1 staff login', 'Calendar & scheduling', 'Client CRM', 'Online booking page'] },
  { name: 'Pro', price: 65, seats: 'Up to 5 users', highlight: true, features: ['Up to 5 staff logins', 'Everything in Basic', 'Loyalty, inventory & projects', 'Analytics & payments'] },
  { name: 'Business', price: 99, seats: 'Up to 10 users', highlight: false, features: ['Up to 10 staff logins', 'Everything in Pro', 'Advanced reports', 'Priority support'] },
]

const CONTACT_EMAIL = 'sasoandco.ltd@gmail.com'

export default async function BillingPage() {
  const session = (await getServerSession(authOptions)) as any
  const ownerId: string = session?.user?.businessStaffId || session?.user?.id || ''
  const lock = ownerId ? await getAccountLockState(ownerId) : null
  const locked = !!lock?.locked

  return (
    <div className="min-h-screen w-full overflow-y-auto px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 text-xs font-medium text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
            {locked ? 'Trial ended' : 'Upgrade your plan'}
          </span>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            {locked ? 'Your free trial has ended' : 'Choose your plan'}
          </h1>
          <p className="mt-3 text-gray-600">
            {locked
              ? 'To keep using BookMe, choose a plan below, send your payment and upload the screenshot — we’ll verify and activate your account.'
              : 'Pick the plan that fits your business, send your payment and upload the screenshot — we’ll verify and activate it.'}
          </p>
        </div>

        <BillingPlans plans={PLANS} />

        <div className="mt-10 text-center text-sm text-gray-500">
          <p>
            Questions? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-600 font-medium hover:underline">{CONTACT_EMAIL}</a>.
          </p>
          <p className="mt-4">
            {locked ? (
              <a href="/api/auth/signout?callbackUrl=/login" className="text-gray-500 hover:text-gray-700 underline underline-offset-2">Sign out</a>
            ) : (
              <Link href="/app/dashboard" className="text-gray-500 hover:text-gray-700 underline underline-offset-2">Back to dashboard</Link>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
