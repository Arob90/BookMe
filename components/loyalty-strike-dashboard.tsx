'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDateTime, formatCurrency, getInitials } from '@/lib/utils'
import { updateSettings } from '@/app/actions/settings'
import { backfillLoyaltyPoints, recalculateLoyaltyBalances } from '@/app/actions/loyalty'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Sparkles, Award, AlertTriangle, Shield, Trophy, Settings } from 'lucide-react'
import Link from 'next/link'
import { getClient } from '@/app/actions/clients'
import { getClientLoyaltyTransactions } from '@/app/actions/loyalty'

interface LoyaltyStrikeDashboardProps {
  loyaltyAccounts: any[]
  strikeEvents: any[]
  settings: any
}

export function LoyaltyStrikeDashboard({ loyaltyAccounts, strikeEvents, settings }: LoyaltyStrikeDashboardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [allSettings, setAllSettings] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [selectedStrikeClient, setSelectedStrikeClient] = useState<any>(null)
  const [isStrikeModalOpen, setIsStrikeModalOpen] = useState(false)
  const [loadingStrikeClient, setLoadingStrikeClient] = useState(false)
  const [selectedLoyaltyClient, setSelectedLoyaltyClient] = useState<any>(null)
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<any[]>([])
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false)
  const [loadingLoyaltyClient, setLoadingLoyaltyClient] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(allSettings)
      toast({
        title: 'Success',
        description: 'Settings saved',
      })
      router.refresh()
      setIsSettingsDialogOpen(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBackfill = async () => {
    setIsBackfilling(true)
    try {
      const result = await backfillLoyaltyPoints()
      toast({
        title: 'Success',
        description: result.message,
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to backfill loyalty points',
        variant: 'destructive',
      })
    } finally {
      setIsBackfilling(false)
    }
  }

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      const result = await recalculateLoyaltyBalances()
      toast({
        title: 'Success',
        description: result.message,
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to recalculate balances',
        variant: 'destructive',
      })
    } finally {
      setIsRecalculating(false)
    }
  }

  // Get top clients by points
  const topLoyaltyClients = loyaltyAccounts
    .sort((a, b) => b.pointsBalance - a.pointsBalance)
    .slice(0, 10)

  // Get clients with most strikes
  const strikesByClient = strikeEvents.reduce((acc: any, strike: any) => {
    const clientId = strike.clientId
    if (!acc[clientId]) {
      acc[clientId] = {
        client: strike.client,
        totalStrikes: 0,
        events: [],
      }
    }
    acc[clientId].totalStrikes += strike.delta
    acc[clientId].events.push(strike)
    return acc
  }, {})

  const topStrikeClients = Object.values(strikesByClient)
    .sort((a: any, b: any) => b.totalStrikes - a.totalStrikes)
    .slice(0, 10) as any[]

  const handleStrikeClientClick = async (clientId: string) => {
    setLoadingStrikeClient(true)
    try {
      const client = await getClient(clientId)
      setSelectedStrikeClient(client)
      setIsStrikeModalOpen(true)
    } catch (error) {
      console.error('Failed to load client strikes:', error)
      toast({
        title: 'Error',
        description: 'Failed to load client strike history',
        variant: 'destructive',
      })
    } finally {
      setLoadingStrikeClient(false)
    }
  }

  return (
    <div className="flex flex-col h-full space-y-2 overflow-hidden">
      {/* Header with Tools Icon */}
      <div className="flex items-center justify-end flex-shrink-0">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSettingsDialogOpen(true)}
          className="h-9 w-9"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="loyalty" className="flex flex-col h-full space-y-2 overflow-hidden">
        <TabsList className="flex-shrink-0">
          <TabsTrigger value="loyalty" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Top Clients
          </TabsTrigger>
          <TabsTrigger value="strikes" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Strikes
          </TabsTrigger>
        </TabsList>

      <TabsContent value="loyalty" className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full gap-2">
          {/* Top Clients by Points - Main Focus */}
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Clients by Points
              </CardTitle>
              <CardDescription>Your best clients ranked by loyalty points</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {topLoyaltyClients.length === 0 ? (
                <p className="text-muted-foreground text-sm">No loyalty accounts yet</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {topLoyaltyClients.map((account, index) => {
                  const isTopThree = index < 3
                  const rankColors = [
                    { bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600', border: 'border-yellow-400', text: 'text-yellow-900', ring: 'ring-yellow-300', medal: '🥇' },
                    { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', border: 'border-gray-400', text: 'text-gray-900', ring: 'ring-gray-300', medal: '🥈' },
                    { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', border: 'border-orange-400', text: 'text-orange-900', ring: 'ring-orange-300', medal: '🥉' },
                  ]
                  const rankColor = isTopThree && rankColors[index] ? rankColors[index] : null

                  return (
                    <div
                      key={account.id}
                      onClick={() => {
                        setLoadingLoyaltyClient(true)
                        Promise.all([
                          getClient(account.clientId),
                          getClientLoyaltyTransactions(account.clientId)
                        ])
                          .then(([client, transactions]) => {
                            setSelectedLoyaltyClient(client)
                            setLoyaltyTransactions(transactions)
                            setIsLoyaltyModalOpen(true)
                          })
                          .catch((error) => {
                            console.error('Failed to load client loyalty data:', error)
                          })
                          .finally(() => {
                            setLoadingLoyaltyClient(false)
                          })
                      }}
                      className={`group relative overflow-hidden flex items-center gap-3 p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-lg cursor-pointer ${
                        isTopThree && rankColor
                          ? `${rankColor.border} ${rankColor.bg} ${rankColor.text} shadow-md hover:shadow-xl`
                          : 'border-gray-200 hover:bg-gray-50 bg-gradient-to-br from-white to-gray-50/50'
                      }`}
                    >
                      {/* Animated confetti for top 3 */}
                      {isTopThree && (
                        <>
                          <div className="absolute top-0 left-0 text-sm animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.5s' }}>🎉</div>
                          <div className="absolute top-0 right-0 text-xs animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '1.7s' }}>✨</div>
                          <div className="absolute bottom-0 left-0 text-xs animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '1.4s' }}>🎊</div>
                          <div className="absolute bottom-0 right-0 text-xs animate-bounce" style={{ animationDelay: '0.9s', animationDuration: '1.6s' }}>⭐</div>
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-xs animate-pulse" style={{ animationDelay: '0.2s' }}>💫</div>
                          <div className="absolute top-1 left-1/4 text-xs animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.3s' }}>🌟</div>
                          <div className="absolute top-1 right-1/4 text-xs animate-bounce" style={{ animationDelay: '0.7s', animationDuration: '1.5s' }}>🎈</div>
                        </>
                      )}

                      {/* Rank Badge */}
                      <div className="flex-shrink-0 relative z-10">
                        {isTopThree && rankColor ? (
                          <div className={`w-8 h-8 rounded-full ${rankColor.bg} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                            {rankColor.medal}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-xs">
                            #{index + 1}
                          </div>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative z-10">
                        <Avatar className={`h-10 w-10 ${isTopThree && rankColor ? `ring-2 ${rankColor.ring} ring-4 shadow-md` : 'ring-2 ring-white shadow-sm'}`}>
                          <AvatarFallback className={`text-xs ${isTopThree && rankColor ? rankColor.bg + ' text-white font-bold' : 'font-semibold'}`}>
                            {getInitials(account.client.firstName, account.client.lastName)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      {/* Client Info */}
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className={`font-medium text-sm truncate ${isTopThree ? 'font-bold' : 'font-semibold'}`}>
                          {account.client.firstName} {account.client.lastName}
                        </div>
                        <div className={`text-xs truncate ${isTopThree ? 'opacity-90' : 'text-muted-foreground'}`}>
                          {account.client.phone || 'No phone'}
                        </div>
                      </div>

                      {/* Points */}
                      <div className={`flex flex-col items-end relative z-10 ${isTopThree ? 'text-white' : ''}`}>
                        <div className={`flex items-center gap-1 text-base font-bold ${isTopThree ? 'text-white' : 'text-pink-600'}`}>
                          <Sparkles className={`h-4 w-4 ${isTopThree ? 'animate-pulse' : ''}`} />
                          {account.pointsBalance}
                        </div>
                        {!isTopThree && <div className="text-xs text-muted-foreground">points</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

          {/* All Clients Compact View */}
          {loyaltyAccounts.length > 10 && (
            <Card className="flex flex-col flex-1 min-h-0 shadow-sm border-gray-200">
              <CardHeader className="flex-shrink-0 border-b border-gray-200 bg-white">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Award className="h-4 w-4 text-pink-500" />
                  All Clients ({loyaltyAccounts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {loyaltyAccounts.map((account) => (
                    <Link
                      key={account.id}
                      href={`/app/clients/${account.clientId}`}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors border"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {getInitials(account.client.firstName, account.client.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">
                          {account.client.firstName} {account.client.lastName}
                        </div>
                        <div className="text-xs font-semibold text-pink-600">
                          {account.pointsBalance} pts
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="strikes" className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full gap-2">
          {/* Clients with Most Strikes */}
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Clients with Strikes
              </CardTitle>
              <CardDescription>Clients ordered by total strikes</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
            {topStrikeClients.length === 0 ? (
              <p className="text-muted-foreground text-sm">No strike events</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {topStrikeClients.map((item: any) => (
                  <div
                    key={item.client.id}
                    onClick={() => handleStrikeClientClick(item.client.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-red-100 hover:border-red-300 hover:shadow-md transition-all bg-gradient-to-br from-white to-red-50/30 cursor-pointer"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                      <AvatarFallback className="text-xs font-semibold bg-red-100 text-red-700">
                        {getInitials(item.client.firstName, item.client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {item.client.firstName} {item.client.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.client.phone || 'No phone'}
                      </div>
                    </div>
                    <Badge variant="destructive" className="font-bold text-sm px-2.5 py-1">
                      {item.totalStrikes}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

          {/* Recent Strike Events */}
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Recent Strike Events</CardTitle>
              <CardDescription>Latest strike events across all clients</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto">
              {strikeEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No strike events</p>
              ) : (
                <div className="space-y-2">
                  {strikeEvents.slice(0, 30).map((strike) => (
                    <div
                      key={strike.id}
                      onClick={() => handleStrikeClientClick(strike.clientId)}
                      className="flex items-center justify-between p-2.5 rounded-md border hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(strike.client.firstName, strike.client.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {strike.client.firstName} {strike.client.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {strike.type} • {formatDateTime(strike.createdAt)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive" className="ml-2 flex-shrink-0">+{strike.delta}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Loyalty & Strike Settings
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="loyalty" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="loyalty" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Loyalty Settings
              </TabsTrigger>
              <TabsTrigger value="strikes" className="gap-2">
                <Shield className="h-4 w-4" />
                Strike Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="loyalty" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Loyalty Program</CardTitle>
                  <CardDescription>Configure how customers earn loyalty points</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Earn Mode</Label>
                    <Select
                      value={allSettings.loyaltyEarnMode}
                      onValueChange={(value) =>
                        setAllSettings({ ...allSettings, loyaltyEarnMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PER_DOLLAR">Per Dollar</SelectItem>
                        <SelectItem value="PER_VISIT">Per Visit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {allSettings.loyaltyEarnMode === 'PER_DOLLAR' && (
                    <div>
                      <Label>Points Per Dollar</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={allSettings.loyaltyPointsPerDollar || ''}
                        onChange={(e) =>
                          setAllSettings({
                            ...allSettings,
                            loyaltyPointsPerDollar: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                  {allSettings.loyaltyEarnMode === 'PER_VISIT' && (
                    <div>
                      <Label>Points Per Visit</Label>
                      <Input
                        type="number"
                        value={allSettings.loyaltyPointsPerVisit || ''}
                        onChange={(e) =>
                          setAllSettings({
                            ...allSettings,
                            loyaltyPointsPerVisit: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Loyalty Tools</CardTitle>
                  <CardDescription>Fix loyalty points for existing appointments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Some clients may have visits but no points if appointments were completed before loyalty was configured, 
                      or if they were created directly as COMPLETED.
                    </p>
                    <Button 
                      onClick={handleBackfill} 
                      disabled={isBackfilling}
                      variant="outline"
                      className="w-full"
                    >
                      {isBackfilling ? 'Processing...' : 'Backfill Points for Completed Appointments'}
                    </Button>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Recalculate all loyalty account balances based on transaction history (fixes sync issues).
                    </p>
                    <Button 
                      onClick={handleRecalculate} 
                      disabled={isRecalculating}
                      variant="outline"
                      className="w-full"
                    >
                      {isRecalculating ? 'Recalculating...' : 'Recalculate All Balances'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strikes" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Strike Rules</CardTitle>
                  <CardDescription>
                    Configure how strikes are assigned and managed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Late Cancel Strike</Label>
                      <Input
                        type="number"
                        value={allSettings.strikeLateCancel}
                        onChange={(e) =>
                          setAllSettings({ ...allSettings, strikeLateCancel: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label>No Show Strike</Label>
                      <Input
                        type="number"
                        value={allSettings.strikeNoShow}
                        onChange={(e) =>
                          setAllSettings({ ...allSettings, strikeNoShow: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label>Strike Threshold</Label>
                      <Input
                        type="number"
                        value={allSettings.strikeThreshold}
                        onChange={(e) =>
                          setAllSettings({ ...allSettings, strikeThreshold: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <Label>Strike Expiration (days)</Label>
                      <Input
                        type="number"
                        value={allSettings.strikeExpirationDays}
                        onChange={(e) =>
                          setAllSettings({
                            ...allSettings,
                            strikeExpirationDays: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Threshold Action</Label>
                      <Select
                        value={allSettings.strikeThresholdAction}
                        onValueChange={(value) =>
                          setAllSettings({ ...allSettings, strikeThresholdAction: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REQUIRES_DEPOSIT">Requires Deposit</SelectItem>
                          <SelectItem value="REQUIRES_APPROVAL">Requires Approval</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Strike History Modal */}
      <Dialog open={isStrikeModalOpen} onOpenChange={setIsStrikeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Strike History
              {selectedStrikeClient && (
                <span className="text-base font-normal text-muted-foreground">
                  - {selectedStrikeClient.firstName} {selectedStrikeClient.lastName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingStrikeClient ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading strike history...</p>
            </div>
          ) : selectedStrikeClient && selectedStrikeClient.strikeEvents ? (
            <div className="space-y-3">
              {selectedStrikeClient.strikeEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No strikes recorded for this client
                </p>
              ) : (
                selectedStrikeClient.strikeEvents.flatMap((strike: any) => {
                  // Expand strikes with delta > 1 into individual entries
                  const expandedStrikes = []
                  for (let i = 0; i < strike.delta; i++) {
                    expandedStrikes.push(
                      <div
                        key={`${strike.id}-${i}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <Badge variant="destructive" className="font-semibold">
                              {strike.type === 'NO_SHOW' ? 'No Show' :
                               strike.type === 'LATE_CANCEL' ? 'Late Cancel' :
                               strike.type === 'MANUAL' ? 'Manual' : strike.type}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDateTime(strike.createdAt)}
                            </div>
                            {strike.appointment && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Appointment: {formatDateTime(strike.appointment.startAt)}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="destructive" className="font-bold">+1</Badge>
                      </div>
                    )
                  }
                  return expandedStrikes
                })
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Loyalty Points History Modal */}
      <Dialog open={isLoyaltyModalOpen} onOpenChange={setIsLoyaltyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Points History
              {selectedLoyaltyClient && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {selectedLoyaltyClient.firstName} {selectedLoyaltyClient.lastName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {loadingLoyaltyClient ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground text-sm">Loading points history...</p>
            </div>
          ) : selectedLoyaltyClient && loyaltyTransactions ? (
            <div className="space-y-2">
              {loyaltyTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No points transactions recorded for this client
                </p>
              ) : (
                loyaltyTransactions.map((transaction: any) => {
                  const services = transaction.appointment?.appointmentServices?.map((as: any) => as.service.name).join(', ') || null
                  const isPositive = transaction.deltaPoints > 0
                  
                  return (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                        isPositive
                          ? 'border-green-100 bg-green-50/50 hover:bg-green-50'
                          : 'border-red-100 bg-red-50/50 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <Badge 
                            variant={isPositive ? "default" : "destructive"} 
                            className={`text-xs font-semibold ${
                              isPositive ? 'bg-green-600 hover:bg-green-700' : ''
                            }`}
                          >
                            {isPositive ? '+' : ''}{transaction.deltaPoints} pts
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {transaction.reason}
                          </div>
                          {services && (
                            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {services}
                            </div>
                          )}
                          {transaction.appointment && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDateTime(transaction.appointment.startAt)}
                            </div>
                          )}
                          {!transaction.appointment && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDateTime(transaction.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
