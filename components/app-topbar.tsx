'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, Plus, MoreVertical, Bell } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { ProfileModal } from '@/components/user-profile-modal'
import { UserAvatar } from '@/components/user-avatar'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { PendingApprovalsDropdown } from '@/components/pending-approvals-dropdown'
import {
  PendingAccountRequestsDropdown,
  type PendingAccountRequestSummary,
} from '@/components/pending-account-requests-dropdown'
import { Notification } from '@/app/actions/notifications'
import { onSyncEvent } from '@/lib/sync-events'

interface AppTopbarProps {
  title: string
  actionLabel?: string
  actionHref?: string
}

export function AppTopbar({ title, actionLabel, actionHref }: AppTopbarProps) {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [pendingAccountRequests, setPendingAccountRequests] = useState<{
    visible: boolean
    requests: PendingAccountRequestSummary[]
  }>({ visible: false, requests: [] })

  const fetchUserProfile = () => {
    if (session?.user?.id) {
      // Fetch user name and email from profile with cache-busting
      fetch(`/api/user/profile?userId=${session.user.id}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data.userName) {
            setUserName(data.userName)
          }
          if (data.email) {
            setUserEmail(data.email)
          }
        })
        .catch(() => {
          // Silently fail
        })
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [session?.user?.id])

  // Refresh profile when modal closes (in case profile was updated)
  useEffect(() => {
    if (!isProfileModalOpen && session?.user?.id) {
      // Small delay to ensure server has processed the update
      const timer = setTimeout(() => {
        fetchUserProfile()
        // Also update the session to refresh the email in the JWT token
        updateSession()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isProfileModalOpen, session?.user?.id, updateSession])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = () => {
      fetch('/api/notifications?t=' + Date.now()) // Add timestamp to prevent caching
        .then(res => {
          if (!res.ok) {
            console.error('Failed to fetch notifications:', res.status)
            return
          }
          return res.json()
        })
        .then(data => {
          if (data && data.notifications && Array.isArray(data.notifications)) {
            console.log('Notifications fetched:', data.notifications.length)
            setNotifications(data.notifications)
          } else if (data && data.error) {
            console.error('Notification error:', data.error)
          } else {
            // Ensure we always have an array
            setNotifications([])
          }
        })
        .catch((error) => {
          console.error('Error fetching notifications:', error)
        })
    }

    // Fetch immediately
    fetchNotifications()
    // Refresh every 15 seconds (more frequent)
    const interval = setInterval(fetchNotifications, 15000)
    
    // Listen for sync events to refresh notifications immediately
    const handleSyncEvent = () => {
      // Refresh immediately, then again after a short delay to ensure server has processed
      fetchNotifications()
      setTimeout(fetchNotifications, 1000)
      setTimeout(fetchNotifications, 2000) // Double-check after 2 seconds
    }
    // Listen to both old event name (for backward compatibility) and new sync events
    window.addEventListener('payment-recorded', handleSyncEvent)
    const cleanup1 = onSyncEvent('payment-recorded', handleSyncEvent)
    const cleanup2 = onSyncEvent('appointment-updated', handleSyncEvent)
    const cleanup3 = onSyncEvent('client-updated', handleSyncEvent)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('payment-recorded', handleSyncEvent)
      cleanup1()
      cleanup2()
      cleanup3()
    }
  }, [])

  // Fetch pending approvals
  useEffect(() => {
    const fetchPendingApprovals = () => {
      fetch('/api/pending-approvals?t=' + Date.now())
        .then(res => {
          if (!res.ok) {
            console.error('Failed to fetch pending approvals:', res.status)
            return
          }
          return res.json()
        })
        .then(data => {
          if (data && data.approvals && Array.isArray(data.approvals)) {
            setPendingApprovals(data.approvals)
          } else {
            setPendingApprovals([])
          }
        })
        .catch((error) => {
          console.error('Error fetching pending approvals:', error)
        })
    }

    // Fetch immediately
    fetchPendingApprovals()
    // Refresh every 15 seconds
    const interval = setInterval(fetchPendingApprovals, 15000)
    
    // Listen for appointment status changes
    const handleAppointmentUpdated = () => {
      fetchPendingApprovals()
      setTimeout(fetchPendingApprovals, 1000)
    }
    // Listen to both old event name and new sync events
    window.addEventListener('appointment-updated', handleAppointmentUpdated)
    const cleanup1 = onSyncEvent('appointment-updated', handleAppointmentUpdated)
    const cleanup2 = onSyncEvent('appointment-created', handleAppointmentUpdated)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('appointment-updated', handleAppointmentUpdated)
      cleanup1()
      cleanup2()
    }
  }, [])

  const fetchPendingAccountRequests = useCallback(() => {
    fetch('/api/pending-account-requests?t=' + Date.now())
      .then((res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (data?.visible) {
          setPendingAccountRequests({
            visible: true,
            requests: Array.isArray(data.requests) ? data.requests : [],
          })
        } else {
          setPendingAccountRequests({ visible: false, requests: [] })
        }
      })
      .catch(() => {
        setPendingAccountRequests({ visible: false, requests: [] })
      })
  }, [])

  // Pending account requests (super admin only — API returns visible: false otherwise)
  useEffect(() => {
    fetchPendingAccountRequests()
    const interval = setInterval(fetchPendingAccountRequests, 15000)
    const cleanup = onSyncEvent('account-request-updated', () => {
      fetchPendingAccountRequests()
      setTimeout(fetchPendingAccountRequests, 500)
    })

    return () => {
      clearInterval(interval)
      cleanup()
    }
  }, [fetchPendingAccountRequests])

  return (
    <header className="flex-shrink-0 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b border-white/40 glass-nav shadow-sm px-3 sm:px-6">
      <h1 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 truncate flex-1 pl-10 lg:pl-0">{title}</h1>
      
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-48 lg:w-64 pl-9"
          />
        </div>

        {/* Action Button */}
        {actionLabel && actionHref && (
          <Button asChild className="gap-2 text-xs sm:text-sm">
            <Link href={actionHref}>
              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{actionLabel}</span>
            </Link>
          </Button>
        )}

        {/* Pending Approvals */}
        <PendingApprovalsDropdown 
          approvals={pendingApprovals} 
          onRefresh={() => {
            // Trigger refresh
            window.dispatchEvent(new Event('appointment-updated'))
          }}
        />

        {pendingAccountRequests.visible && (
          <PendingAccountRequestsDropdown
            requests={pendingAccountRequests.requests}
            onRefresh={fetchPendingAccountRequests}
          />
        )}

        {/* Notifications */}
        <NotificationsDropdown notifications={notifications} />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <UserAvatar userId={session?.user?.id || ''} email={session?.user?.email || ''} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {userEmail || session?.user?.email || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userName || session?.user?.role || 'ADMIN'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/app/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-red-600"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Modal */}
        {session?.user?.id && (
          <ProfileModal
            open={isProfileModalOpen}
            onOpenChange={setIsProfileModalOpen}
            userId={session.user.id}
            onProfileUpdated={() => {
              // Refresh user profile data when profile is updated
              fetchUserProfile()
              // Also update the session to refresh the email
              updateSession()
            }}
          />
        )}
      </div>
    </header>
  )
}

