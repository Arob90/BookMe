import Link from 'next/link'
import { Megaphone, Sparkles, TrendingUp, Star } from 'lucide-react'

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
    <Link href={ad.href} className={`${base} ${tone}`}>
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconWrap}`}>{ad.icon}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chip}`}>Sponsored</span>
      </div>
      <p className={`mt-4 text-[11px] font-semibold uppercase tracking-wide ${ad.tone === 'violet' ? 'text-white/70' : 'text-violet-500'}`}>{ad.eyebrow}</p>
      <h3 className="mt-1 font-display text-base font-bold leading-snug">{ad.title}</h3>
      <p className={`mt-1.5 text-xs leading-relaxed ${ad.tone === 'violet' ? 'text-white/80' : 'text-slate-500'}`}>{ad.body}</p>
      <span className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-3 py-2 text-xs font-semibold ${ctaCls}`}>{ad.cta}</span>
    </Link>
  )
}

export function SponsoredRail({ district, side }: { district: string; side: 'left' | 'right' }) {
  const ads = adsFor(district)
  const picks = side === 'left' ? [ads[0], ads[1]] : [ads[2], ads[3]]
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-4">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">Sponsored</p>
        {picks.map((ad, i) => (
          <AdCard key={i} ad={ad} />
        ))}
      </div>
    </aside>
  )
}
