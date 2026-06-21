'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClientProfile } from '@/components/client-profile'
import { getClient } from '@/app/actions/clients'

interface ClientModalProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientUpdated?: () => void
  clients?: any[]
  services?: any[]
  staff?: any[]
  associatedClients?: any[]
}

export function ClientModal({
  client,
  open,
  onOpenChange,
  onClientUpdated,
  clients = [],
  services = [],
  staff = [],
  associatedClients = [],
}: ClientModalProps) {
  const [currentClient, setCurrentClient] = useState(client)

  useEffect(() => {
    // Ensure companies can display their associated individuals even if the server payload
    // doesn't include `contacts` yet.
    if (client?.type === 'COMPANY' && Array.isArray(associatedClients) && associatedClients.length > 0) {
      setCurrentClient({ ...client, contacts: client.contacts ?? associatedClients })
    } else {
      setCurrentClient(client)
    }
  }, [client])

  if (!currentClient) return null

  const handleClientUpdated = async () => {
    // Refetch client data to get updated notes
    try {
      const updatedClient = await getClient(currentClient.id)
      if (updatedClient?.type === 'COMPANY' && Array.isArray(associatedClients) && associatedClients.length > 0) {
        setCurrentClient({ ...updatedClient, contacts: (updatedClient as any).contacts ?? associatedClients })
      } else {
        setCurrentClient(updatedClient)
      }
    } catch (error) {
      console.error('Failed to refresh client data:', error)
    }
    
    if (onClientUpdated) {
      onClientUpdated()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client Profile</DialogTitle>
        </DialogHeader>
        <ClientProfile client={currentClient} onClientUpdated={handleClientUpdated} clients={clients} services={services} staff={staff} />
      </DialogContent>
    </Dialog>
  )
}
