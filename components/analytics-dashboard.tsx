'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  XCircle,
  CheckCircle,
  Clock,
  PieChart,
  BarChart3,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface AnalyticsDashboardProps {
  monthlySales: any
  appointmentStats: any
  clientGrowth: any
  topServices: any[]
  monthlyComparison: any[]
  peakTimes: any
}

const ACCENT_STROKE = 'rgb(var(--app-accent-rgb))'
const COLORS = [ACCENT_STROKE, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', ACCENT_STROKE, '#06b6d4', '#84cc16']

export function AnalyticsDashboard({
  monthlySales,
  appointmentStats,
  clientGrowth,
  topServices,
  monthlyComparison,
  peakTimes,
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'month' | 'year'>('month')

  // Prepare data for charts - ensure all dates in interval are included
  const salesChartData = (() => {
    // If we have interval dates, use them to create a complete dataset
    if (monthlySales.intervalDates && monthlySales.intervalDates.length > 0) {
      return monthlySales.intervalDates.map((date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const data = monthlySales.salesByInterval[dateStr] || { revenue: 0, count: 0 }
        return {
          date: format(date, 'MMM d'),
          revenue: data.revenue || 0,
          appointments: data.count || 0,
        }
      })
    }
    
    // Fallback: use existing data if intervalDates not available
    const entries = Object.entries(monthlySales.salesByInterval || {})
    if (entries.length === 0) {
      // Return empty data structure if no data
      return []
    }
    
    return entries
      .map(([date, data]: [string, any]) => ({
        date: date.split('-')[2] || date,
        revenue: data?.revenue || 0,
        appointments: data?.count || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  })()

  const statusChartData = [
    { name: 'Completed', value: appointmentStats.completed || 0, color: '#10b981' },
    { name: 'Cancelled', value: appointmentStats.cancelled || 0, color: '#ef4444' },
    { name: 'No Show', value: appointmentStats.noShow || 0, color: '#f59e0b' },
    { name: 'Booked', value: appointmentStats.booked || 0, color: ACCENT_STROKE },
    { name: 'Confirmed', value: appointmentStats.confirmed || 0, color: '#8b5cf6' },
  ].filter(item => item.value > 0)

  const clientGrowthData = Object.entries(clientGrowth.growthByMonth).map(([month, count]) => ({
    month: clientGrowth.months[Object.keys(clientGrowth.growthByMonth).indexOf(month)] || month,
    clients: count as number,
  }))

  const topServicesData = topServices.slice(0, 8).map((service, index) => ({
    name: service.name.length > 15 ? service.name.substring(0, 15) + '...' : service.name,
    revenue: service.revenue,
    count: service.count,
    color: COLORS[index % COLORS.length],
  }))

  const monthlyComparisonData = monthlyComparison.map((month) => ({
    month: month.label,
    revenue: month.revenue,
    appointments: month.count,
  }))

  const peakMonthsData = Object.entries(peakTimes.byMonth)
    .map(([month, revenue]) => ({
      month,
      revenue: revenue as number,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const peakDaysData = [
    { day: 'Sun', revenue: peakTimes.byDayOfWeek['Sunday'] || 0 },
    { day: 'Mon', revenue: peakTimes.byDayOfWeek['Monday'] || 0 },
    { day: 'Tue', revenue: peakTimes.byDayOfWeek['Tuesday'] || 0 },
    { day: 'Wed', revenue: peakTimes.byDayOfWeek['Wednesday'] || 0 },
    { day: 'Thu', revenue: peakTimes.byDayOfWeek['Thursday'] || 0 },
    { day: 'Fri', revenue: peakTimes.byDayOfWeek['Friday'] || 0 },
    { day: 'Sat', revenue: peakTimes.byDayOfWeek['Saturday'] || 0 },
  ]

  const peakHoursData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
    revenue: peakTimes.byHour[i] || 0,
  })).filter(item => item.revenue > 0)

  const completionRate = appointmentStats.total > 0
    ? ((appointmentStats.completed / appointmentStats.total) * 100).toFixed(1)
    : '0'
  const cancellationRate = appointmentStats.total > 0
    ? ((appointmentStats.cancelled / appointmentStats.total) * 100).toFixed(1)
    : '0'
  const noShowRate = appointmentStats.total > 0
    ? ((appointmentStats.noShow / appointmentStats.total) * 100).toFixed(1)
    : '0'

  // Use consistent data - all from monthlySales for current month
  const totalRevenue = monthlySales.totalRevenue || 0
  const averageValue = monthlySales.averageValue || 0

  return (
    <div className="flex flex-col space-y-4 pb-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 border-teal-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-sm font-medium text-teal-800">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-700">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-teal-600/80 mt-1">This {timeRange === 'month' ? 'month' : 'year'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 border-pink-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-sm font-medium text-pink-800">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-700">{appointmentStats.total}</div>
            <p className="text-xs text-pink-600/80 mt-1">{appointmentStats.completed} completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 border-purple-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-sm font-medium text-purple-800">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{formatCurrency(averageValue)}</div>
            <p className="text-xs text-purple-600/80 mt-1">Per appointment</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 border-pink-200/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-5">
            <CardTitle className="text-sm font-medium text-pink-800">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-700">{completionRate}%</div>
            <p className="text-xs text-pink-600/80 mt-1">Success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-pink-500" />
              Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesChartData.length === 0 || salesChartData.every((d: { date: string; revenue: number; appointments: number }) => d.revenue === 0) ? (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No revenue data available</p>
                  <p className="text-xs mt-1">Complete appointments to see revenue over time</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill={ACCENT_STROKE} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Appointment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-500" />
              Appointment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                {/* Status Legend with all statuses */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">All Statuses:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Completed: {appointmentStats.completed || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Cancelled: {appointmentStats.cancelled || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>No Show: {appointmentStats.noShow || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ACCENT_STROKE }}></div>
                      <span>Booked: {appointmentStats.booked || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
                      <span>Confirmed: {appointmentStats.confirmed || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400">
                <div className="text-center">
                  <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No appointment data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Client Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={clientGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="clients" stroke="#10b981" strokeWidth={2} name="Total Clients" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Top Services by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topServicesData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-gray-400">
                <div className="text-center">
                  <Activity className="mx-auto mb-2 h-12 w-12 opacity-50" />
                  <p className="text-sm">No service revenue yet</p>
                  <p className="mt-1 text-xs">Confirmed or completed visits appear here</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topServicesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#f59e0b" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-pink-500" />
              Last 12 Months Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={ACCENT_STROKE}
                  strokeWidth={3}
                  dot={{ fill: ACCENT_STROKE, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Days */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              Revenue by Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={peakDaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Peak Months */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-green-800">
              <Activity className="h-4 w-4" />
              Top Performing Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {peakMonthsData.slice(0, 5).map((month, index) => (
                <div key={month.month} className="flex items-center justify-between p-2 rounded-lg bg-white/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-green-600">#{index + 1}</span>
                    <span className="text-sm font-medium">{month.month}</span>
                  </div>
                  <span className="font-bold text-green-700">{formatCurrency(month.revenue)}</span>
                </div>
              ))}
              {peakMonthsData.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-pink-800">
              <Clock className="h-4 w-4" />
              Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {peakHoursData.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-gray-400">
                <div className="text-center text-sm">No peak-hour revenue yet</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={peakHoursData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="label" type="category" width={60} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill={ACCENT_STROKE} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Rates */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
              <PieChart className="h-4 w-4" />
              Appointment Rates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Completion</span>
                </div>
                <span className="font-bold text-green-600 text-lg">{completionRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Cancellation</span>
                </div>
                <span className="font-bold text-red-600 text-lg">{cancellationRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">No Show</span>
                </div>
                <span className="font-bold text-orange-600 text-lg">{noShowRate}%</span>
              </div>
              <div className="mt-4 pt-3 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-purple-700">Total Appointments</span>
                  <span className="font-bold text-purple-800">{appointmentStats.total}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
