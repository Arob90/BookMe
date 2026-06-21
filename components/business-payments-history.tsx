'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getBusinessPayments } from '@/app/actions/payments'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { subDays } from 'date-fns'
import { Badge } from '@/components/ui/badge'

type Row = Awaited<ReturnType<typeof getBusinessPayments>>[number]

function formatClientLabel(c: Row['client'] | null | undefined): string {
  if (!c) return 'Client'
  if (c.type === 'COMPANY') return c.companyName || 'Company'
  return `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Client'
}

function buildMockPayments(): Row[] {
  const now = new Date()
  return [
    {
      id: '__mock_pay_1',
      appointmentId: '__mock_apt_1',
      clientId: '__mock_client_1',
      amount: 65,
      isRefund: false,
      paymentMethod: 'CASH',
      paymentAccountId: null,
      notes: 'Walk-in payment (sample)',
      attachmentUrls: [],
      paidAt: subDays(now, 1),
      createdAt: subDays(now, 1),
      appointment: {
        id: '__mock_apt_1',
        startAt: subDays(now, 1),
        totalPrice: 65,
      },
      client: {
        id: '__mock_client_1',
        type: 'INDIVIDUAL',
        firstName: 'Ariana',
        lastName: 'Brooks',
        companyName: null,
      },
    } as any,
    {
      id: '__mock_pay_2',
      appointmentId: '__mock_apt_2',
      clientId: '__mock_client_2',
      amount: 120,
      isRefund: false,
      paymentMethod: 'BANK',
      paymentAccountId: null,
      notes: 'Transfer reference 10482 (sample)',
      attachmentUrls: [],
      paidAt: subDays(now, 3),
      createdAt: subDays(now, 3),
      appointment: {
        id: '__mock_apt_2',
        startAt: subDays(now, 3),
        totalPrice: 120,
      },
      client: {
        id: '__mock_client_2',
        type: 'COMPANY',
        firstName: '—',
        lastName: '—',
        companyName: 'Blue Bay Villas',
      },
    } as any,
    {
      id: '__mock_pay_3',
      appointmentId: '__mock_apt_3',
      clientId: '__mock_client_3',
      amount: 25,
      isRefund: true,
      paymentMethod: null,
      paymentAccountId: null,
      notes: 'Partial refund (sample)',
      attachmentUrls: [],
      paidAt: subDays(now, 6),
      createdAt: subDays(now, 6),
      appointment: {
        id: '__mock_apt_3',
        startAt: subDays(now, 7),
        totalPrice: 90,
      },
      client: {
        id: '__mock_client_3',
        type: 'INDIVIDUAL',
        firstName: 'Marcus',
        lastName: 'Dean',
        companyName: null,
      },
    } as any,
  ]
}

export function BusinessPaymentsHistory(props: { limit?: number }) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])

  const load = async () => {
    setIsLoading(true)
    try {
      const r = await getBusinessPayments({ limit: props.limit ?? 100 })
      setRows(r)
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to load payments', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const summary = useMemo(() => {
    if (!rows.length) return null
    const total = rows.reduce((sum, r) => sum + (r.amount ? Number(r.amount) * (r.isRefund ? -1 : 1) : 0), 0)
    return { count: rows.length, net: total }
  }, [rows])

  const useMock = !isLoading && rows.length === 0
  const displayRows = useMock ? buildMockPayments() : rows

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white py-4">
        <CardTitle className="text-base font-semibold text-gray-800">Payments</CardTitle>
        <CardDescription className="text-gray-600">
          Recorded payments and refunds across all appointments.
          {summary ? ` (${summary.count} shown)` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading payments…</div>
        ) : (
          <div>
            {useMock && (
              <div className="rounded-md border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 mb-3">
                <span className="font-semibold">Mock preview — </span>
                Sample payments list for layout. Real payments replace this when you record payments/refunds.
              </div>
            )}
            <div className="max-h-[min(55vh,520px)] overflow-y-auto pr-1">
              <ul className="space-y-2">
                {displayRows.map((r) => {
                const when = r.paidAt ? new Date(r.paidAt) : null
                const client = formatClientLabel(r.client)
                const amt = r.amount == null ? null : Number(r.amount)
                const signed = amt == null ? null : (r.isRefund ? -amt : amt)
                return (
                  <li key={r.id} className="rounded-lg border bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {client}
                          {useMock ? (
                            <Badge variant="outline" className="ml-2 text-[10px] border-amber-400 text-amber-900">
                              Mock
                            </Badge>
                          ) : null}
                          {r.isRefund ? <span className="ml-2 text-xs text-rose-700">(Refund)</span> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.paymentMethod ? `Method: ${r.paymentMethod}` : 'Method: —'}
                          {r.appointment?.startAt ? ` • Appt: ${format(new Date(r.appointment.startAt), 'PP')}` : ''}
                        </div>
                        {r.notes ? <div className="mt-1 text-xs text-muted-foreground">{r.notes}</div> : null}
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold tabular-nums ${signed != null && signed < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {signed == null ? '—' : signed.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {when ? format(when, 'PPp') : ''}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

