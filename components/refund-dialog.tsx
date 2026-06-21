'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createRefund } from '@/app/actions/payments'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import { netPaymentsTotal } from '@/lib/payment-net'
import { useRouter } from 'next/navigation'
import { dispatchSyncEvent } from '@/lib/sync-events'
import { Paperclip, X, Undo2 } from 'lucide-react'

interface RefundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: any
  onRefundRecorded?: () => void
}

export function RefundDialog({
  open,
  onOpenChange,
  appointment,
  onRefundRecorded,
}: RefundDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const netPaid = netPaymentsTotal(appointment?.payments)

  useEffect(() => {
    if (open) {
      setAmount('')
      setNotes('')
      setFiles([])
    }
  }, [open])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!appointment?.id || !appointment?.clientId) return
    const n = parseFloat(String(amount).trim())
    if (!Number.isFinite(n) || n <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Enter a refund amount greater than zero.',
        variant: 'destructive',
      })
      return
    }
    if (n > netPaid + 0.009) {
      toast({
        title: 'Too much',
        description: `You can refund at most ${formatCurrency(netPaid)} (net paid on this visit).`,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const attachmentUrls: string[] = []
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload/payment-attachment', {
          method: 'POST',
          body: fd,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}`)
        }
        if (data.url) attachmentUrls.push(data.url)
      }

      await createRefund({
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        amount: n,
        notes: notes.trim() || undefined,
        attachmentUrls: attachmentUrls.length ? attachmentUrls : undefined,
      })

      toast({ title: 'Refund recorded', description: `${formatCurrency(n)} refunded for this appointment.` })
      router.refresh()
      onRefundRecorded?.()
      dispatchSyncEvent('payment-recorded', {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
      })
      onOpenChange(false)
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message || 'Failed to record refund',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <div className="shrink-0 border-b border-border/60 px-6 pb-3 pt-6 pr-14">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-amber-600" />
              Record refund
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">Net paid on this appointment (after earlier refunds)</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(netPaid)}</p>
          </div>

          <div>
            <Label htmlFor="refund-amount">Refund amount *</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={netPaid}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={netPaid <= 0}
              onClick={() => setAmount(netPaid.toFixed(2))}
            >
              Full refund ({formatCurrency(netPaid)})
            </Button>
          </div>

          <div>
            <Label htmlFor="refund-notes">Notes (recommended)</Label>
            <Textarea
              id="refund-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for refund, reference #, policy, etc."
              rows={3}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments (optional)
            </Label>
            <p className="text-[11px] text-muted-foreground mb-1.5">
              Receipts, bank slips, emails—any file type, up to 12 MB each.
            </p>
            <Input
              type="file"
              multiple
              className="cursor-pointer text-xs"
              onChange={(e) => {
                const list = e.target.files
                if (!list?.length) return
                setFiles((prev) => [...prev, ...Array.from(list)])
                e.target.value = ''
              }}
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded border bg-muted/40 px-2 py-1"
                  >
                    <span className="truncate">{f.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 shrink-0 p-0"
                      onClick={() => removeFile(i)}
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
        </div>
        <div className="shrink-0 border-t border-border/80 bg-background px-6 py-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={
                isSubmitting || netPaid <= 0 || !amount || parseFloat(amount) <= 0
              }
              onClick={handleSubmit}
            >
              {isSubmitting ? 'Saving…' : 'Record refund'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
