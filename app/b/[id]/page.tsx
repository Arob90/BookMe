import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarCheck, Clock3, MapPin, Phone, Tag, Megaphone, CalendarDays, Lock } from 'lucide-react'
import { MarketingNav, MarketingFooter } from '@/components/marketing-chrome'
import { getPublicBusinesses, getBusinessServices } from '@/app/actions/public-booking'
import { getPublicPromotions } from '@/app/actions/promotions'
import { formatDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type PublicBusiness = {
  id: string
  name: string
  phone: string | null
  address: string | null
  district: string | null
  businessCategory?: string | null
  profilePhoto: string | null
  isOpenNow?: boolean | null
  todayHours?: string | null
}

function titleCaseDistrict(d?: string | null) {
  if (!d) return null
  return d
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || 'B') + (parts[1]?.[0] || '')).toUpperCase()
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  let biz: PublicBusiness | undefined
  try {
    biz = ((await getPublicBusinesses()) as PublicBusiness[]).find((b) => b.id === params.id)
  } catch {
    biz = undefined
  }
  return {
    title: biz ? `${biz.name} · BookMe` : 'Business · BookMe',
    description: biz
      ? `View services and promotions from ${biz.name}${biz.district ? ` in ${titleCaseDistrict(biz.district)}` : ''}, and book online.`
      : undefined,
  }
}

export default async function BusinessProfilePage({ params }: { params: { id: string } }) {
  let business: PublicBusiness | undefined
  try {
    business = ((await getPublicBusinesses()) as PublicBusiness[]).find((b) => b.id === params.id)
  } catch {
    business = undefined
  }
  if (!business) notFound()

  const [services, promotions] = await Promise.all([
    getBusinessServices(business.id).catch(() => [] as Awaited<ReturnType<typeof getBusinessServices>>),
    getPublicPromotions(business.id).catch(() => []),
  ])

  // Group services by category (preserve the order returned by the action).
  const categories: Array<{ name: string; services: typeof services }> = []
  for (const s of services) {
    const key = s.category?.name?.trim() || 'Services'
    let group = categories.find((c) => c.name === key)
    if (!group) {
      group = { name: key, services: [] }
      categories.push(group)
    }
    group.services.push(s)
  }

  const districtLabel = titleCaseDistrict(business.district)
  const bookHref = `/book?business=${business.id}`

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <MarketingNav />

      {/* Profile header */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-violet-600">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:py-16">
          {districtLabel && (
            <Link
              href={`/district/${business.district?.toLowerCase().replace(/_/g, '-')}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to {districtLabel}
            </Link>
          )}
          <div className="mt-6 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {business.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.profilePhoto}
                alt={business.name}
                className="h-24 w-24 shrink-0 rounded-3xl object-cover ring-4 ring-white/30"
              />
            ) : (
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white/15 text-3xl font-bold text-white ring-4 ring-white/20">
                {initials(business.name)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {business.businessCategory && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <Tag className="h-3 w-3" /> {business.businessCategory}
                  </span>
                )}
                {business.isOpenNow != null && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                      business.isOpenNow ? 'bg-emerald-400/20 text-emerald-50' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${business.isOpenNow ? 'bg-emerald-300' : 'bg-white/50'}`} />
                    {business.isOpenNow ? 'Open now' : 'Closed'}
                  </span>
                )}
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {business.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/80">
                {business.todayHours && (
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {business.todayHours}</span>
                )}
                {business.phone && (
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" /> {business.phone}</span>
                )}
                {(business.address || districtLabel) && (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {business.address || districtLabel}</span>
                )}
              </div>
            </div>
            <Link
              href={bookHref}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <CalendarCheck className="h-4 w-4" /> Book now
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        {/* Promotions feed */}
        {promotions.length > 0 && (
          <section className="mb-12">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Megaphone className="h-4 w-4" />
              </span>
              <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">Promotions & announcements</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {promotions.map((p) => (
                <article key={p.id} className="overflow-hidden rounded-3xl border border-amber-100 bg-amber-50/40 shadow-sm">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.title} className="h-40 w-full object-cover" />
                  )}
                  <div className="p-5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      <Megaphone className="h-3 w-3" /> Promo
                    </span>
                    <h3 className="mt-2 font-display text-lg font-bold text-slate-900">{p.title}</h3>
                    {p.description && (
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{p.description}</p>
                    )}
                    {p.endsAt && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Ends {new Date(p.endsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Services listing */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">Services</h2>
            <Link href={bookHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700">
              Book a service <CalendarCheck className="h-4 w-4" />
            </Link>
          </div>
          <p className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            Sign in or continue as a returning customer to see prices.
          </p>

          {services.length === 0 ? (
            <div className="rounded-3xl border border-slate-100 bg-slate-50/60 p-8 text-center">
              <p className="font-display text-base font-semibold text-slate-900">No services listed yet</p>
              <p className="mt-1 text-sm text-slate-500">Check back soon, or contact the business directly.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {categories.map((cat) => (
                <div key={cat.name}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-violet-600">{cat.name}</h3>
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                    {cat.services.map((s) => (
                      <div key={s.id} className="flex items-start justify-between gap-4 p-4 sm:p-5">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          {s.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{s.description}</p>
                          )}
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDuration(s.durationMinutes, (s.durationUnit as any) || 'MINUTES')}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Link
                            href={bookHref}
                            className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                          >
                            <Lock className="h-3 w-3" /> See price
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <div className="mt-12 rounded-[2rem] bg-violet-600 px-6 py-10 text-center">
          <h2 className="font-display text-2xl font-bold text-white">Ready to book with {business.name}?</h2>
          <p className="mx-auto mt-2 max-w-md text-white/80">
            Continue as a returning customer or create a quick account — it only takes a minute.
          </p>
          <Link
            href={bookHref}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-violet-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <CalendarCheck className="h-4 w-4" /> Book now
          </Link>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
