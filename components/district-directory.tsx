'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Phone, Clock, ArrowRight, Star, BadgeCheck } from 'lucide-react'

export type DirectoryBusiness = {
  id: string
  name: string
  phone: string | null
  address: string | null
  profilePhoto: string | null
  isOpenNow?: boolean | null
  todayHours?: string | null
}

type Filter = 'all' | 'open' | 'az'

export function DistrictDirectory({
  businesses,
  featured,
}: {
  businesses: DirectoryBusiness[]
  /** A paid "Featured" business, chosen by rotation server-side. Undefined = none sold. */
  featured?: DirectoryBusiness
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = q ? businesses.filter((b) => b.name.toLowerCase().includes(q)) : businesses.slice()
    if (filter === 'open') list = list.filter((b) => b.isOpenNow)
    if (filter === 'az') list = list.slice().sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [businesses, query, filter])

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open now' },
    { id: 'az', label: 'A–Z' },
  ]

  return (
    <div>
      {/* Search */}
      <div className="mx-auto mb-8 max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search businesses by name…"
            className="w-full rounded-full border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
          />
        </div>
        <p className="mt-3 text-center text-sm text-slate-500">
          {filtered.length} {filtered.length === 1 ? 'business' : 'businesses'}
          {query ? ' found' : ' listed'}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === c.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured / sponsored spotlight */}
      {!query && featured && (
        <div className="mb-8 overflow-hidden rounded-3xl bg-violet-600 p-1 shadow-lg shadow-violet-600/20">
          <div className="flex flex-col items-start gap-5 rounded-[1.4rem] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {featured.profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featured.profilePhoto} alt={featured.name} className="h-16 w-16 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-bold text-white">
                  {featured.name[0]?.toUpperCase()}
                </span>
              )}
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Featured
                </span>
                <h3 className="mt-1.5 font-display text-xl font-bold text-slate-900">{featured.name}</h3>
                <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
                  <BadgeCheck className="h-4 w-4 text-violet-600" /> Verified on BookMe
                  {featured.todayHours ? <span className="text-slate-300">·</span> : null}
                  {featured.todayHours}
                </p>
              </div>
            </div>
            <Link
              href={`/book?business=${featured.id}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Book now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <p className="font-display text-lg font-semibold text-slate-900">No businesses yet</p>
          <p className="mt-2 text-sm text-slate-500">
            {query
              ? 'No matches for that name. Try another search.'
              : 'No businesses have joined this district yet — check back soon.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered
            .filter((b) => query || !featured || b.id !== featured.id)
            .map((b) => (
            <div
              key={b.id}
              className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-600/10"
            >
              <div className="flex items-center gap-3">
                {b.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.profilePhoto} alt={b.name} className="h-12 w-12 rounded-2xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-lg font-bold text-white">
                    {b.name[0]?.toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-bold text-slate-900">{b.name}</h3>
                  {b.isOpenNow != null && (
                    <span
                      className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${
                        b.isOpenNow ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${b.isOpenNow ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {b.isOpenNow ? 'Open now' : 'Closed'}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex-1 space-y-1.5 text-sm text-slate-500">
                <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-slate-400" />{b.todayHours || 'Hours not set'}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" />{b.phone || '—'}</p>
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{b.address || '—'}</p>
              </div>

              <Link
                href={`/book?business=${b.id}`}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg"
              >
                Book now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
