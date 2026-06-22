'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

type Billing = 'monthly' | 'annual'

const TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    blurb: 'For solo owners getting started.',
    monthly: 29,
    annual: 290, // ~2 months free
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
    monthly: 59,
    annual: 590,
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/40 glass-nav sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="h-9 w-9 rounded-xl bg-pink-500 flex items-center justify-center shadow-sm">
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-display text-xl font-semibold tracking-tight text-pink-600">BookMeBz</span>
          </Link>
          <Link
            href="/login"
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm transition-all hover:-translate-y-0.5"
          >
            Login
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1">
        <div className="text-center max-w-2xl mx-auto animate-fade-up">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
            Simple pricing that grows with you
          </h1>
          <p className="mt-3 text-gray-600">
            Start with a <span className="font-semibold text-pink-600">14-day free trial</span> — no card required.
            Pick a plan when you&apos;re ready.
          </p>

          {/* Billing toggle */}
          <div className="mt-7 inline-flex items-center gap-1 glass rounded-full p-1 text-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors ${billing === 'monthly' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-4 py-1.5 rounded-full font-medium transition-colors ${billing === 'annual' ? 'bg-pink-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Annual
              <span className="ml-1.5 text-xs font-semibold text-pink-600 bg-white/80 rounded-full px-1.5 py-0.5">2 months free</span>
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {TIERS.map((tier, i) => {
            const price = billing === 'monthly' ? tier.monthly : Math.round(tier.annual / 12)
            return (
              <div
                key={tier.id}
                className={`animate-fade-up glass-card rounded-3xl p-7 flex flex-col relative ${tier.highlight ? 'ring-2 ring-pink-400/60 md:-mt-3 md:mb-3' : ''}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-xl font-semibold text-gray-900">{tier.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{tier.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold text-gray-900">${price}</span>
                  <span className="text-gray-500 text-sm">/mo</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 h-4">
                  {billing === 'annual' ? `Billed $${tier.annual}/year` : `or $${tier.annual}/yr (save 2 months)`}
                </p>
                <p className="mt-3 text-sm font-medium text-pink-600">{tier.seats}</p>

                <Link
                  href="/signup"
                  className={`mt-5 w-full text-center px-5 py-2.5 rounded-full font-semibold text-sm transition-all hover:-translate-y-0.5 ${
                    tier.highlight
                      ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-sm'
                      : 'border-2 border-pink-500 text-pink-600 bg-white hover:bg-pink-50'
                  }`}
                >
                  Start free trial
                </Link>

                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-pink-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm text-gray-500 max-w-xl mx-auto">
          All plans include the 14-day free trial. After the trial, choose a plan to keep your account active.
          Prices in USD. Need something custom?{' '}
          <a href="mailto:sasoandco.ltd@gmail.com" className="text-pink-600 font-medium hover:underline">Contact us</a>.
        </p>
      </main>

      <footer className="border-t border-white/40 glass-nav mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center">
          <p className="text-sm text-gray-600">
            Powered by <span className="font-semibold text-pink-600">SaSo Pixel Studio</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
