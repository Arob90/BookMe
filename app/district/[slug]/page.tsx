import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, MapPin, Clock3, BadgeCheck, Sparkles } from 'lucide-react'
import { DISTRICTS, districtBySlug } from '@/lib/districts'
import { getPublicBusinesses } from '@/app/actions/public-booking'
import { DistrictDirectory, type DirectoryBusiness } from '@/components/district-directory'
import { MarketingNav, MarketingFooter } from '@/components/marketing-chrome'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return DISTRICTS.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const d = districtBySlug(params.slug)
  return {
    title: d ? `${d.label} businesses · BookMe` : 'District · BookMe',
    description: d ? `Discover and book service businesses in ${d.label}, Belize.` : undefined,
  }
}

export default async function DistrictPage({ params }: { params: { slug: string } }) {
  const district = districtBySlug(params.slug)
  if (!district) notFound()

  let businesses: DirectoryBusiness[] = []
  try {
    const all = await getPublicBusinesses()
    businesses = (all as any[])
      .filter((b) => (b.district || '').toUpperCase() === district.value)
      .map((b) => ({
        id: b.id,
        name: b.name,
        phone: b.phone ?? null,
        address: b.address ?? null,
        profilePhoto: b.profilePhoto ?? null,
        isOpenNow: b.isOpenNow ?? null,
        todayHours: b.todayHours ?? null,
      }))
  } catch {
    businesses = []
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <MarketingNav />

      {/* Hero band */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-violet-600">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
          <Link href="/#districts" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All districts
          </Link>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur">
              <MapPin className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/70">{district.blurb}</p>
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Service businesses in {district.label}
          </h1>
          <p className="mt-4 max-w-lg text-white/80">
            Browse and book salons, spas, barbers, clinics and more across {district.label}. Search by name to find exactly who you’re looking for.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} listed
            </span>
            {['Salons', 'Spas', 'Barbers', 'Clinics'].map((c) => (
              <span key={c} className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Directory */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-16">
        <DistrictDirectory businesses={businesses} />
      </section>

      {/* Why book here */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">Why book here</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Booking in {district.label}, made simple
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [<Clock3 key="a" className="h-6 w-6" />, 'Book anytime', 'Reserve your spot 24/7 — no phone calls, no waiting.'],
              [<BadgeCheck key="b" className="h-6 w-6" />, 'Real availability', 'See who’s open now and pick a time that actually works.'],
              [<Sparkles key="c" className="h-6 w-6" />, 'Earn rewards', 'Many businesses offer loyalty points every time you visit.'],
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
          <h2 className="relative font-display text-2xl font-bold text-white sm:text-3xl">
            Own a business in {district.label}?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-white/80">
            List it here and let clients across {district.label} find and book you — free for 14 days.
          </p>
          <Link href="/signup" className="relative mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
            List your business <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  )
}
