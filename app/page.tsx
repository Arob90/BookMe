import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarDays,
  Users,
  CreditCard,
  Gift,
  Package,
  BarChart3,
  Check,
} from 'lucide-react'

export const metadata = {
  title: 'BookMe — Calm scheduling for service businesses',
  description:
    'A quiet, capable platform for bookings, clients, payments and loyalty. Made for service businesses.',
}

/* Warm, minimal "nude" palette — kept local to the marketing site so the app
   keeps its own theme. Tones: linen background, espresso ink, clay accent. */
const INK = 'text-[#2A2622]'
const SUB = 'text-[#736B61]'

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`font-serif text-[1.35rem] tracking-tight ${INK} ${className}`}>
      Book<span className="italic">Me</span>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F3F0EA] text-[#2A2622] antialiased selection:bg-[#2A2622] selection:text-[#F3F0EA]">
      {/* ───────────────────────── Nav ───────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[#E4DDD2]/80 bg-[#F3F0EA]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-sm text-[#5C544B] md:flex">
            <a href="#features" className="transition-colors hover:text-[#2A2622]">Features</a>
            <Link href="/pricing" className="transition-colors hover:text-[#2A2622]">Pricing</Link>
            <a href="#story" className="transition-colors hover:text-[#2A2622]">Why BookMe</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm text-[#5C544B] transition-colors hover:text-[#2A2622]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-[#2A2622] px-4 py-2 text-sm font-medium text-[#F3F0EA] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#3b342d] hover:shadow-md"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden">
        {/* soft nude wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60rem 40rem at 78% -10%, rgba(176,150,128,0.20), transparent 60%), radial-gradient(50rem 40rem at -10% 20%, rgba(150,140,126,0.14), transparent 55%)',
          }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-24">
          {/* Copy */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D9D1C4] bg-white/50 px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#9A7B5E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B0937A]" />
              Scheduling &amp; client care
            </span>
            <h1 className={`mt-6 font-serif text-[2.7rem] font-normal leading-[1.05] tracking-[-0.02em] sm:text-6xl ${INK}`}>
              Run your bookings with
              <span className="italic"> quiet confidence.</span>
            </h1>
            <p className={`mt-6 max-w-md text-base leading-relaxed sm:text-lg ${SUB}`}>
              BookMe brings appointments, clients, payments and loyalty into one
              calm, considered workspace — so the day runs itself and you can
              focus on the work.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#2A2622] px-6 py-3.5 text-sm font-medium text-[#F3F0EA] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#3b342d] hover:shadow-lg"
              >
                Start free — 14 days
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full border border-[#D5CCBE] bg-white/40 px-6 py-3.5 text-sm font-medium text-[#2A2622] transition-colors hover:bg-white/80"
              >
                View pricing
              </Link>
            </div>
            <p className="mt-5 text-xs text-[#8A8278]">
              No card required · Free for 14 days · Cancel anytime
            </p>
          </div>

          {/* Hero visual — a quiet product vignette */}
          <div className="animate-fade-up delay-150">
            <HeroPreview />
          </div>
        </div>

        {/* hairline stat strip */}
        <div className="border-y border-[#E4DDD2]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 sm:grid-cols-4 sm:px-8">
            {[
              ['One workspace', 'bookings → payment'],
              ['14-day', 'free trial'],
              ['Built for', 'service businesses'],
              ['Minutes', 'to get set up'],
            ].map(([a, b]) => (
              <div key={a} className="py-6 pr-6">
                <div className={`font-serif text-xl ${INK}`}>{a}</div>
                <div className="mt-1 text-sm text-[#8A8278]">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Features ───────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9A7B5E]">Everything, in its place</p>
          <h2 className={`mt-4 font-serif text-3xl leading-tight tracking-[-0.01em] sm:text-[2.6rem] ${INK}`}>
            A complete back office, without the clutter.
          </h2>
        </div>

        <div className="mt-12 grid auto-rows-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            className="lg:col-span-2"
            wide
            icon={<CalendarDays className="h-5 w-5" />}
            title="Scheduling that thinks ahead"
            body="Day, week and month views with drag-and-drop, public booking links, business hours and holiday handling — your calendar, exactly as you keep it."
          />
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Client CRM"
            body="Rich profiles, history, birthdays and notes — every client remembered."
          />
          <FeatureCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Payments & banking"
            body="Record payments, refunds and balances against every appointment."
          />
          <FeatureCard
            icon={<Gift className="h-5 w-5" />}
            title="Loyalty & strikes"
            body="Reward regulars and manage no-shows with configurable policies."
          />
          <FeatureCard
            icon={<Package className="h-5 w-5" />}
            title="Inventory"
            body="Track stock, low-level alerts and cost — quietly in the background."
          />
          <FeatureCard
            className="lg:col-span-2"
            wide
            icon={<BarChart3 className="h-5 w-5" />}
            title="Analytics that read like a story"
            body="Revenue, client health and trends, laid out so the numbers make sense at a glance — not a spreadsheet in disguise."
          />
        </div>
      </section>

      {/* ───────────────────────── Story / quote ───────────────────────── */}
      <section id="story" className="border-y border-[#E4DDD2] bg-[#EDE8DF]">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 lg:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9A7B5E]">Why BookMe</p>
          <blockquote className={`mt-6 font-serif text-[1.7rem] font-normal leading-[1.35] tracking-[-0.01em] sm:text-[2.3rem] ${INK}`}>
            “Software for a service business shouldn’t shout. It should be calm,
            quick and out of the way — so the craft stays the centre of
            attention.”
          </blockquote>
          <p className="mt-8 text-sm text-[#8A8278]">The idea behind BookMe</p>
        </div>
      </section>

      {/* ───────────────────────── Pricing teaser ───────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[2rem] border border-[#E4DDD2] bg-white/60 p-8 sm:p-12 lg:flex-row lg:items-center">
          <div className="max-w-lg">
            <h2 className={`font-serif text-3xl leading-tight tracking-[-0.01em] sm:text-4xl ${INK}`}>
              Simple, transparent pricing.
            </h2>
            <p className={`mt-4 ${SUB}`}>
              Start free for 14 days, then choose the plan that fits. No
              surprises, no lock-in.
            </p>
            <ul className="mt-6 space-y-2.5">
              {['Every feature on every plan', 'Add team logins as you grow', 'Cancel or change anytime'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-[#4F473E]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7E0D4]">
                    <Check className="h-3 w-3 text-[#6B5B49]" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/pricing"
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[#2A2622] px-7 py-4 text-sm font-medium text-[#F3F0EA] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#3b342d] hover:shadow-lg"
          >
            See the plans
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.25rem] bg-[#2A2622] px-8 py-16 text-center sm:px-12 lg:py-24">
          <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-[1.1] tracking-[-0.01em] text-[#F3EEE6] sm:text-5xl">
            Give your business a calmer day.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[#C8BFB2]">
            Set up in minutes. Your first two weeks are on us.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#F3F0EA] px-7 py-3.5 text-sm font-medium text-[#2A2622] transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              Start free
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-[#F3F0EA] transition-colors hover:bg-white/10"
            >
              Book an appointment
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="border-t border-[#E4DDD2]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row sm:px-8">
          <Wordmark />
          <div className="flex items-center gap-6 text-sm text-[#8A8278]">
            <a href="#features" className="hover:text-[#2A2622]">Features</a>
            <Link href="/pricing" className="hover:text-[#2A2622]">Pricing</Link>
            <Link href="/login" className="hover:text-[#2A2622]">Sign in</Link>
          </div>
          <p className="text-xs text-[#A39B90]">© 2026 BookMe · Belize</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  body,
  className = '',
  wide = false,
}: {
  icon: React.ReactNode
  title: string
  body: string
  className?: string
  wide?: boolean
}) {
  return (
    <div
      className={`group flex flex-col rounded-[1.4rem] border border-[#E7E1D6] bg-white/55 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#D8CFBF] hover:bg-white/90 hover:shadow-[0_18px_40px_-24px_rgba(60,52,45,0.4)] ${wide ? 'sm:p-7' : ''} ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAE3D7] text-[#6B5B49] transition-colors group-hover:bg-[#2A2622] group-hover:text-[#F3F0EA]">
        {icon}
      </div>
      <h3 className={`mt-5 font-serif text-xl tracking-[-0.01em] ${INK}`}>{title}</h3>
      <p className={`mt-2 text-sm leading-relaxed ${SUB}`}>{body}</p>
    </div>
  )
}

/* A quiet vignette of the product — composed, not a screenshot. */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-[#E7DFD2] to-transparent blur-2xl" />
      <div className="rounded-[1.8rem] border border-[#E7E1D6] bg-white/80 p-5 shadow-[0_30px_60px_-30px_rgba(60,52,45,0.45)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#A39B90]">Today</p>
            <p className="font-serif text-lg text-[#2A2622]">Monday, 22 June</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAE3D7] text-[#6B5B49]">
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            { t: '10:00', name: 'Liam Garcia', svc: 'Massage · 60 min', tone: '#CDB79F' },
            { t: '11:30', name: 'Nadia Patel', svc: 'Classic Manicure', tone: '#C2C7BD' },
            { t: '14:00', name: 'Diego Martínez', svc: 'Consultation', tone: '#D8C6BE' },
          ].map((r) => (
            <div key={r.t} className="flex items-center gap-3 rounded-2xl border border-[#EDE7DC] bg-[#FBFAF7] px-3.5 py-3">
              <span className="w-12 text-sm font-medium tabular-nums text-[#6B645B]">{r.t}</span>
              <span className="h-8 w-1 rounded-full" style={{ background: r.tone }} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#2A2622]">{r.name}</p>
                <p className="truncate text-xs text-[#8A8278]">{r.svc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#2A2622] px-4 py-3 text-[#F3EEE6]">
          <span className="text-xs uppercase tracking-[0.14em] text-[#C8BFB2]">Today’s income</span>
          <span className="font-serif text-lg">$90.00</span>
        </div>
      </div>
    </div>
  )
}
