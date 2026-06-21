'use client'

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type Feature = {
  id: string
  title: string
  description: string
  bullets: string[]
  quickTags: string[]
  imageSrc: string
  icon: React.ReactNode
}

export function FeatureFlipGrid() {
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null)
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null)

  const features: Feature[] = useMemo(
    () => [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description:
          'The dashboard provides a unified operational snapshot of your business, bringing together income performance, appointment activity, birthdays, stock alerts, loyalty movement, strike trends, and upcoming actions so your team can prioritize with confidence.',
        bullets: [
          'Monitor scheduled and completed daily income side by side for clearer financial visibility',
          'Review this week\'s upcoming appointments with direct access to detailed records',
          'Identify birthdays, low-stock risks, top loyalty customers, and strike-heavy profiles in one view',
          'Stay aligned on execution through task and reminder previews linked to calendar context',
        ],
        quickTags: ['Executive view', 'Operational control', 'Decision-ready'],
        imageSrc: '/uploads/dashboard.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
          </svg>
        ),
      },
      {
        id: 'smart-scheduling',
        title: 'Smart Scheduling',
        description:
          'Smart Scheduling centralizes appointments, tasks, and reminders into a single planning workflow, helping teams coordinate time, reduce conflicts, and maintain a consistent daily rhythm across service delivery.',
        bullets: [
          'Plan with confidence using a broad calendar horizon that includes current and near-term activity',
          'Create, reschedule, and adjust appointments through streamlined in-context workflows',
          'Track tasks and reminders alongside bookings to keep operational commitments visible',
          'Navigate directly to specific dates and records from dashboard and deep-link entry points',
        ],
        quickTags: ['Scheduling hub', 'Calendar intelligence', 'Workflow speed'],
        imageSrc: '/uploads/smart-scheduling.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        id: 'client-management',
        title: 'Client Management',
        description:
          'Client Management gives your team a structured client database with practical filtering, rapid lookup, and record-level detail access to support personalized service and consistent follow-up across every visit.',
        bullets: [
          'Locate the right records quickly with filters for birthdays, strikes, VIP status, and client type',
          'Access full client profiles to review key details and historical interactions',
          'Connect client context seamlessly across appointments, loyalty, and strike workflows',
          'Maintain service consistency with centralized, business-scoped information management',
        ],
        quickTags: ['Client intelligence', 'Profile depth', 'Relationship continuity'],
        imageSrc: '/uploads/client-management.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
          </svg>
        ),
      },
      {
        id: 'project-pipeline',
        title: 'Project Pipeline',
        description:
          'Project Pipeline delivers a configurable, stage-based workflow for managing opportunities and active work, giving your team better visibility into progress, bottlenecks, and next actions from initiation through completion.',
        bullets: [
          'Customize your process with editable stages, color coding, folding, and ordering controls',
          'Move projects fluidly between stages using drag-and-drop progression management',
          'Track project value and status in a visual board designed for fast situational awareness',
          'Launch follow-up tasks and reminders directly from project context to improve execution',
        ],
        quickTags: ['Pipeline control', 'Visual workflow', 'Execution clarity'],
        imageSrc: '/uploads/project-pipeline.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h7v12H4V6zm9 3h7v9h-7V9z" />
          </svg>
        ),
      },
      {
        id: 'payment-tracking',
        title: 'Payment Tracking',
        description:
          'Payment Tracking strengthens financial oversight by connecting appointment-level outcomes to daily and monthly revenue insights, giving business owners a clearer picture of realized value and operational performance.',
        bullets: [
          'Compare scheduled versus completed income to understand daily financial execution',
          'Drill into appointment details to validate totals, statuses, and service-level contribution',
          'Track monthly revenue and average ticket performance for stronger decision support',
          'Factor no-shows and appointment volume into broader payment and profitability analysis',
        ],
        quickTags: ['Revenue visibility', 'Financial clarity', 'Performance insight'],
        imageSrc: '/uploads/payment-tracking.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        id: 'inventory-tracking',
        title: 'Inventory Tracking',
        description:
          'Inventory Tracking helps maintain service readiness by organizing stock records, surfacing low-level risk early, and supporting cleaner inventory operations through category structure and archive-aware views.',
        bullets: [
          'Manage inventory across active and archived contexts without losing historical continuity',
          'Pinpoint restock priorities quickly using dedicated low-stock filtering workflows',
          'Navigate directly from alerts to item-specific records for faster corrective action',
          'Keep operational stock aligned with appointment demand and service commitments',
        ],
        quickTags: ['Stock governance', 'Restock readiness', 'Operational continuity'],
        imageSrc: '/uploads/inventory-tracking.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
          </svg>
        ),
      },
      {
        id: 'services-management',
        title: 'Services Management',
        description:
          'Services Management provides a structured catalog workspace for defining, categorizing, and maintaining offerings, ensuring your booking and reporting workflows are powered by clean, reliable service data.',
        bullets: [
          'Build and refine service entries with category organization that scales with your business',
          'Maintain active and archived service views to reduce clutter and preserve history',
          'Keep pricing and offer definitions consistent across front-desk and booking operations',
          'Feed accurate service metadata into appointments, analytics, and reporting modules',
        ],
        quickTags: ['Catalog integrity', 'Pricing consistency', 'Scalable structure'],
        imageSrc: '/uploads/services-management.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        ),
      },
      {
        id: 'loyalty-strike',
        title: 'Loyalty & Strike System',
        description:
          'The Loyalty & Strike System balances retention and accountability by centralizing points activity, strike events, and policy-aware workflows that help teams apply rules consistently while supporting long-term client value.',
        bullets: [
          'Track loyalty balances and strike signals across your client base in one consolidated workspace',
          'Review detailed client-level points and strike histories from dashboard and loyalty contexts',
          'Apply configuration-driven policy behavior for fair and repeatable team decisions',
          'Use ranking and event trends to identify high-value clients and emerging risk patterns',
        ],
        quickTags: ['Retention strategy', 'Policy enforcement', 'Risk visibility'],
        imageSrc: '/uploads/loyalty-strike-system.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm-7 4h14M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        ),
      },
      {
        id: 'analytics-reports',
        title: 'Analytics & Reports',
        description:
          'Analytics & Reports delivers a performance measurement layer across revenue, appointments, growth, service mix, top clients, and no-shows, enabling data-backed decisions for both daily operations and longer-term strategy.',
        bullets: [
          'Analyze monthly sales, appointment outcomes, and client growth trajectories',
          'Identify top-performing services and peak-time behavior to optimize capacity',
          'Compare month-over-month movement to assess momentum and operational shifts',
          'Monitor revenue totals, average ticket, top-client contribution, and no-show impact',
        ],
        quickTags: ['Strategic analytics', 'Performance reporting', 'Growth insight'],
        imageSrc: '/uploads/analytics-reports.png',
        icon: (
          <svg className="h-5 w-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2" />
          </svg>
        ),
      },
    ],
    []
  )

  const activeFeature = useMemo(
    () => features.find((f) => f.id === activeFeatureId) ?? null,
    [features, activeFeatureId]
  )

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFeatureId(f.id)}
            className="group flex w-full flex-col rounded-[22px] border-2 border-pink-200 bg-white px-5 py-3.5 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 sm:px-6 sm:py-4"
            aria-label={`${f.title}. Open details`}
          >
            <div className="mx-auto mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-pink-50 ring-1 ring-pink-100">
              {f.icon}
            </div>
            <h3 className="mb-1.5 text-center text-base font-semibold leading-snug text-slate-900">{f.title}</h3>
            <p className="text-center text-sm leading-relaxed text-slate-600 line-clamp-2">{f.description}</p>
            <div className="mt-2.5 shrink-0 text-center">
              <span className="inline-flex items-center justify-center rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-[11px] font-semibold text-pink-700">
                View details
              </span>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!activeFeature} onOpenChange={(open) => !open && setActiveFeatureId(null)}>
        <DialogContent className="max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-3xl gap-0 overflow-hidden p-0">
          {activeFeature && (
            <div className="flex max-h-[min(92vh,900px)] flex-col bg-white">
              {/* App Store–style header + screenshot strip */}
              <div className="shrink-0 border-b border-pink-100 bg-gradient-to-br from-pink-50/60 via-white to-white">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">BookMeBz</p>
                      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{activeFeature.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">Product feature</p>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                  <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
                    <div className="snap-start w-full shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveImageSrc(activeFeature.imageSrc)}
                        className="group relative mx-auto block w-full max-w-[34rem] rounded-2xl border border-pink-200 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
                        aria-label={`Expand ${activeFeature.title} screenshot`}
                      >
                        <FeatureScreenshot
                          key={activeFeature.id}
                          src={activeFeature.imageSrc}
                          title={activeFeature.title}
                          className="w-full h-auto max-h-[240px] sm:max-h-[300px] object-contain bg-white"
                        />
                        <span className="pointer-events-none absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-pink-700 shadow-sm ring-1 ring-pink-200">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6v6m-6-6l6 6M9 21H3v-6m6 6l-6-6" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {activeFeature.quickTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 sm:text-base">About</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 sm:text-base">
                      {activeFeature.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Highlights</h3>
                    <ul className="mt-2 space-y-2">
                      {activeFeature.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-pink-500" />
                          <span className="leading-relaxed">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot lightbox */}
      <Dialog open={!!activeImageSrc} onOpenChange={(open) => !open && setActiveImageSrc(null)}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-5xl p-0 overflow-hidden bg-black border-black/20">
          {activeImageSrc && (
            <div className="relative">
              <div className="max-h-[85vh] w-full bg-black">
                <img
                  src={activeImageSrc}
                  alt="Expanded screenshot"
                  className="max-h-[85vh] w-full object-contain"
                />
              </div>
              <div className="border-t border-white/10 bg-black/80 px-4 py-3 text-center text-xs text-white/80">
                Press Esc to close
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FeatureScreenshot({ src, title, className }: { src: string; title: string; className?: string }) {
  const [missing, setMissing] = useState(false)

  if (missing) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">
          Screenshot not found. Add <span className="font-mono">public{src}</span>
        </p>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`${title} screenshot`}
      className={className ?? 'h-full w-full object-contain bg-white'}
      onError={() => setMissing(true)}
    />
  )
}
