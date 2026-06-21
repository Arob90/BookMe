'use client'

import { format, subDays } from 'date-fns'
import type { BillingHistoryRow } from '@/lib/billing-history'
import { Badge } from '@/components/ui/badge'

/** Sample timeline when the DB has no `billing_history_events` yet (remove when data is reliable). */
function buildMockBillingHistoryRows(): BillingHistoryRow[] {
  const now = new Date()
  return [
    {
      id: '__mock_bill_1',
      staffId: '__mock',
      eventType: 'ACCOUNT_UNPAUSED',
      title: 'Account unpaused',
      detail: 'Sign-in enabled again for the owner and team.',
      metadata: { paused: false },
      actorUserId: null,
      createdAt: subDays(now, 1),
    },
    {
      id: '__mock_bill_2',
      staffId: '__mock',
      eventType: 'ACCOUNT_PAUSED',
      title: 'Account paused',
      detail: 'Sign-in disabled for the owner and team until unpaused.',
      metadata: { paused: true },
      actorUserId: null,
      createdAt: subDays(now, 3),
    },
    {
      id: '__mock_bill_3',
      staffId: '__mock',
      eventType: 'TEAM_LOGIN_ADDED',
      title: 'Team login added',
      detail: 'stylist@nailsbynikz.com — STAFF (sample)',
      metadata: null,
      actorUserId: null,
      createdAt: subDays(now, 5),
    },
    {
      id: '__mock_bill_4',
      staffId: '__mock',
      eventType: 'TEAM_LOGIN_ADDED',
      title: 'Team login added',
      detail: 'cashier@nailsbynikz.com — STAFF (sample)',
      metadata: null,
      actorUserId: null,
      createdAt: subDays(now, 6),
    },
    {
      id: '__mock_bill_5',
      staffId: '__mock',
      eventType: 'SEAT_PLAN_CHANGE',
      title: 'Seat plan updated',
      detail: 'Seat allowance changed from 1 to 5 (max user logins).',
      metadata: { from: 1, to: 5 },
      actorUserId: null,
      createdAt: subDays(now, 10),
    },
    {
      id: '__mock_bill_6',
      staffId: '__mock',
      eventType: 'ACCOUNT_APPROVED',
      title: 'Account approved',
      detail: 'Signup approved with initial 5-seat plan.',
      metadata: { plan: 'MULTI_5', maxUsers: 5 },
      actorUserId: null,
      createdAt: subDays(now, 14),
    },
  ]
}

function formatMetadataLine(metadata: BillingHistoryRow['metadata']): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const o = metadata as Record<string, unknown>
  if (typeof o.from === 'number' && typeof o.to === 'number') {
    return `${o.from} → ${o.to} seats`
  }
  if (typeof o.plan === 'string' && typeof o.maxUsers === 'number') {
    return `Plan ${o.plan}: ${o.maxUsers} seat${o.maxUsers === 1 ? '' : 's'}`
  }
  return null
}

export function BillingHistoryList(props: {
  items: BillingHistoryRow[]
  className?: string
  maxHeightClass?: string
}) {
  const { items, className = '', maxHeightClass = 'max-h-[min(52vh,400px)]' } = props

  const useMock = items.length === 0
  const rows = useMock ? buildMockBillingHistoryRows() : items

  return (
    <div className={className}>
      {useMock && (
        <div className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 mb-3">
          <span className="font-semibold">Mock preview — </span>
          Sample billing and plan timeline for layout. Real events replace this when the database logs them.
        </div>
      )}
      <div className={`${maxHeightClass} overflow-y-auto pr-1`}>
        <ul className="space-y-3">
          {rows.map((row) => {
            const metaLine = formatMetadataLine(row.metadata)
            const at = new Date(row.createdAt)
            return (
              <li
                key={row.id}
                className={`rounded-lg border bg-white p-3 text-sm shadow-sm ${
                  useMock ? 'border-l-4 border-l-amber-300 bg-amber-50/30' : ''
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{row.title}</span>
                    {useMock && (
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-900">
                        Mock
                      </Badge>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground tabular-nums" dateTime={at.toISOString()}>
                    {format(at, 'PPp')}
                  </time>
                </div>
                {metaLine && <p className="mt-1 text-xs font-medium text-pink-700">{metaLine}</p>}
                {row.detail ? <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{row.detail}</p> : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
