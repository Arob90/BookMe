'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, DollarSign, Package, Gift, UserPlus, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/app/actions/notifications'

const ICONS: Record<string, any> = {
  upcoming_appointment: Calendar,
  unpaid_payment: DollarSign,
  low_inventory: Package,
  birthday: Gift,
  account_request: UserPlus,
}
const TAB_LABELS: Record<string, string> = {
  upcoming_appointment: 'Appointments',
  unpaid_payment: 'Payments',
  low_inventory: 'Inventory',
  birthday: 'Birthdays',
  account_request: 'Requests',
}
const PRIORITY_RING: Record<string, string> = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-violet-100 text-violet-600',
  low: 'bg-slate-100 text-slate-500',
}

export function NotificationsView() {
  const router = useRouter()
  const [items, setItems] = useState<Notification[]>([])
  const [tab, setTab] = useState('all')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = () => {
      fetch('/api/notifications?t=' + Date.now())
        .then((r) => r.json())
        .then((d) => {
          if (d?.notifications && Array.isArray(d.notifications)) setItems(d.notifications)
          setLoaded(true)
        })
        .catch(() => setLoaded(true))
    }
    load()
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [])

  const presentTypes = useMemo(() => Array.from(new Set(items.map((i) => i.type))), [items])
  const filtered = tab === 'all' ? items : items.filter((i) => i.type === tab)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          {presentTypes.map((t) => (
            <TabsTrigger key={t} value={t}>{TAB_LABELS[t] || t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-5 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-medium text-slate-600">{loaded ? 'You’re all caught up' : 'Loading…'}</p>
            <p className="mt-1 text-sm text-slate-400">No notifications here right now.</p>
          </div>
        ) : (
          filtered.map((n) => {
            const Icon = ICONS[n.type] || Bell
            return (
              <button
                key={n.id}
                onClick={() => n.link && router.push(n.link)}
                className="glass-card flex w-full items-start gap-3 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${PRIORITY_RING[n.priority] || PRIORITY_RING.low}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">{n.title}</p>
                    <span className="shrink-0 text-xs text-slate-400">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
