import Link from 'next/link'
import { MapPin, ArrowRight, Search, CalendarCheck, Sparkles } from 'lucide-react'
import { MarketingNav, MarketingFooter } from '@/components/marketing-chrome'
import { ListingRequestButton } from '@/components/listing-request-modal'
import { DISTRICTS } from '@/lib/districts'

export const metadata = {
  title: 'Districts · BookMe',
  description: 'Find and book service businesses by district across Belize.',
}

export default function DistrictsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-violet-600">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
            <MapPin className="h-3.5 w-3.5" /> All of Belize
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Find a business by district
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-white/80">
            Pick your district to browse and book the salons, spas, barbers, clinics
            and studios near you.
          </p>
        </div>
      </section>

      {/* District cards */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {DISTRICTS.map((d) => (
            <Link
              key={d.slug}
              href={`/district/${d.slug}`}
              className="glass-card group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-600/10"
            >
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-100 opacity-70 transition-transform duration-300 group-hover:scale-150" />
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
                <MapPin className="h-5 w-5" />
              </span>
              <h2 className="relative mt-4 font-display text-lg font-bold text-slate-900">{d.label}</h2>
              <p className="relative mt-0.5 text-xs text-slate-400">{d.blurb}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600">
                Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Easy as that</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Book in three taps</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [<MapPin key="a" className="h-6 w-6" />, 'Pick your district', 'Choose where you are from the list above.'],
              [<Search key="b" className="h-6 w-6" />, 'Find a business', 'Search by name or browse who’s open now.'],
              [<CalendarCheck key="c" className="h-6 w-6" />, 'Book your spot', 'Choose a service and time — done.'],
            ].map(([icon, t, b]) => (
              <div key={t as string} className="glass-card rounded-3xl p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">{icon}</span>
                <h3 className="mt-4 font-display text-lg font-bold text-slate-900">{t as string}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owner CTA */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-violet-600 px-6 py-12 text-center sm:px-12">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
          <Sparkles className="relative mx-auto h-7 w-7 text-white/80" />
          <h2 className="relative mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Run a service business?</h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/80">
            Get listed in your district and start taking online bookings — free for 14 days.
          </p>
          <ListingRequestButton
            source="List your business · Districts"
            className="relative mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            List your business <ArrowRight className="h-4 w-4" />
          </ListingRequestButton>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
