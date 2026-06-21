'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { approveAccountRequest, rejectAccountRequest, type PlanType } from '@/app/actions/account-requests'
import { dispatchSyncEvent } from '@/lib/sync-events'
import { Badge } from '@/components/ui/badge'
import { UserPlus, CheckCircle2, XCircle } from 'lucide-react'

const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: 'SINGLE', label: 'Single user (1)' },
  { value: 'MULTI_5', label: 'Multi-user (5)' },
  { value: 'MULTI_10', label: 'Multi-user (10)' },
]

export type AccountRequestRow = {
  id: string
  email: string
  businessName: string
  district: string | null
  firstName: string
  lastName: string
  phone: string | null
  createdAt: string
}

export function AccountRequestsList({ initialRequests }: { initialRequests: AccountRequestRow[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [requests, setRequests] = useState(initialRequests)
  const [approveDialog, setApproveDialog] = useState<AccountRequestRow | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('SINGLE')
  const [loading, setLoading] = useState(false)

  const handleApprove = async () => {
    if (!approveDialog) return
    setLoading(true)
    try {
      await approveAccountRequest(approveDialog.id, selectedPlan)
      setRequests((r) => r.filter((x) => x.id !== approveDialog.id))
      setApproveDialog(null)
      toast({ title: 'Approved', description: 'Account has been activated.' })
      dispatchSyncEvent('account-request-updated')
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to approve',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async (req: AccountRequestRow) => {
    if (!confirm('Reject this account request? They will need to sign up again.')) return
    setLoading(true)
    try {
      await rejectAccountRequest(req.id)
      setRequests((r) => r.filter((x) => x.id !== req.id))
      toast({ title: 'Rejected', description: 'Request has been removed.' })
      dispatchSyncEvent('account-request-updated')
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to reject',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-pink-500" />
            Pending Account Requests
          </CardTitle>
          <CardDescription>
            Approve or reject new business signups. Approve once payment is received. Select the plan (single or multi-user) based on their purchase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No pending requests</p>
              <p className="text-sm mt-1">New signups will appear here for your approval.</p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border border-gray-200 bg-white">
              {requests.map((req) => {
                const districtLabel = req.district ? req.district.replace(/_/g, ' ') : ''
                const nameLine = `${req.firstName} ${req.lastName}`.trim()
                const metaLine =
                  req.phone || districtLabel
                    ? [req.phone, districtLabel].filter(Boolean).join(' • ')
                    : nameLine || null

                return (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <div className="font-semibold text-gray-900 truncate">{req.businessName}</div>
                        <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                          PENDING
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 truncate">{req.email}</div>
                      {metaLine && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{metaLine}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => setApproveDialog(req)}
                        disabled={loading}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => handleReject(req)}
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!approveDialog} onOpenChange={(o) => !o && setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve account</DialogTitle>
            <DialogDescription>
              {approveDialog && (
                <>Activate account for <strong>{approveDialog.businessName}</strong> ({approveDialog.email})?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Plan (based on purchase)</label>
              <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as PlanType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Single = 1 user. Multi-user = owner can add staff up to the limit.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? 'Approving...' : 'Approve & activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
