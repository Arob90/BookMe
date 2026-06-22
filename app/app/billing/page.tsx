import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAccountLockState } from '@/lib/account-status'
import { Check } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PLANS = [
  { name: 'Basic', price: 29, seats: '1 user', highlight: false, features: ['1 staff login', 'Calendar & scheduling', 'Client CRM', 'Online booking page'] },
  { name: 'Pro', price: 59, seats: 'Up to 5 users', highlight: true, features: ['Up to 5 staff logins', 'Everything in Basic', 'Loyalty, inventory & projects', 'Analytics & payments'] },
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
              ? 'To keep using BookMeBz, choose a plan below and contact us to activate your account.'
              : 'Pick the plan that fits your business. Contact us and we’ll activate it for you.'}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`glass-card rounded-3xl p-7 flex flex-col relative ${p.highlight ? 'ring-2 ring-pink-400/60 md:-mt-3 md:mb-3' : ''}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-xl font-semibold text-gray-900">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold text-gray-900">${p.price}</span>
                <span className="text-gray-500 text-sm">/mo</span>
              </div>
              <p className="mt-2 text-sm font-medium text-pink-600">{p.seats}</p>
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Activate BookMeBz ' + p.name + ' plan')}&body=${encodeURIComponent('Please activate the ' + p.name + ' plan for my account (' + (session?.user?.email || '') + ').')}`}
                className={`mt-5 w-full text-center px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5 ${
                  p.highlight ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-sm' : 'border-2 border-pink-500 text-pink-600 bg-white hover:bg-pink-50'
                }`}
              >
                Choose {p.name}
              </a>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

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
