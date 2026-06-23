import Link from 'next/link'
import {
  CalendarDays, Users, CreditCard, Gift, Package, BarChart3,
  Star, ArrowRight, Check, ShieldCheck, Zap, Globe, Clock,
} from 'lucide-react'

export const metadata = {
  title: 'BookMe — The simplest way to run your bookings',
  description:
    'Scheduling, client CRM, payments, loyalty and analytics for service businesses — all in one beautiful app.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <SiteNav />
      <Hero />
      <TrustStrip />
      <AboutSection />
      <WhyCards />
      <StatsBand />
      <FeatureGrid />
      <Testimonials />
      <Faq />
      <FinalCta />
      <SiteFooter />
    </div>
  )
}

/* ───────────────────────── shared ───────────────────────── */

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-sm">
        <CalendarDays className="h-5 w-5 text-white" />
      </span>
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        BookMe
      </span>
    </Link>
  )
}

function BtnPrimary({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/30 ${className}`}
    >
      {children}
    </Link>
  )
}

/* ───────────────────────── nav ───────────────────────── */

function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="transition-colors hover:text-violet-700">Features</a>
          <Link href="/pricing" className="transition-colors hover:text-violet-700">Pricing</Link>
          <a href="#faq" className="transition-colors hover:text-violet-700">FAQ</a>
          <Link href="/book" className="transition-colors hover:text-violet-700">Book now</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
            Sign in
          </Link>
          <BtnPrimary href="/signup" className="px-5 py-2">Get started</BtnPrimary>
        </div>
      </div>
    </header>
  )
}

/* ───────────────────────── hero ───────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl animate-blob-drift" />
        <div className="absolute right-0 top-10 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl animate-blob-drift" style={{ animationDelay: '5s' }} />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:pt-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
            Scheduling &amp; client CRM
          </span>
          <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            The simplest way to run your{' '}
            <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">bookings</span>.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
            Appointments, clients, payments, loyalty and reports — beautifully
            organised in one app, so your day runs itself.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <BtnPrimary href="/signup" className="px-7 py-3.5 text-base">
              Start free — 14 days <ArrowRight className="h-4 w-4" />
            </BtnPrimary>
            <Link href="/book" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition-colors hover:border-violet-200 hover:bg-violet-50">
              Book a demo
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-500"><span className="font-semibold text-slate-800">Loved</span> by service businesses</p>
          </div>
        </div>

        <div className="animate-fade-up delay-150">
          <HeroMockup />
        </div>
      </div>
    </section>
  )
}

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* phone */}
      <div className="relative mx-auto w-[270px] rounded-[2.4rem] border-[10px] border-slate-900 bg-white shadow-2xl shadow-violet-900/20 animate-float-slow">
        <div className="rounded-[1.6rem] bg-gradient-to-b from-violet-50 to-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">Today</p>
              <p className="font-display text-sm font-semibold text-slate-900">Mon, 22 June</p>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              ['10:00', 'Liam Garcia', 'Massage · 60m', 'bg-violet-500'],
              ['11:30', 'Nadia Patel', 'Manicure', 'bg-fuchsia-500'],
              ['14:00', 'Diego M.', 'Consultation', 'bg-amber-400'],
            ].map(([t, n, s, c]) => (
              <div key={t as string} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2 shadow-sm">
                <span className="w-9 text-[11px] font-semibold tabular-nums text-slate-500">{t}</span>
                <span className={`h-7 w-1 rounded-full ${c}`} />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-slate-800">{n}</p>
                  <p className="truncate text-[10px] text-slate-400">{s}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-2.5 text-white">
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">Today’s income</span>
            <span className="font-display text-sm font-bold">$90.00</span>
          </div>
        </div>
      </div>

      {/* floating cards */}
      <div className="absolute -left-4 top-10 hidden rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-xl sm:block animate-float-slow" style={{ animationDelay: '1.2s' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-4 w-4" /></span>
          <div>
            <p className="text-[11px] font-semibold text-slate-800">Booking confirmed</p>
            <p className="text-[10px] text-slate-400">Nadia · 11:30</p>
          </div>
        </div>
      </div>
      <div className="absolute -right-2 bottom-8 hidden rounded-2xl border border-slate-100 bg-white px-3.5 py-3 shadow-xl sm:block animate-float-slow" style={{ animationDelay: '2.4s' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Gift className="h-4 w-4" /></span>
          <div>
            <p className="text-[11px] font-semibold text-slate-800">+25 loyalty pts</p>
            <p className="text-[10px] text-slate-400">Liam Garcia</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── trust strip ───────────────────────── */

function TrustStrip() {
  const kinds = ['Salons', 'Spas', 'Barbers', 'Clinics', 'Studios', 'Freelancers']
  return (
    <section className="border-y border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Built for every kind of service business
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {kinds.map((k) => (
            <span key={k} className="font-display text-lg font-semibold text-slate-300">{k}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── about ───────────────────────── */

function AboutSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <div className="relative rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-8 shadow-xl">
            <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
              <div className="grid grid-cols-2 gap-3">
                {[['98%', 'On-time'], ['1-click', 'Rebook'], ['24/7', 'Online booking'], ['0', 'Double-bookings']].map(([a, b]) => (
                  <div key={b} className="rounded-xl bg-white/90 p-4">
                    <p className="font-display text-2xl font-bold text-violet-700">{a}</p>
                    <p className="text-xs text-slate-500">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">About BookMe</p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            Everything your business needs, in one place.
          </h2>
          <p className="mt-4 text-slate-600">
            Stop juggling notebooks, spreadsheets and chat apps. BookMe pulls
            your whole operation together so nothing slips through the cracks.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              [<ShieldCheck key="s" className="h-5 w-5" />, 'Secure & multi-tenant', 'Each business is fully isolated and protected.'],
              [<Globe key="g" className="h-5 w-5" />, 'Works everywhere', 'Desktop, tablet and phone — no installs.'],
            ].map(([icon, t, b]) => (
              <div key={t as string} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">{icon}</span>
                <h3 className="mt-3 font-semibold text-slate-900">{t as string}</h3>
                <p className="mt-1 text-sm text-slate-500">{b as string}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── why cards ───────────────────────── */

function WhyCards() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Why BookMe</p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Why service businesses trust us
        </h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-amber-50 p-7 shadow-sm">
          <Clock className="h-7 w-7 text-amber-500" />
          <h3 className="mt-4 font-display text-xl font-bold text-slate-900">Hours back every week</h3>
          <p className="mt-2 text-sm text-slate-600">Automate the admin — reminders, rebooking and records keep themselves.</p>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-7 text-white shadow-lg">
          <p className="font-display text-4xl font-bold">275+</p>
          <h3 className="mt-2 font-display text-xl font-bold">Features that matter</h3>
          <p className="mt-2 text-sm text-white/80">From loyalty to inventory — built around how you actually work.</p>
        </div>
        <div className="rounded-3xl bg-fuchsia-50 p-7 shadow-sm">
          <Zap className="h-7 w-7 text-fuchsia-500" />
          <h3 className="mt-4 font-display text-xl font-bold text-slate-900">Set up in minutes</h3>
          <p className="mt-2 text-sm text-slate-600">No training day. Add services, share your link, take bookings today.</p>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── stats band ───────────────────────── */

function StatsBand() {
  const stats = [['10k+', 'Appointments booked'], ['99.9%', 'Uptime'], ['14 days', 'Free to try'], ['1 app', 'For your whole business']]
  return (
    <section className="px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-600 px-6 py-12 sm:px-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map(([a, b]) => (
            <div key={b} className="text-center">
              <p className="font-display text-3xl font-bold text-white sm:text-4xl">{a}</p>
              <p className="mt-1 text-sm text-white/75">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── feature grid ───────────────────────── */

function FeatureGrid() {
  const items = [
    [<CalendarDays key="1" />, 'Smart scheduling', 'Day, week & month views, drag-and-drop and public booking links.'],
    [<Users key="2" />, 'Client CRM', 'Profiles, history, birthdays and notes — every client remembered.'],
    [<CreditCard key="3" />, 'Payments & banking', 'Record payments, refunds and balances against each booking.'],
    [<Gift key="4" />, 'Loyalty & strikes', 'Reward regulars and manage no-shows with your own policies.'],
    [<Package key="5" />, 'Inventory', 'Track stock, low-level alerts and cost in the background.'],
    [<BarChart3 key="6" />, 'Analytics', 'Revenue, client health and trends that read like a story.'],
  ]
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Key features</p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Convenience at your fingertips
        </h2>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([icon, t, b]) => (
          <div key={t as string} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-600/10">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 transition-colors group-hover:from-violet-600 group-hover:to-fuchsia-500 group-hover:text-white">
              {icon}
            </span>
            <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{t as string}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{b as string}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────────── testimonials ───────────────────────── */

function Testimonials() {
  const quotes = [
    ['“My whole salon runs on BookMe now. The no-show strikes alone paid for it.”', 'Maya R.', 'Salon owner'],
    ['“Clients book themselves online and I just show up to a full day. Brilliant.”', 'Carlos B.', 'Barber'],
    ['“Reports finally make sense. I can see exactly what’s working each month.”', 'Aisha N.', 'Spa manager'],
  ]
  return (
    <section className="bg-slate-50/70 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Loved by owners</p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What our users say</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {quotes.map(([q, n, r]) => (
            <div key={n} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-700">{q}</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">{(n as string)[0]}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{n}</p>
                  <p className="text-xs text-slate-400">{r}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── faq ───────────────────────── */

function Faq() {
  const faqs = [
    ['Is there really a free trial?', 'Yes — every new account gets 14 days free, no card required. After that you simply pick a plan.'],
    ['Can my clients book online?', 'Absolutely. You get a public booking link your clients can use anytime, on any device.'],
    ['Do I need to install anything?', 'No. BookMe runs in the browser on desktop, tablet and phone.'],
    ['Can I add my team?', 'Yes — add staff logins on the Pro and higher plans, each with their own access.'],
  ]
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">FAQ</p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Frequently asked questions</h2>
      </div>
      <div className="mt-10 space-y-3">
        {faqs.map(([q, a]) => (
          <details key={q} className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between font-display font-semibold text-slate-900">
              {q}
              <span className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────────── final cta ───────────────────────── */

function FinalCta() {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-600 px-8 py-16 text-center sm:px-12 lg:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 left-10 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-2xl" />
        </div>
        <h2 className="relative mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
          Join the service businesses growing with BookMe.
        </h2>
        <p className="relative mx-auto mt-5 max-w-md text-white/80">Set up in minutes. Your first 14 days are on us.</p>
        <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className="inline-flex items-center justify-center rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── footer ───────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
        <Logo />
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <a href="#features" className="hover:text-violet-700">Features</a>
          <Link href="/pricing" className="hover:text-violet-700">Pricing</Link>
          <Link href="/login" className="hover:text-violet-700">Sign in</Link>
          <Link href="/book" className="hover:text-violet-700">Book now</Link>
        </div>
        <p className="text-xs text-slate-400">© 2026 BookMe · Belize</p>
      </div>
    </footer>
  )
}
