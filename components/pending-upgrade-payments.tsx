'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { CreditCard, CheckCircle2 } from 'lucide-react'
import { activateUpgradePlan, type UpgradePaymentRow } from '@/app/actions/upgrade-payments'

export function PendingUpgradePayments({ initial }: { initial: UpgradePaymentRow[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  if (rows.length === 0) return null

  const activate = async (row: UpgradePaymentRow) => {
    const plan = row.plan || 'Basic'
    if (!confirm(`Activate the ${plan} plan for ${row.businessName || row.email}? Confirm only after you've verified payment.`)) return
    setLoading(row.ownerId)
    try {
      await activateUpgradePlan(row.ownerId, plan)
      setRows((r) => r.filter((x) => x.ownerId !== row.ownerId))
      toast({ title: 'Plan activated', description: `${row.businessName || row.email} is now on ${plan}.` })
      router.refresh()
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to activate', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          Plan upgrade payments
          <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{rows.length}</span>
        </CardTitle>
        <CardDescription>
          Existing accounts that sent payment for a plan. Review the proof, then activate the plan they paid for.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-lg border border-gray-200 bg-white">
          {rows.map((row) => (
            <div key={row.ownerId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-gray-900">{row.businessName || '—'}</span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700">{row.plan || 'Plan'}</span>
                </div>
                <div className="truncate text-sm text-gray-600">{row.email}</div>
                {row.proofUrl && (
                  <a href={row.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
                    View payment proof
                  </a>
                )}
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={loading === row.ownerId}
                onClick={() => activate(row)}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                {loading === row.ownerId ? 'Activating…' : `Activate ${row.plan || ''}`.trim()}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
