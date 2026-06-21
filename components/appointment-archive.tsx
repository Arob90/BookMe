'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { AppointmentDialog } from '@/components/appointment-dialog'
import { useState } from 'react'
import { format } from 'date-fns'

interface AppointmentArchiveProps {
  appointments: any[]
  services: any[]
  clients: any[]
  staff: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentArchive({
  appointments,
  services,
  clients,
  staff,
  open,
  onOpenChange,
}: AppointmentArchiveProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Sort by date (most recent first)
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Appointments (Cancelled)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {sortedAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No cancelled appointments in archive
              </div>
            ) : (
              <div className="space-y-2">
                {sortedAppointments.map((apt) => {
                  const service = apt.appointmentServices?.[0]?.service
                  const client = apt.client
                  
                  return (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointment(apt)
                        setIsDetailOpen(true)
                      }}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-medium">
                            {client.firstName} {client.lastName}
                          </div>
                          <Badge variant="secondary">CANCELLED</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {service?.name || 'Service'} • {formatDateTime(apt.startAt)}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(apt.totalPrice)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isDetailOpen && selectedAppointment && (
        <AppointmentDialog
          appointment={selectedAppointment}
          services={services}
          clients={clients}
          staff={staff}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      )}
    </>
  )
}
