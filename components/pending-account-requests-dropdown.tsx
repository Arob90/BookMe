'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { UserPlus, CheckCircle2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import { approveAccountRequest, rejectAccountRequest, type PlanType } from '@/app/actions/account-requests'
import { dispatchSyncEvent } from '@/lib/sync-events'

export type PendingAccountRequestSummary = {
  id: string
  businessName: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
}

const PLAN_OPTIONS: { value: PlanType; label: string }[] = [
  { value: 'SINGLE', label: 'Single user (1)' },
  { value: 'MULTI_5', label: 'Multi-user (5)' },
  { value: 'MULTI_10', label: 'Multi-user (10)' },
]

interface PendingAccountRequestsDropdownProps {
  requests: PendingAccountRequestSummary[]
  onRefresh?: () => void
}

export function PendingAccountRequestsDropdown({
  requests,
  onRefresh,
}: PendingAccountRequestsDropdownProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<PendingAccountRequestSummary | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('SINGLE')
  const [approveLoading, setApproveLoading] = useState(false)

  const goToAccountsTab = () => {
    router.push('/app/accounts?tab=account-requests')
    setIsOpen(false)
  }

  const handleReject = async (r: PendingAccountRequestSummary) => {
    if (!confirm('Reject this account request? They will need to sign up again.')) return
    setProcessingId(r.id)
    try {
      await rejectAccountRequest(r.id)
      toast({ title: 'Rejected', description: 'Request has been removed.' })
      dispatchSyncEvent('account-request-updated')
      onRefresh?.()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to reject',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleApproveConfirm = async () => {
    if (!approveTarget) return
    setApproveLoading(true)
    try {
      await approveAccountRequest(approveTarget.id, selectedPlan)
      setApproveTarget(null)
      toast({ title: 'Approved', description: 'Account has been activated.' })
      dispatchSyncEvent('account-request-updated')
      onRefresh?.()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to approve',
        variant: 'destructive',
      })
    } finally {
      setApproveLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full" title="New account requests">
            <UserPlus className="h-5 w-5 text-gray-600" />
            {requests.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs"
              >
                {requests.length > 9 ? '9+' : requests.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96 max-h-[min(520px,80vh)] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 border-b bg-white px-3 py-2">
            <DropdownMenuLabel className="flex items-center justify-between p-0 text-sm font-semibold">
              <span>Account requests</span>
              {requests.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {requests.length}
                </Badge>
              )}
            </DropdownMenuLabel>
          </div>
          {requests.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No pending account requests</div>
          ) : (
            requests.map((r) => {
              const rowBusy = processingId === r.id
              const freezeList = approveTarget !== null || approveLoading
              return (
                <div key={r.id} className="border-b border-gray-100 p-3 last:border-b-0">
                  <div className="space-y-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{r.businessName}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-600">{r.email}</p>
                      <p className="truncate text-xs text-gray-500">
                        {r.firstName} {r.lastName}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {format(new Date(r.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 flex-1 bg-green-600 text-xs hover:bg-green-700 sm:flex-none"
                        disabled={rowBusy || freezeList}
                        onClick={() => {
                          setSelectedPlan('SINGLE')
                          setApproveTarget(r)
                          setIsOpen(false)
                        }}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 border-red-200 text-xs text-red-700 hover:bg-red-50 sm:flex-none"
                        disabled={rowBusy || freezeList}
                        onClick={() => handleReject(r)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <DropdownMenuSeparator className="my-0" />
          <DropdownMenuItem
            onClick={goToAccountsTab}
            className="cursor-pointer justify-center text-center focus:bg-pink-50"
          >
            Open Account management
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Approve account</DialogTitle>
            <DialogDescription>
              {approveTarget && (
                <>
                  Activate account for <strong>{approveTarget.businessName}</strong> ({approveTarget.email})?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Plan (based on purchase)</label>
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
              <p className="mt-1 text-xs text-gray-500">
                Single = 1 user. Multi-user = owner can add staff up to the limit.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={approveLoading}>
              Cancel
            </Button>
            <Button onClick={handleApproveConfirm} disabled={approveLoading} className="bg-green-600 hover:bg-green-700">
              {approveLoading ? 'Approving...' : 'Approve & activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
