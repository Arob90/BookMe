import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

export function MarketingLogo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-sm">
        <CalendarDays className="h-5 w-5 text-white" />
      </span>
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        BookMe
      </span>
    </Link>
  )
}

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <MarketingLogo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <Link href="/features" className="transition-colors hover:text-violet-700">Features</Link>
          <Link href="/pricing" className="transition-colors hover:text-violet-700">Pricing</Link>
          <Link href="/districts" className="transition-colors hover:text-violet-700">Districts</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-slate-50/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-5 py-12 text-center sm:px-8">
        <MarketingLogo />
        <p className="text-xs text-slate-400">© 2026 BookMe · Belize. All rights reserved.</p>
        <p className="text-sm text-slate-500">
          Powered by <span className="font-semibold text-violet-600">SaSo Pixel Studio</span>
        </p>
      </div>
    </footer>
  )
}
