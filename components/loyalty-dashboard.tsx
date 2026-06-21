'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import Link from 'next/link'

interface LoyaltyDashboardProps {
  initialAccounts: any[]
}

export function LoyaltyDashboard({ initialAccounts }: LoyaltyDashboardProps) {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b border-gray-200 bg-white">
          <CardTitle className="text-lg font-semibold text-gray-800">Top Loyalty Points</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {initialAccounts.length === 0 ? (
            <p className="text-muted-foreground">No loyalty accounts yet</p>
          ) : (
            <div className="space-y-2 sm:space-y-4">
              {initialAccounts.slice(0, 10).map((account) => (
                <Link
                  key={account.id}
                  href={`/app/clients/${account.clientId}`}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm transition-all"
                >
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                    <AvatarFallback className="text-sm sm:text-base">
                      {getInitials(account.client.firstName, account.client.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {account.client.firstName} {account.client.lastName}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">
                      {account.client.email}
                    </div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-pink-600 whitespace-nowrap">
                    {account.pointsBalance} pts
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
