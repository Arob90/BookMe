'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { MarketingNav, MarketingFooter } from '@/components/marketing-chrome'

type Billing = 'monthly' | 'annual'

const TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    blurb: 'For solo owners getting started.',
    monthly: 45,
    annual: 450, // ~2 months free
    seats: '1 user',
    highlight: false,
    features: [
      '1 staff login',
      'Calendar & scheduling',
      'Client CRM & profiles',
      'Public online booking page',
      'Email reminders',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    blurb: 'For growing teams that need more.',
    monthly: 65,
    annual: 650,
    seats: 'Up to 5 users',
    highlight: true,
    features: [
      'Up to 5 staff logins',
      'Everything in Basic',
      'Loyalty points & strike policies',
      'Inventory tracking',
      'Projects pipeline',
      'Analytics & payment tracking',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    blurb: 'For established businesses at scale.',
    monthly: 99,
    annual: 990,
    seats: 'Up to 10 users',
    highlight: false,
    features: [
      'Up to 10 staff logins',
      'Everything in Pro',
      'Advanced reports & exports',
      'Priority support',
    ],
  },
] as const

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <MarketingNav />

      {/* hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl animate-blob-drift" />
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl animate-blob-drift" style={{ animationDelay: '4s' }} />
        </div>
        <div className="mx-auto max-w-3xl px-5 pt-16 text-center sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-600" /> Pricing
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Simple pricing that{' '}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">grows with you</span>.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Start with a <span className="font-semibold text-violet-700">14-day free trial</span> — no card required.
            Pick a plan when you&apos;re ready.
          </p>

          {/* billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-sm shadow-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 font-semibold transition-all ${billing === 'monthly' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 font-semibold transition-all ${billing === 'annual' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Annual
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${billing === 'annual' ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'}`}>2 months free</span>
            </button>
          </div>
        </div>
      </section>

      {/* tiers */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
          {TIERS.map((tier, i) => {
            const price = billing === 'monthly' ? tier.monthly : Math.round(tier.annual / 12)
            return (
              <div
                key={tier.id}
                className={`animate-fade-up relative flex flex-col rounded-3xl p-7 shadow-sm transition-all ${
                  tier.highlight
                    ? 'border-2 border-transparent bg-gradient-to-b from-violet-600 to-fuchsia-600 text-white shadow-xl shadow-violet-600/25 md:-mt-4 md:mb-4'
                    : 'border border-slate-100 bg-white'
                }`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-900 shadow">
                    Most popular
                  </span>
                )}
                <h3 className={`font-display text-xl font-bold ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>{tier.name}</h3>
                <p className={`mt-1 text-sm ${tier.highlight ? 'text-white/80' : 'text-slate-500'}`}>{tier.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`font-display text-5xl font-bold ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>${price}</span>
                  <span className={tier.highlight ? 'text-white/70' : 'text-slate-400'}>/mo</span>
                </div>
                <p className={`mt-1 h-4 text-xs ${tier.highlight ? 'text-white/70' : 'text-slate-400'}`}>
                  {billing === 'annual' ? `Billed $${tier.annual}/year` : `or $${tier.annual}/yr — save 2 months`}
                </p>
                <p className={`mt-3 text-sm font-semibold ${tier.highlight ? 'text-amber-200' : 'text-violet-600'}`}>{tier.seats}</p>

                <Link
                  href="/signup"
                  className={`mt-6 w-full rounded-full px-5 py-3 text-center text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                    tier.highlight
                      ? 'bg-white text-violet-700 shadow hover:shadow-lg'
                      : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-sm hover:shadow-lg'
                  }`}
                >
                  Start free trial
                </Link>

                <ul className="mt-7 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tier.highlight ? 'bg-white/20' : 'bg-violet-100'}`}>
                        <Check className={`h-3 w-3 ${tier.highlight ? 'text-white' : 'text-violet-600'}`} />
                      </span>
                      <span className={tier.highlight ? 'text-white/90' : 'text-slate-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="mx-auto mt-12 max-w-xl text-center text-sm text-slate-500">
          All plans include the 14-day free trial. After the trial, choose a plan to keep your account active.
          Prices in USD. Need something custom?{' '}
          <a href="mailto:sasoandco.ltd@gmail.com" className="font-medium text-violet-600 hover:underline">Contact us</a>.
        </p>
      </section>

      <MarketingFooter />
    </div>
  )
}
