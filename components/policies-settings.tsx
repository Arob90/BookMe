'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'
import { updateSettings } from '@/app/actions/settings'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface PoliciesSettingsProps {
  initialSettings: any
  initialStrikes: any[]
}

export function PoliciesSettings({ initialSettings, initialStrikes }: PoliciesSettingsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [settings, setSettings] = useState(initialSettings)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(settings)
      toast({
        title: 'Success',
        description: 'Settings saved',
      })
      router.refresh()
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

  return (
    <div className="space-y-6">
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
                value={settings.strikeLateCancel}
                onChange={(e) =>
                  setSettings({ ...settings, strikeLateCancel: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>No Show Strike</Label>
              <Input
                type="number"
                value={settings.strikeNoShow}
                onChange={(e) =>
                  setSettings({ ...settings, strikeNoShow: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Strike Threshold</Label>
              <Input
                type="number"
                value={settings.strikeThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, strikeThreshold: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Strike Expiration (days)</Label>
              <Input
                type="number"
                value={settings.strikeExpirationDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    strikeExpirationDays: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Threshold Action</Label>
              <Select
                value={settings.strikeThresholdAction}
                onValueChange={(value) =>
                  setSettings({ ...settings, strikeThresholdAction: value })
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Strike Events</CardTitle>
        </CardHeader>
        <CardContent>
          {initialStrikes.length === 0 ? (
            <p className="text-muted-foreground">No strike events</p>
          ) : (
            <div className="space-y-4">
              {initialStrikes.slice(0, 20).map((strike) => (
                <div
                  key={strike.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {strike.client.firstName} {strike.client.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {strike.type} - {formatDateTime(strike.createdAt)}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-red-600">+{strike.delta}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
