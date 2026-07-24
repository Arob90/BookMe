import Link from 'next/link'
import {
  CalendarDays, ArrowRight, Check, Globe, Briefcase, MessageCircleOff, BadgeCheck, Search,
} from 'lucide-react'
import { MarketingNav, MarketingFooter } from '@/components/marketing-chrome'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'

export const metadata = {
  title: 'BookMe — Get More Bookings. Grow Your Business.',
  description:
    'Create a free BookMe business profile where customers can discover your services and request appointments — all in one place. The marketplace for local services in Belize.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <MarketingNav />
      <Hero />
      <WhyBookMe />
      <HowItWorks />
      <FindService />
      <Categories />
      <Faq />
      <FinalCta />
      <MarketingFooter />
    </div>
  )
}

function BtnPrimary({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/30 ${className}`}
    >
      {children}
    </Link>
  )
}

/* ───────────────────────── hero (businesses first) ───────────────────────── */

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
            For local service businesses
          </span>
          <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            Get More Bookings.{' '}
            <span className="text-violet-600">Grow Your Business.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
            Create a free business profile where customers can discover your
            services and request appointments — all in one place.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <BtnPrimary href="/signup" className="px-7 py-3.5 text-base">
              Create Free Business Profile <ArrowRight className="h-4 w-4" />
            </BtnPrimary>
            <Link href="/book" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 transition-colors hover:border-violet-200 hover:bg-violet-50">
              Find a Business
            </Link>
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
          <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-600 px-3 py-2.5 text-white">
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-90">Today’s income</span>
            <span className="font-display text-sm font-bold">$90.00</span>
          </div>
        </div>
      </div>

      <div className="glass absolute -left-4 top-10 hidden rounded-2xl px-3.5 py-3 shadow-xl sm:block animate-float-slow" style={{ animationDelay: '1.2s' }}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-4 w-4" /></span>
          <div>
            <p className="text-[11px] font-semibold text-slate-800">Booking confirmed</p>
            <p className="text-[10px] text-slate-400">Nadia · 11:30</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────────────────── why bookme (section 2) ───────────────────────── */

function WhyBookMe() {
  const reasons = [
    [CalendarDays, 'Accept booking requests 24/7', 'Never miss a request — customers can book anytime, even after hours.'],
    [Globe, 'Get discovered by new customers', 'Your business shows up where local customers are already looking.'],
    [Briefcase, 'Showcase your services and pricing', 'A clean profile with your services, prices and photos, always up to date.'],
    [MessageCircleOff, 'Reduce back-and-forth messages', 'Skip the DMs — requests land straight on your calendar with the details you need.'],
    [BadgeCheck, 'Build trust with a professional online presence', 'A polished booking page makes your business look established from the first visit.'],
  ] as const

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Why BookMe?</p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Why businesses choose BookMe
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map(([Icon, title, body]) => (
          <div key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-display font-semibold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ───────────────────────── how it works (section 3) ───────────────────────── */

function HowItWorks() {
  const steps = [
    ['Create your free business profile.', 'Sign up in minutes — no card required.'],
    ['Add your services, photos, and business details.', 'Show customers exactly what you offer and what it costs.'],
    ['Customers discover your business.', 'Your profile appears where local customers are searching.'],
    ['Receive booking requests and grow your business.', 'New appointments land straight on your calendar.'],
  ] as const

  return (
    <section className="border-y border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">How it works</p>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Up and running in four steps
          </h2>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, body], i) => (
            <div key={title} className="relative text-center sm:text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 font-display text-base font-bold text-white sm:mx-0 mx-auto">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── find a service (section 4, customers) ───────────────────────── */

function FindService() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-24">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
        <Search className="h-6 w-6" />
      </span>
      <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Looking for a service?
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-slate-600">
        Whether you need a barber, nail technician, photographer, tutor,
        mechanic, tour guide, or another local professional, BookMe makes it
        easy to discover businesses and request appointments.
      </p>
      <div className="mt-7">
        <Link href="/book" className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl">
          Find a Business <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

/* ───────────────────────── categories (section 5) ───────────────────────── */

function Categories() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Categories</p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          A marketplace for local services
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          Discover and book local businesses across dozens of categories —
          from salons and spas to mechanics and tutors.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {BUSINESS_CATEGORIES.filter((c) => c !== 'Other').map((c) => (
            <Link
              key={c}
              href="/book"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── faq ───────────────────────── */

function Faq() {
  const faqs = [
    [
      'What exactly is BookMe?',
      'A marketplace for local services — service businesses in Belize get their own booking page and everything behind it (appointments, client records, payments, loyalty and reports), while customers can discover and book them in one place.',
    ],
    [
      'How do my clients actually book me?',
      'You get a personal booking page and link. Drop it on WhatsApp, Instagram or your website; clients pick a service and time, and it lands straight on your calendar — 24/7, with no back-and-forth messages.',
    ],
    [
      'Do I need a website or any software to install?',
      'No. BookMe is your online presence and booking system in one, and it runs in any browser on phone, tablet or desktop. Nothing to download or maintain.',
    ],
    [
      'How much does it cost, and is there a free trial?',
      'Start with 14 days free — no card required. After that, pick the plan that fits your team: Basic for solo owners, Pro for small teams, or Business for larger ones. You can change plans anytime.',
    ],
    [
      'Can I add my team?',
      'Yes. Pro includes up to 5 logins and Business up to 10, each with their own access so staff only see what they need — while everyone shares the same calendar and clients.',
    ],
    [
      'How do people find my business?',
      'Every business gets a free profile on BookMe\'s local marketplace, organized by district, so nearby customers can discover and book you. You can also feature your business or post promotions to stand out even more.',
    ],
    [
      'What if I have an idea or run into a problem?',
      'Tell us — right inside the app you can suggest ideas and report issues, then watch their progress. If we build your idea, we’ll thank you with free time added to your account.',
    ],
  ]
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-24">
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

/* ───────────────────────── final cta (section 6) ───────────────────────── */

function FinalCta() {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-violet-600 px-8 py-16 text-center sm:px-12 lg:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 left-10 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-2xl" />
        </div>
        <h2 className="relative mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
          Ready to get more bookings?
        </h2>
        <p className="relative mx-auto mt-5 max-w-md text-white/80">Join BookMe today and create your free business profile.</p>
        <div className="relative mt-9 flex items-center justify-center">
          <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
