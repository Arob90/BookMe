'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Calendar, DollarSign, Package, Clock, Gift, UserPlus, Lightbulb, LifeBuoy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Notification } from '@/app/actions/notifications'

interface NotificationsDropdownProps {
  notifications: Notification[]
}

const notificationIcons = {
  upcoming_appointment: Calendar,
  unpaid_payment: DollarSign,
  low_inventory: Package,
  birthday: Gift,
  account_request: UserPlus,
  idea: Lightbulb,
  support_report: LifeBuoy,
}

const priorityColors = {
  high: 'bg-red-500',
  medium: 'bg-pink-500',
  low: 'bg-pink-500',
}

export function NotificationsDropdown({ notifications: initialNotifications }: NotificationsDropdownProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // Sync with parent notifications when they change
  useEffect(() => {
    if (initialNotifications && Array.isArray(initialNotifications)) {
      setNotifications(initialNotifications)
    }
  }, [initialNotifications])

  // Refresh notifications periodically (every 10 seconds) when dropdown is open
  // Also listen for payment-recorded events
  useEffect(() => {
    const refreshNotifications = () => {
      fetch('/api/notifications?t=' + Date.now()) // Add timestamp to prevent caching
        .then(res => res.json())
        .then(data => {
          if (data && data.notifications && Array.isArray(data.notifications)) {
            setNotifications(data.notifications)
          }
        })
        .catch(() => {
          // Silently fail
        })
    }

    if (isOpen) {
      // Refresh immediately when opened
      refreshNotifications()
      // Refresh every 10 seconds while open
      const interval = setInterval(refreshNotifications, 10000)
      
      // Listen for sync events
      const handleSyncEvent = () => {
        refreshNotifications()
        setTimeout(refreshNotifications, 1000) // Refresh again after 1 second
      }
      window.addEventListener('payment-recorded', handleSyncEvent)
      // Also listen to new sync events if available
      let cleanupFunctions: (() => void)[] = []
      if (typeof window !== 'undefined') {
        try {
          const { onSyncEvent } = require('@/lib/sync-events')
          cleanupFunctions = [
            onSyncEvent('payment-recorded', handleSyncEvent),
            onSyncEvent('appointment-updated', handleSyncEvent),
            onSyncEvent('client-updated', handleSyncEvent),
          ]
        } catch (e) {
          // Sync events not available, just use old events
        }
      }

      return () => {
        clearInterval(interval)
        window.removeEventListener('payment-recorded', handleSyncEvent)
        cleanupFunctions.forEach(cleanup => cleanup())
      }
    }
  }, [isOpen])

  // Ensure notifications is always an array
  const safeNotifications = Array.isArray(notifications) ? notifications : []
  const unreadCount = safeNotifications.length
  const hasHighPriority = safeNotifications.some(n => n.priority === 'high')

  // Filter notifications based on active tab
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unpaid':
        return safeNotifications.filter(n => n.type === 'unpaid_payment')
      case 'stock':
        return safeNotifications.filter(n => n.type === 'low_inventory')
      case 'bday':
        return safeNotifications.filter(n => n.type === 'birthday')
      default:
        return safeNotifications
    }
  }

  const filteredNotifications = getFilteredNotifications()

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link)
      setIsOpen(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 min-h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full text-xs font-bold z-10 shadow-md border-2 border-white ${
              hasHighPriority ? 'bg-red-500' : 'bg-pink-500'
            } text-white`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 border-gray-200 shadow-lg bg-white" align="end">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-pink-500 text-white border-0 text-xs font-semibold">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8 bg-gray-100 p-0.5 rounded-md">
              <TabsTrigger 
                value="all" 
                className="text-xs px-2 py-1 rounded-sm data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="unpaid" 
                className="text-xs px-2 py-1 rounded-sm data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm"
              >
                Unpaid
              </TabsTrigger>
              <TabsTrigger 
                value="stock" 
                className="text-xs px-2 py-1 rounded-sm data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm"
              >
                Stock
              </TabsTrigger>
              <TabsTrigger 
                value="bday" 
                className="text-xs px-2 py-1 rounded-sm data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm"
              >
                Bday
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="max-h-[400px] overflow-y-auto bg-white">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white">
              <Bell className="h-12 w-12 text-pink-300 mb-2" />
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer transition-colors border-l-4 ${
                      notification.type === 'upcoming_appointment' 
                        ? 'bg-pink-50 border-l-pink-500 hover:bg-pink-100'
                        : notification.type === 'unpaid_payment'
                        ? 'bg-pink-50 border-l-pink-500 hover:bg-pink-100'
                        : notification.type === 'birthday'
                        ? 'bg-yellow-50 border-l-yellow-500 hover:bg-yellow-100'
                        : notification.type === 'account_request'
                        ? 'bg-violet-50 border-l-violet-600 hover:bg-violet-100'
                        : 'bg-red-50 border-l-red-500 hover:bg-red-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        notification.type === 'upcoming_appointment' 
                          ? 'bg-pink-100 text-pink-600'
                          : notification.type === 'unpaid_payment'
                          ? 'bg-pink-100 text-pink-600'
                          : notification.type === 'birthday'
                          ? 'bg-yellow-100 text-yellow-600'
                          : notification.type === 'account_request'
                          ? 'bg-violet-100 text-violet-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            notification.priority === 'high' 
                              ? 'bg-red-500'
                              : notification.priority === 'medium'
                              ? 'bg-pink-500'
                              : 'bg-pink-500'
                          }`}></span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {filteredNotifications.length > 0 && (
          <div className="p-2 border-t border-gray-200 bg-white">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-700"
              onClick={() => {
                // Could implement "mark all as read" functionality here
                setIsOpen(false)
              }}
            >
              Close
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
