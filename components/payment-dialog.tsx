'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createPayment } from '@/app/actions/payments'
import {
  grossPaymentsTotal,
  invoiceBalanceDue,
  netPaymentsTotal,
  refundsTotal,
} from '@/lib/payment-net'
import { RefundDialog } from '@/components/refund-dialog'
import { getBankingSettings } from '@/app/actions/banking'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Banknote, Landmark, Wallet, Send, Undo2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { dispatchSyncEvent } from '@/lib/sync-events'

type PaymentMethodType = 'CASH' | 'BANK' | 'WALLET' | 'WIRE'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: any
  onPaymentAdded?: () => void
}

const METHOD_CONFIG = {
  CASH: { label: 'Cash', icon: Banknote },
  BANK: { label: 'Bank', icon: Landmark },
  WALLET: { label: 'Wallet', icon: Wallet },
  WIRE: { label: 'Wire', icon: Send },
} as const

export function PaymentDialog({
  open,
  onOpenChange,
  appointment,
  onPaymentAdded,
}: PaymentDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH')
  const [paymentAccountId, setPaymentAccountId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addAnother, setAddAnother] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [banking, setBanking] = useState<{
    methodsEnabled: Record<PaymentMethodType, boolean>
    banks: { id: string; name: string }[]
    wallets: { id: string; name: string }[]
    wirePlaces: { id: string; name: string }[]
  } | null>(null)

  const totalPrice = Number(appointment?.totalPrice || 0)
  const grossPaid = grossPaymentsTotal(appointment?.payments)
  const netPaid = netPaymentsTotal(appointment?.payments)
  const refunded = refundsTotal(appointment?.payments)
  const balanceDue = invoiceBalanceDue(totalPrice, appointment?.payments)

  const enabledMethods: PaymentMethodType[] = banking
    ? (['CASH', 'BANK', 'WALLET', 'WIRE'] as PaymentMethodType[]).filter(
        (m) => banking.methodsEnabled[m] !== false
      )
    : ['CASH', 'BANK', 'WALLET', 'WIRE']
  const effectiveMethods: PaymentMethodType[] =
    enabledMethods.length > 0 ? enabledMethods : ['CASH', 'BANK', 'WALLET', 'WIRE']
  const defaultMethod: PaymentMethodType = effectiveMethods[0] ?? 'CASH'

  const getAccountsForMethod = () => {
    if (paymentMethod === 'BANK') return banking?.banks || []
    if (paymentMethod === 'WALLET') return banking?.wallets || []
    if (paymentMethod === 'WIRE') return banking?.wirePlaces || []
    return []
  }
  const accounts = getAccountsForMethod()
  const needsAccountSelection = accounts.length > 0 && paymentMethod !== 'CASH'

  useEffect(() => {
    if (open) {
      getBankingSettings().then((r) => {
        if (r) setBanking({ ...r, banks: r.banks, wallets: r.wallets, wirePlaces: r.wirePlaces })
      })
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setAmount('')
      setNotes('')
      setPaymentAccountId('')
      setAddAnother(false)
    }
  }, [open])

  useEffect(() => {
    if (open && banking) {
      setPaymentMethod(defaultMethod)
    }
  }, [open, banking, defaultMethod])

  const handleQuickAmount = (type: 'full' | 'half') => {
    if (type === 'full') {
      setAmount(balanceDue.toFixed(2))
    } else {
      setAmount((balanceDue / 2).toFixed(2))
    }
  }

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      })
      return
    }

    if (parseFloat(amount) > balanceDue) {
      toast({
        title: 'Error',
        description: `Payment amount cannot exceed balance due of ${formatCurrency(balanceDue)}`,
        variant: 'destructive',
      })
      return
    }

    if (needsAccountSelection && !paymentAccountId) {
      toast({
        title: 'Error',
        description: `Please select a ${paymentMethod.toLowerCase()} account`,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createPayment({
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        amount: parseFloat(amount),
        paymentMethod,
        paymentAccountId: needsAccountSelection ? paymentAccountId : undefined,
        notes: notes || undefined,
      })
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      })
      
      // Refresh data and notifications
      router.refresh()
      onPaymentAdded?.()
      
      // Dispatch sync event to notify all pages
      dispatchSyncEvent('payment-recorded', { 
        appointmentId: appointment.id,
        clientId: appointment.clientId 
      })
      
      if (addAnother && balanceDue - parseFloat(amount) > 0) {
        // Keep dialog open for another payment
        setAmount('')
        setNotes('')
        setPaymentMethod(defaultMethod)
        setPaymentAccountId('')
      } else {
        // Close dialog
        setAmount('')
        setNotes('')
        setPaymentMethod(defaultMethod)
        setPaymentAccountId('')
        setAddAnother(false)
        onOpenChange(false)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <div className="shrink-0 border-b border-border/60 px-6 pb-3 pt-6 pr-14">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Total Price</Label>
            <p className="text-lg font-bold">{formatCurrency(totalPrice)}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Payments received</Label>
            <p className="text-base">{formatCurrency(grossPaid)}</p>
          </div>
          {refunded > 0.01 && (
            <>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Refunds</Label>
                <p className="text-base text-amber-900">{formatCurrency(refunded)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Net after refunds</Label>
                <p className="text-base text-muted-foreground">{formatCurrency(netPaid)}</p>
              </div>
            </>
          )}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Balance due</Label>
            <p className={`text-lg font-bold ${balanceDue > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(balanceDue)}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleQuickAmount('full')}
              className="flex-1"
              disabled={balanceDue <= 0}
            >
              Pay Full ({formatCurrency(balanceDue)})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleQuickAmount('half')}
              className="flex-1"
              disabled={balanceDue <= 0}
            >
              Pay Half ({formatCurrency(balanceDue / 2)})
            </Button>
          </div>

          <div>
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balanceDue}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: PaymentMethodType) => {
                setPaymentMethod(value)
                setPaymentAccountId('')
              }}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {effectiveMethods.map((method) => {
                  const config = METHOD_CONFIG[method]
                  const Icon = config.icon
                  return (
                    <SelectItem key={method} value={method}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {needsAccountSelection && (
            <div>
              <Label htmlFor="paymentAccount">Select {METHOD_CONFIG[paymentMethod].label} *</Label>
              <Select
                value={paymentAccountId}
                onValueChange={setPaymentAccountId}
              >
                <SelectTrigger id="paymentAccount">
                  <SelectValue placeholder={`Choose ${paymentMethod.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment notes..."
              rows={2}
            />
          </div>

          {balanceDue - (parseFloat(amount) || 0) > 0 && (
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="addAnother"
                checked={addAnother}
                onChange={(e) => setAddAnother(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="addAnother" className="text-sm font-normal cursor-pointer">
                Add another payment (e.g., split balance due across methods)
              </Label>
            </div>
          )}

          {appointment?.payments && appointment.payments.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Payment history</p>
              <div className="space-y-1">
                {appointment.payments.map((payment: any, index: number) => (
                  <div
                    key={payment.id || index}
                    className={`flex justify-between gap-2 text-xs p-1.5 rounded ${
                      payment.isRefund ? 'bg-amber-50 border border-amber-100' : 'bg-muted/50'
                    }`}
                  >
                    <span className={payment.isRefund ? 'text-amber-900 font-medium' : ''}>
                      {payment.isRefund ? '−' : ''}
                      {formatCurrency(Number(payment.amount))}{' '}
                      {payment.isRefund ? 'refund' : payment.paymentMethod || 'Payment'}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {netPaid > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-amber-200 text-amber-900 hover:bg-amber-50"
              onClick={() => setRefundOpen(true)}
            >
              <Undo2 className="h-4 w-4" />
              Record refund
            </Button>
          )}
        </div>
        </div>
        <div className="shrink-0 border-t border-border/80 bg-background px-6 py-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddAnother(false)
                onOpenChange(false)
              }}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1"
              disabled={
                isSubmitting ||
                !amount ||
                parseFloat(amount) <= 0 ||
                (needsAccountSelection && !paymentAccountId)
              }
            >
              {isSubmitting ? 'Processing...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <RefundDialog
      open={refundOpen}
      onOpenChange={setRefundOpen}
      appointment={appointment}
      onRefundRecorded={() => {
        router.refresh()
        onPaymentAdded?.()
        dispatchSyncEvent('payment-recorded', {
          appointmentId: appointment?.id,
          clientId: appointment?.clientId,
        })
      }}
    />
  </>
  )
}
