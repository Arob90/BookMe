'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, Mail, MessageSquare, CalendarCheck } from 'lucide-react'
import { getSettings, updateNotificationSettings } from '@/app/actions/settings'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

type NotificationPrefs = {
  emailReminders?: boolean
  smsReminders?: boolean
  appointmentConfirmations?: boolean
  appointmentReminders?: boolean
}

export function NotificationSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    emailReminders: true,
    smsReminders: false,
    appointmentConfirmations: true,
    appointmentReminders: true,
  })

  useEffect(() => {
    getSettings().then((s) => {
      const ns = s?.notificationSettings as NotificationPrefs | null
      if (ns && typeof ns === 'object') {
        setPrefs((p) => ({ ...p, ...ns }))
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateNotificationSettings(prefs)
      toast({ title: 'Saved', description: 'Notification settings updated' })
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Bell className="h-5 w-5 text-pink-500" />
          Notification Settings
        </CardTitle>
        <CardDescription className="text-gray-600">
          Configure how you receive reminders and confirmations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-600" />
              <div>
                <Label className="font-medium cursor-pointer">Email reminders</Label>
                <p className="text-xs text-muted-foreground">Receive appointment reminders via email</p>
              </div>
            </div>
            <Checkbox
              checked={prefs.emailReminders ?? true}
              onCheckedChange={(c) => setPrefs((p) => ({ ...p, emailReminders: !!c }))}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gray-600" />
              <div>
                <Label className="font-medium cursor-pointer">SMS reminders</Label>
                <p className="text-xs text-muted-foreground">Receive appointment reminders via text</p>
              </div>
            </div>
            <Checkbox
              checked={prefs.smsReminders ?? false}
              onCheckedChange={(c) => setPrefs((p) => ({ ...p, smsReminders: !!c }))}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-gray-600" />
              <div>
                <Label className="font-medium cursor-pointer">Appointment confirmations</Label>
                <p className="text-xs text-muted-foreground">Send confirmation when an appointment is booked</p>
              </div>
            </div>
            <Checkbox
              checked={prefs.appointmentConfirmations ?? true}
              onCheckedChange={(c) => setPrefs((p) => ({ ...p, appointmentConfirmations: !!c }))}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-600" />
              <div>
                <Label className="font-medium cursor-pointer">Appointment reminders</Label>
                <p className="text-xs text-muted-foreground">Remind clients before their appointment</p>
              </div>
            </div>
            <Checkbox
              checked={prefs.appointmentReminders ?? true}
              onCheckedChange={(c) => setPrefs((p) => ({ ...p, appointmentReminders: !!c }))}
            />
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save notification settings'}
        </Button>
      </CardContent>
    </Card>
  )
}
