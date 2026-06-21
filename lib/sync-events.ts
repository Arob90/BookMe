/**
 * Centralized event system for syncing data across pages
 * All pages should listen to these events and refresh when needed
 */

export type SyncEventType = 
  | 'appointment-updated'
  | 'appointment-created'
  | 'appointment-deleted'
  | 'client-updated'
  | 'client-created'
  | 'client-deleted'
  | 'payment-recorded'
  | 'service-updated'
  | 'service-created'
  | 'service-deleted'
  | 'inventory-updated'
  | 'inventory-created'
  | 'inventory-deleted'
  | 'loyalty-updated'
  | 'strike-updated'
  | 'settings-updated'
  | 'project-created'
  | 'account-request-updated'

export interface SyncEvent extends CustomEvent {
  type: SyncEventType
  data?: any
}

/**
 * Dispatch a sync event to notify all pages of data changes
 */
export function dispatchSyncEvent(type: SyncEventType, data?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(type, { detail: data }))
    // Also dispatch a generic 'data-updated' event for components that listen to all changes
    window.dispatchEvent(new CustomEvent('data-updated', { detail: { type, data } }))
  }
}

/**
 * Listen to sync events
 */
export function onSyncEvent(
  type: SyncEventType | 'data-updated',
  callback: (event: CustomEvent) => void
) {
  if (typeof window !== 'undefined') {
    window.addEventListener(type, callback as EventListener)
    return () => window.removeEventListener(type, callback as EventListener)
  }
  return () => {}
}

/**
 * Listen to multiple sync events
 */
export function onSyncEvents(
  types: SyncEventType[],
  callback: (event: CustomEvent) => void
) {
  if (typeof window !== 'undefined') {
    types.forEach(type => {
      window.addEventListener(type, callback as EventListener)
    })
    return () => {
      types.forEach(type => {
        window.removeEventListener(type, callback as EventListener)
      })
    }
  }
  return () => {}
}
