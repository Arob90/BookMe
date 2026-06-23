import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin } from 'lucide-react'
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
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-violet-600 to-fuchsia-600">
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
        </div>
      </section>

      {/* Directory */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
        <DistrictDirectory businesses={businesses} />
      </section>

      <MarketingFooter />
    </div>
  )
}
