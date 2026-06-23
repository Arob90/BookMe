'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Phone, Clock, ArrowRight } from 'lucide-react'

export type DirectoryBusiness = {
  id: string
  name: string
  phone: string | null
  address: string | null
  profilePhoto: string | null
  isOpenNow?: boolean | null
  todayHours?: string | null
}

export function DistrictDirectory({ businesses }: { businesses: DirectoryBusiness[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return businesses
    return businesses.filter((b) => b.name.toLowerCase().includes(q))
  }, [businesses, query])

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
      </div>

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
          {filtered.map((b) => (
            <div
              key={b.id}
              className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-600/10"
            >
              <div className="flex items-center gap-3">
                {b.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.profilePhoto} alt={b.name} className="h-12 w-12 rounded-2xl object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white">
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

              <div className="mt-4 space-y-1.5 text-sm text-slate-500">
                {b.todayHours && (
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" />{b.todayHours}</p>
                )}
                {b.phone && (
                  <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" />{b.phone}</p>
                )}
                {b.address && (
                  <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{b.address}</p>
                )}
              </div>

              <Link
                href={`/book?business=${b.id}`}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg"
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
