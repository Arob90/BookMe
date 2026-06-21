'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

interface ReportsDashboardProps {
  revenue: any
  topClients: any[]
  noShows: any
}

export function ReportsDashboard({ revenue, topClients, noShows }: ReportsDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(revenue.totalRevenue)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {revenue.appointmentCount} appointments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(revenue.averageTicket)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              No Shows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{noShows.count}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Clients by Spend</CardTitle>
        </CardHeader>
        <CardContent>
          {topClients.length === 0 ? (
            <p className="text-muted-foreground">No data</p>
          ) : (
            <div className="space-y-4">
              {topClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/app/clients/${client.id}`}
                  className="flex items-center justify-between border-b pb-4 last:border-0 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {client.totalVisits} visits
                    </div>
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(client.totalSpend)}
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
