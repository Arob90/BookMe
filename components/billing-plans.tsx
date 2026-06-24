'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { UpgradePaymentModal } from '@/components/upgrade-payment-modal'

export type BillingPlan = {
  name: string
  price: number
  seats: string
  highlight: boolean
  features: string[]
}

export function BillingPlans({ plans }: { plans: BillingPlan[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')

  return (
    <>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 items-start">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`glass-card relative flex flex-col rounded-3xl p-7 ${p.highlight ? 'ring-2 ring-violet-400/60 md:-mt-3 md:mb-3' : ''}`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Most popular
              </span>
            )}
            <h3 className="font-display text-xl font-semibold text-gray-900">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold text-gray-900">${p.price}</span>
              <span className="text-sm text-gray-500">BZD /mo</span>
            </div>
            <p className="mt-2 text-sm font-medium text-violet-600">{p.seats}</p>
            <button
              type="button"
              onClick={() => { setSelected(p.name); setOpen(true) }}
              className={`mt-5 w-full rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                p.highlight
                  ? 'bg-violet-600 text-white shadow-sm hover:bg-violet-700'
                  : 'border-2 border-violet-500 bg-white text-violet-600 hover:bg-violet-50'
              }`}
            >
              Choose {p.name}
            </button>
            <ul className="mt-6 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <UpgradePaymentModal planName={selected} open={open} onOpenChange={setOpen} />
    </>
  )
}
