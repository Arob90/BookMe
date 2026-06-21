'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, CheckCircle2, Clock, MessageSquare, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { formatDateTime } from '@/lib/utils'

export type PendingApproval = {
  id: string
  client: { firstName: string; lastName: string }
  startAt: string
  endAt: string
  totalPrice: number
  appointmentServices: Array<{ service: { name: string } }>
}

export function PendingApprovalsList({ initialApprovals }: { initialApprovals: PendingApproval[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [approvals, setApprovals] = useState(initialApprovals)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null)

  const refresh = async () => {
    try {
      const res = await fetch('/api/pending-approvals?t=' + Date.now())
      const data = await res.json()
      if (data?.approvals && Array.isArray(data.approvals)) {
        setApprovals(
          data.approvals.map((a: any) => ({
            ...a,
            totalPrice: Number(a.totalPrice || 0),
          }))
        )
      }
    } catch {
      // ignore
    }
  }

  const handleApprove = async (appointmentId: string) => {
    setProcessingId(appointmentId)
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, status: 'CONFIRMED' }),
      })
      if (!response.ok) throw new Error('Failed to approve appointment')

      toast({ title: 'Approved', description: 'Appointment approved successfully' })
      await refresh()
      router.refresh()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to approve appointment', variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (appointmentId: string) => {
    setProcessingId(appointmentId)
    try {
      const response = await fetch('/api/appointments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, status: 'CANCELLED' }),
      })
      if (!response.ok) throw new Error('Failed to reject appointment')

      toast({ title: 'Rejected', description: 'Appointment rejected' })
      await refresh()
      router.refresh()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to reject appointment', variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewInCalendar = (appointmentId: string, startAt: string) => {
    const date = new Date(startAt).toISOString().split('T')[0]
    router.push(`/app/calendar?date=${date}&appointmentId=${appointmentId}`)
  }

  const handleSendWhatsApp = async (appointmentId: string) => {
    setSendingWhatsAppId(appointmentId)
    try {
      const whatsappResponse = await fetch(`/api/whatsapp?appointmentId=${appointmentId}`)
      if (!whatsappResponse.ok) throw new Error('Failed to generate WhatsApp message')
      const whatsappData = await whatsappResponse.json()
      if (!whatsappData.whatsappUrl) throw new Error('No WhatsApp URL generated')
      window.open(whatsappData.whatsappUrl, '_blank')
      toast({ title: 'WhatsApp opened', description: 'Message opened in a new tab.' })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate WhatsApp message', variant: 'destructive' })
    } finally {
      setSendingWhatsAppId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-pink-500" />
            Pending Approvals
            {approvals.length > 0 && <Badge className="bg-pink-500 text-white border-0">{approvals.length}</Badge>}
          </CardTitle>
          <CardDescription>Bookings made from your website that need approval.</CardDescription>
        </div>
        <Button variant="outline" onClick={refresh}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">No pending approvals</div>
        ) : (
          <div className="space-y-3">
            {approvals.map((a) => {
              const services = a.appointmentServices.map((x) => x.service.name).join(', ')
              const isProcessing = processingId === a.id
              const isSending = sendingWhatsAppId === a.id
              return (
                <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">
                        {a.client.firstName} {a.client.lastName}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDateTime(a.startAt)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate">{services || '—'}</div>
                      <div className="text-sm font-semibold text-pink-600 mt-2">${Number(a.totalPrice || 0).toFixed(2)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        onClick={() => handleApprove(a.id)}
                        disabled={isProcessing || isSending}
                        size="sm"
                        className="h-8 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReject(a.id)}
                        disabled={isProcessing || isSending}
                        variant="outline"
                        size="sm"
                        className="h-8 border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleSendWhatsApp(a.id)}
                        disabled={isProcessing || isSending}
                        variant="outline"
                        size="sm"
                        className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                      <Button
                        onClick={() => handleViewInCalendar(a.id, a.startAt)}
                        variant="outline"
                        size="sm"
                        className="h-8"
                        title="View in Calendar"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Calendar
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-400">
                    Ref: <span className="font-mono break-all">{a.id}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

