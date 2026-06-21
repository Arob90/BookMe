'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onSyncEvent, SyncEventType } from '@/lib/sync-events'

interface SyncListenerProps {
  pages?: string[] // Pages to refresh when data changes
  listenTo?: SyncEventType[] // Specific events to listen to, or all if not specified
}

/**
 * Component that listens to sync events and refreshes the router
 * Add this to page layouts to automatically sync data
 */
export function SyncListener({ pages, listenTo }: SyncListenerProps) {
  const router = useRouter()

  useEffect(() => {
    const handleSync = (event: CustomEvent) => {
      // Refresh the router to update all server components
      router.refresh()
    }

    if (listenTo && listenTo.length > 0) {
      // Listen to specific events
      const cleanupFunctions = listenTo.map(type => 
        onSyncEvent(type, handleSync)
      )
      
      return () => {
        cleanupFunctions.forEach(cleanup => cleanup())
      }
    } else {
      // Listen to all data updates
      return onSyncEvent('data-updated', handleSync)
    }
  }, [router, listenTo])

  return null
}
