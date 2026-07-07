import Link from 'next/link'
import { ArrowRight, Sparkles, CalendarPlus, Share2, CheckCircle2, ShieldCheck, Smartphone, Clock } from 'lucide-react'
import { MarketingNav, MarketingFooter } from '@/components/marketing-chrome'
import { FeatureFlipGrid } from '@/components/feature-flip-grid'

export const metadata = {
  title: 'Features · BookMe',
  description: 'Everything BookMe does for service providers — your own booking page plus scheduling, CRM, payments, loyalty, inventory and analytics.',
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl animate-blob-drift" />
          <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-violet-100/60 blur-3xl animate-blob-drift" style={{ animationDelay: '4s' }} />
        </div>
        <div className="mx-auto max-w-3xl px-5 pt-16 text-center sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <Sparkles className="h-3.5 w-3.5" /> Features
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
            One app for the whole <span className="text-violet-600">back office</span>.
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Let clients book themselves online — then let BookMe handle the
            busywork, from the first booking to the final report. Explore what&apos;s inside.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl">
              Start free — 14 days <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 transition-colors hover:border-violet-200 hover:bg-violet-50">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature grid (click → modal) */}
      <section id="all-features" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Explore</p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Every tool, up close
          </h2>
          <p className="mt-4 text-slate-600">Tap any feature to see a screenshot and the full details.</p>
        </div>
        <FeatureFlipGrid />
      </section>

      {/* How it works */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">How it works</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Live in three steps</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [<CalendarPlus key="1" className="h-6 w-6" />, '1 · Set up your services', 'Add what you offer, your hours and your team. Takes minutes, not a training day.'],
              [<Share2 key="2" className="h-6 w-6" />, '2 · Your booking link', 'Add your personal link to Instagram, WhatsApp or your site — clients book themselves.'],
              [<CheckCircle2 key="3" className="h-6 w-6" />, '3 · Run your day', 'Confirmations, reminders, payments and loyalty all happen automatically.'],
            ].map(([icon, t, b]) => (
              <div key={t as string} className="glass-card rounded-3xl p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">{icon}</span>
                <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{t as string}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{b as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlight band */}
      <section className="px-5 py-20 sm:px-8 sm:py-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-violet-600 px-6 py-14 sm:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-12 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-16 left-6 h-60 w-60 rounded-full bg-white/5 blur-2xl" />
          </div>
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Built to be calm, fast and reliable.
              </h2>
              <p className="mt-4 max-w-md text-white/80">
                BookMe is designed for real service providers — quick to learn, dependable
                every day, and secure by default.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [<ShieldCheck key="a" className="h-5 w-5" />, 'Secure & isolated', 'Your data is fully separated from every other business.'],
                [<Smartphone key="b" className="h-5 w-5" />, 'Any device', 'Desktop, tablet and phone — nothing to install.'],
                [<Clock key="c" className="h-5 w-5" />, 'Always on', 'Clients can book 24/7, even while you sleep.'],
                [<Sparkles key="d" className="h-5 w-5" />, 'Always improving', 'New features land regularly at no extra cost.'],
              ].map(([icon, t, b]) => (
                <div key={t as string} className="rounded-2xl bg-white/10 p-5 backdrop-blur-md ring-1 ring-white/15">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">{icon}</span>
                  <h3 className="mt-3 text-sm font-semibold text-white">{t as string}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">{b as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ready to let clients book themselves?
          </h2>
          <p className="mt-4 text-slate-600">Start your free 14-day trial — no card required.</p>
          <Link href="/signup" className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
