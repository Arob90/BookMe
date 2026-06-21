'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { isSuperAdmin } from '@/lib/authz'
import {
  Calendar,
  Users,
  Scissors,
  Gift,
  BarChart3,
  Package,
  TrendingUp,
  Menu,
  X,
  Kanban,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

const baseNavigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: BarChart3 },
  { name: 'Calendar', href: '/app/calendar', icon: Calendar },
  { name: 'Projects', href: '/app/projects', icon: Kanban },
  { name: 'Clients', href: '/app/clients', icon: Users },
  { name: 'Services', href: '/app/services', icon: Scissors },
  { name: 'Loyalty & Strike', href: '/app/loyalty', icon: Gift },
  { name: 'Inventory', href: '/app/inventory', icon: Package },
  { name: 'Analytics', href: '/app/analytics', icon: TrendingUp },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const showAccounts = isSuperAdmin((session?.user as { email?: string })?.email)
  const navigation: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
    ...baseNavigation,
    ...(showAccounts ? [{ name: 'Account Management', href: '/app/accounts', icon: UserPlus }] : []),
  ]

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50 glass shadow-md rounded-xl"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full glass-nav border-r border-white/40 shadow-sm transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64',
          // Mobile: slide in/out
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-white/40 px-4">
            {!isCollapsed && (
              <Link href="/app/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                <div className="h-8 w-8 rounded-lg bg-pink-500 flex items-center justify-center shadow-sm">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-pink-600">BookMeBz</h1>
              </Link>
            )}
            <div className="flex items-center gap-2">
              {/* Mobile close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
              {/* Desktop collapse button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex"
              >
                {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-pink-50 text-pink-700 border-l-4 border-pink-500 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-pink-600' : 'text-gray-500')} />
                  {!isCollapsed && <span className={isActive ? 'font-semibold' : ''}>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          {!isCollapsed && (
            <div className="border-t p-4">
              <p className="text-xs text-muted-foreground text-center">
                Powered by{' '}
                <span className="font-semibold text-pink-600">SaSo Pixel Studio</span>
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

