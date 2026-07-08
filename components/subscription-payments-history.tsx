'use client'

import { useMemo, useState } from 'react'
import type { BillingHistoryRow } from '@/lib/billing-history'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Receipt } from 'lucide-react'

type SubscriptionPaymentRow = {
  id: string
  label: string
  detail: string
  amount: number
  paidAt: Date
  isMock?: boolean
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

function buildReceiptNo(id: string, paidAt: Date): string {
  // Stable-enough "virtual" receipt reference for display.
  const y = paidAt.getFullYear()
  const m = String(paidAt.getMonth() + 1).padStart(2, '0')
  const d = String(paidAt.getDate()).padStart(2, '0')
  const tail = id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()
  return `BM-${y}${m}${d}-${tail || '00000000'}`
}

function extractSeatsFromLabel(label: string): number | null {
  const m = label.match(/\((\d+)\s+seats?\)/i)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function seatsToPrice(seats: number): number {
  // Placeholder pricing until gateway + invoices exist.
  if (seats <= 1) return 10
  if (seats <= 5) return 35
  if (seats <= 10) return 60
  return 60 + (seats - 10) * 5
}

function tryExtractSeats(meta: unknown): number | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const o = meta as Record<string, unknown>
  if (typeof o.maxUsers === 'number') return o.maxUsers
  if (typeof o.to === 'number') return o.to
  return null
}

function buildRowsFromBillingHistory(items: BillingHistoryRow[]): SubscriptionPaymentRow[] {
  const rows: SubscriptionPaymentRow[] = []
  for (const e of items) {
    const seats = tryExtractSeats(e.metadata)
    if (e.eventType === 'SEAT_PLAN_CHANGE' && seats) {
      rows.push({
        id: `seat_${e.id}`,
        label: `Plan change (${seats} seats)`,
        detail: e.detail || 'Plan updated.',
        amount: seatsToPrice(seats),
        paidAt: new Date(e.createdAt),
      })
    }
    if (e.eventType === 'ACCOUNT_APPROVED' && seats) {
      rows.push({
        id: `approved_${e.id}`,
        label: `Initial plan (${seats} seats)`,
        detail: e.detail || 'Account approved.',
        amount: seatsToPrice(seats),
        paidAt: new Date(e.createdAt),
      })
    }
    if (e.eventType === 'PLAN_ACTIVATED') {
      const s = seats ?? 1
      rows.push({
        id: `plan_${e.id}`,
        label: `Payment approved${s ? ` (${s} seats)` : ''}`,
        detail: e.detail || 'Plan payment verified and activated.',
        amount: seatsToPrice(s),
        paidAt: new Date(e.createdAt),
      })
    }
  }
  return rows.sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
}

function buildMockRows(anchor?: Date): SubscriptionPaymentRow[] {
  const base = anchor ? new Date(anchor) : new Date()
  const d1 = new Date(base)
  const d2 = new Date(base)
  d2.setDate(d2.getDate() - 4)
  const d3 = new Date(base)
  d3.setDate(d3.getDate() - 8)

  return [
    {
      id: '__mock_subpay_1',
      label: 'Plan upgrade (5 seats)',
      detail: 'Upgraded from Solo to Team (5).',
      amount: seatsToPrice(5),
      paidAt: d2,
      isMock: true,
    },
    {
      id: '__mock_subpay_2',
      label: 'Initial plan (1 seat)',
      detail: 'Solo plan activated.',
      amount: seatsToPrice(1),
      paidAt: d3,
      isMock: true,
    },
    {
      id: '__mock_subpay_3',
      label: 'Monthly renewal (5 seats)',
      detail: 'Subscription renewed.',
      amount: seatsToPrice(5),
      paidAt: d1,
      isMock: true,
    },
  ].sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
}

export function SubscriptionPaymentsHistory(props: { billingHistory: BillingHistoryRow[] }) {
  const derived = useMemo(() => buildRowsFromBillingHistory(props.billingHistory), [props.billingHistory])
  const useMock = derived.length === 0
  const rows = useMock ? buildMockRows(props.billingHistory[0]?.createdAt ? new Date(props.billingHistory[0].createdAt) : undefined) : derived
  const [selected, setSelected] = useState<SubscriptionPaymentRow | null>(null)

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white py-4">
        <CardTitle className="text-base font-semibold text-gray-800">Subscription payments</CardTitle>
        <CardDescription className="text-gray-600">Charges related to your plan changes and renewals.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {useMock && (
          <div className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 mb-3">
            <span className="font-semibold">Mock preview — </span>
            This is a sample subscription payment list. Real charges will appear here once billing is connected.
          </div>
        )}

        <div className="max-h-[min(55vh,520px)] overflow-y-auto pr-1">
          <ul className="space-y-2">
            {rows.map((r) => {
              const receiptNo = buildReceiptNo(r.id, r.paidAt)
              return (
                <li key={r.id} className="rounded-lg border bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    aria-label={`View receipt for ${r.label}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                          <span className="truncate">{r.label}</span>
                          {r.isMock ? (
                            <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-900">
                              Mock
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.detail}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">Receipt #{receiptNo}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold tabular-nums text-emerald-700">{formatCurrency(r.amount)}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">{format(r.paidAt, 'PPp')}</div>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => (!open ? setSelected(null) : null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-pink-500" />
              Virtual receipt
            </DialogTitle>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              {selected.isMock ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                  <span className="font-semibold">Mock preview — </span>
                  This receipt is sample data for layout.
                </div>
              ) : null}

              <div className="mx-auto w-full max-w-sm rounded-2xl border bg-white shadow-sm">
                {/* Receipt "paper" */}
                <div className="p-4">
                  <div className="text-center">
                    <div className="text-sm font-semibold tracking-wide text-gray-900">BookMe</div>
                    <div className="text-[11px] text-muted-foreground">Subscription receipt</div>
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3 text-[11px] text-muted-foreground">
                    <div className="min-w-0">
                      <div className="truncate">
                        Receipt <span className="font-medium text-gray-900">#{buildReceiptNo(selected.id, selected.paidAt)}</span>
                      </div>
                      <div className="truncate">
                        Paid at <span className="font-medium text-gray-900 tabular-nums">{format(selected.paidAt, 'PPp')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div>
                        Status <span className="font-medium text-gray-900">{selected.isMock ? 'Preview' : 'Paid'}</span>
                      </div>
                      <div>
                        Method <span className="font-medium text-gray-900">{selected.isMock ? 'Card' : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="my-4 border-t border-dashed" />

                  <div className="text-xs font-semibold text-gray-900">Items</div>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 leading-snug">{selected.label}</div>
                        <div className="text-[11px] text-muted-foreground leading-snug">{selected.detail}</div>
                      </div>
                      <div className="tabular-nums font-medium text-gray-900">{formatCurrency(selected.amount)}</div>
                    </div>

                    {(() => {
                      const seats = extractSeatsFromLabel(selected.label)
                      if (!seats) return null
                      return (
                        <div className="text-[11px] text-muted-foreground">
                          Plan seats: <span className="font-medium text-gray-900 tabular-nums">{seats}</span>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="my-4 border-t border-dashed" />

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatCurrency(selected.amount)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span className="tabular-nums">0.00</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-gray-900">
                      <span>Total</span>
                      <span className="tabular-nums text-emerald-700">{formatCurrency(selected.amount)}</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-dashed pt-3 text-center text-[11px] text-muted-foreground">
                    <div className="font-medium text-gray-900">Thank you</div>
                    <div>Keep this receipt for your records.</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a payment to view a receipt.</div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

