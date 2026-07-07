import Link from 'next/link'
import { Megaphone, Sparkles, TrendingUp, Star } from 'lucide-react'
import type { RailPromotion } from '@/app/actions/promotions'
import { ListingRequestButton } from '@/components/listing-request-modal'

type Ad = {
  tone: 'violet' | 'amber' | 'white'
  icon: React.ReactNode
  eyebrow: string
  title: string
  body: string
  cta: string
  href: string
}

function adsFor(district: string): Ad[] {
  return [
    {
      tone: 'violet',
      icon: <TrendingUp className="h-5 w-5" />,
      eyebrow: 'Get seen first',
      title: `Feature your business in ${district}`,
      body: 'Appear at the top when locals search your district.',
      cta: 'Boost my listing',
      href: '/signup',
    },
    {
      tone: 'white',
      icon: <Star className="h-5 w-5" />,
      eyebrow: 'New here',
      title: 'List your business free',
      body: 'Start taking online bookings in minutes — 14 days free.',
      cta: 'Get started',
      href: '/signup',
    },
    {
      tone: 'amber',
      icon: <Megaphone className="h-5 w-5" />,
      eyebrow: 'Advertise',
      title: 'Your ad here',
      body: 'Promote your offer to people booking nearby.',
      cta: 'Advertise with us',
      href: 'mailto:sasoandco.ltd@gmail.com',
    },
    {
      tone: 'violet',
      icon: <Sparkles className="h-5 w-5" />,
      eyebrow: 'Featured',
      title: 'Stand out from the crowd',
      body: 'Sponsored spots get up to 3× more profile views.',
      cta: 'Learn more',
      href: '/signup',
    },
  ]
}

function AdCard({ ad }: { ad: Ad }) {
  const base = 'block rounded-3xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'
  const tone =
    ad.tone === 'violet'
      ? 'bg-violet-600 text-white hover:shadow-violet-600/20'
      : ad.tone === 'amber'
      ? 'bg-amber-50 text-slate-900 ring-1 ring-amber-200'
      : 'glass-card text-slate-900'
  const chip =
    ad.tone === 'violet' ? 'bg-white/15 text-white' : 'bg-violet-100 text-violet-700'
  const iconWrap =
    ad.tone === 'violet' ? 'bg-white/15 text-white' : ad.tone === 'amber' ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'
  const ctaCls =
    ad.tone === 'violet'
      ? 'bg-white text-violet-700'
      : 'bg-violet-600 text-white'

  return (
    <ListingRequestButton source={`Ad · ${ad.title}`} className={`${base} ${tone} w-full text-left`}>
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconWrap}`}>{ad.icon}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chip}`}>Sponsored</span>
      </div>
      <p className={`mt-4 text-[11px] font-semibold uppercase tracking-wide ${ad.tone === 'violet' ? 'text-white/70' : 'text-violet-500'}`}>{ad.eyebrow}</p>
      <h3 className="mt-1 font-display text-base font-bold leading-snug">{ad.title}</h3>
      <p className={`mt-1.5 text-xs leading-relaxed ${ad.tone === 'violet' ? 'text-white/80' : 'text-slate-500'}`}>{ad.body}</p>
      <span className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${ctaCls}`}>{ad.cta}</span>
    </ListingRequestButton>
  )
}

/** A real owner-posted promotion; links to that business's profile page. */
function PromoCard({ promo }: { promo: RailPromotion }) {
  return (
    <Link
      href={`/b/${promo.businessId}`}
      className="block overflow-hidden rounded-3xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Megaphone className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Sponsored</span>
      </div>
      {promo.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={promo.imageUrl} alt={promo.title} className="mt-4 h-24 w-full rounded-xl object-cover" />
      )}
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-amber-600">{promo.businessName}</p>
      <h3 className="mt-1 font-display text-base font-bold leading-snug text-slate-900">{promo.title}</h3>
      {promo.description && (
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-600">{promo.description}</p>
      )}
      <span className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-violet-600 px-3 py-2 text-xs font-semibold text-white">
        View &amp; book
      </span>
    </Link>
  )
}

/** Real sponsored advertiser: AR Land Documents & Services. */
function ArLandAd({ href }: { href: string }) {
  const services = [
    'Transfer of Land', 'First Registration', 'Land Certificate',
    'Power of Attorney', 'Deed of Mortgage', 'Lost Title',
    'Birth & Marriage Certificates', 'Police Report',
  ]
  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-3xl bg-[#efe7e3] p-5 shadow-sm ring-1 ring-[#e2d6d0] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9b7d72]">Sponsored</span>
      </div>
      <div className="mt-3 text-center">
        <p className="font-serif text-4xl italic leading-none text-[#2b2622]">AR</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6b5b52]">Alexis Roberts</p>
      </div>
      <h3 className="mt-3 text-center font-display text-sm font-bold text-[#2b2622]">Land Documents &amp; Services</h3>
      <ul className="mt-3 space-y-1 text-center text-[11px] leading-relaxed text-[#5e5048]">
        {services.map((s) => <li key={s}>{s}</li>)}
        <li className="italic text-[#8a7a70]">…and more</li>
      </ul>
      <div className="mt-3 border-t border-[#e2d6d0] pt-3 text-center text-[10px] text-[#6b5b52]">
        <p className="font-semibold text-[#2b2622]">For more info contact:</p>
        <p>+501 6220684</p>
        <p className="break-all">alexisrobertsbelize@gmail.com</p>
        <p>www.alexisroberts.bz</p>
      </div>
    </Link>
  )
}

export function SponsoredRail({
  district,
  side,
  arLandBusinessId,
  promos = [],
}: {
  district: string
  side: 'left' | 'right'
  /** AR Land's business id, so their sponsored card links to their profile page. */
  arLandBusinessId?: string
  /** Active owner-posted promotions to feature (split across the two rails). */
  promos?: RailPromotion[]
}) {
  const ads = adsFor(district)
  const arLandHref = arLandBusinessId ? `/b/${arLandBusinessId}` : '/book'
  // Give the left rail the first promo, the right rail the next two; fall back to lead-gen ads.
  const railPromos = side === 'left' ? promos.slice(0, 1) : promos.slice(1, 3)

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-4">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Sponsored</p>
        {side === 'left' ? (
          <>
            <ArLandAd href={arLandHref} />
            {railPromos[0] ? <PromoCard promo={railPromos[0]} /> : <AdCard ad={ads[0]} />}
          </>
        ) : (
          <>
            {railPromos[0] ? <PromoCard promo={railPromos[0]} /> : <AdCard ad={ads[2]} />}
            {railPromos[1] ? <PromoCard promo={railPromos[1]} /> : <AdCard ad={ads[3]} />}
          </>
        )}
      </div>
    </aside>
  )
}
