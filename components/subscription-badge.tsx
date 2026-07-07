'use client'

import { AlertTriangle, CalendarClock, CalendarX2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { daysUntil, getSubscriptionStatus } from '@/lib/subscription'

/**
 * Small status pill for a business subscription expiry.
 * `compact` renders a short label for dense list rows; otherwise a fuller label.
 */
export function SubscriptionBadge({
  endsAt,
  compact = false,
  showActive = true,
}: {
  endsAt: Date | string | null | undefined
  compact?: boolean
  showActive?: boolean
}) {
  const status = getSubscriptionStatus(endsAt)
  if (status === 'none') return null

  const end = typeof endsAt === 'string' ? new Date(endsAt) : (endsAt as Date)
  const dateLabel = format(end, 'MMM d, yyyy')

  if (status === 'expired') {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px] h-5">
        <CalendarX2 className="h-3 w-3" />
        {compact ? 'Expired' : `Expired ${dateLabel}`}
      </Badge>
    )
  }

  if (status === 'expiring') {
    const days = Math.max(0, daysUntil(end))
    return (
      <Badge
        variant="outline"
        className="gap-1 text-[10px] h-5 border-amber-300 bg-amber-50 text-amber-800"
      >
        <AlertTriangle className="h-3 w-3" />
        {compact ? `${days}d left` : `Expires in ${days} day${days === 1 ? '' : 's'}`}
      </Badge>
    )
  }

  // active
  if (!showActive) return null
  return (
    <Badge
      variant="outline"
      className="gap-1 text-[10px] h-5 border-emerald-200 bg-emerald-50 text-emerald-700"
    >
      {compact ? <CheckCircle2 className="h-3 w-3" /> : <CalendarClock className="h-3 w-3" />}
      {compact ? 'Active' : `Until ${dateLabel}`}
    </Badge>
  )
}
