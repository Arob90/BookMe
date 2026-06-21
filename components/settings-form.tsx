'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateSettings } from '@/app/actions/settings'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Globe, Clock, DollarSign } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { BankingSettings } from '@/components/banking-settings'
import { NotificationSettings } from '@/components/notification-settings'
import { CalendarSettings } from '@/components/calendar-settings'

interface SettingsFormProps {
  initialSettings: any
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  // Initialize business hours from settings or use defaults
  const getDefaultBusinessHours = () => {
    const defaultHours = {
      MONDAY: { start: '09:00', end: '18:00' },
      TUESDAY: { start: '09:00', end: '18:00' },
      WEDNESDAY: { start: '09:00', end: '18:00' },
      THURSDAY: { start: '09:00', end: '18:00' },
      FRIDAY: { start: '09:00', end: '18:00' },
      SATURDAY: { start: '09:00', end: '18:00' },
      SUNDAY: { start: '09:00', end: '18:00' },
    }
    
    if (initialSettings.businessHours && typeof initialSettings.businessHours === 'object') {
      return { ...defaultHours, ...initialSettings.businessHours }
    }
    return defaultHours
  }
  
  const [settings, setSettings] = useState({
    businessHours: getDefaultBusinessHours(),
    businessDays: initialSettings.businessDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
    currency: initialSettings.currency || 'USD',
    currencySymbol: initialSettings.currencySymbol || '$',
    timezone: initialSettings.timezone || 'America/New_York',
    dateFormat: initialSettings.dateFormat || 'MM/DD/YYYY',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(settings)
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      })
      router.refresh()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Currency options with symbols
  const currencyOptions = [
    { value: 'BZD', label: 'Belize Dollar', symbol: 'BZ$' },
    { value: 'USD', label: 'US Dollar', symbol: '$' },
    { value: 'EUR', label: 'Euro', symbol: '€' },
    { value: 'GBP', label: 'British Pound', symbol: '£' },
    { value: 'CAD', label: 'Canadian Dollar', symbol: '$' },
    { value: 'AUD', label: 'Australian Dollar', symbol: '$' },
    { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
    { value: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
    { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
    { value: 'MXN', label: 'Mexican Peso', symbol: '$' },
    { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
  ]

  // Common timezones
  const timezoneOptions = [
    { value: 'America/Belize', label: 'Belize Time (CST)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
    { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
    { value: 'America/Toronto', label: 'Eastern Time - Toronto' },
    { value: 'America/Vancouver', label: 'Pacific Time - Vancouver' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)' },
  ]

  const dateFormatOptions = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
    { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (European)' },
  ]

  const handleCurrencyChange = (value: string) => {
    const selected = currencyOptions.find(opt => opt.value === value)
    setSettings({
      ...settings,
      currency: value,
      currencySymbol: selected?.symbol || '$',
    })
  }

  const days = [
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
  ]

  const renderDayRow = (day: { value: string; label: string }) => {
    const isSelected = settings.businessDays.includes(day.value)
    const dayHours = settings.businessHours[day.value as keyof typeof settings.businessHours] || { start: '09:00', end: '18:00' }
    return (
      <div key={day.value} className="flex items-center gap-3 p-2 border rounded-lg">
        <div className="flex items-center space-x-2 min-w-[85px]">
          <Checkbox
            id={day.value}
            checked={isSelected}
            onCheckedChange={(checked) => {
              if (checked) {
                setSettings({ ...settings, businessDays: [...settings.businessDays, day.value] })
              } else {
                setSettings({ ...settings, businessDays: settings.businessDays.filter((d: string) => d !== day.value) })
              }
            }}
          />
          <Label htmlFor={day.value} className={`text-sm font-medium cursor-pointer ${isSelected ? '' : 'text-muted-foreground'}`}>
            {day.label}
          </Label>
        </div>
        {isSelected && (
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="time"
              value={dayHours.start}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  businessHours: {
                    ...settings.businessHours,
                    [day.value]: { ...dayHours, start: e.target.value },
                  },
                })
              }
              className="h-8 text-sm flex-1"
            />
            <Input
              type="time"
              value={dayHours.end}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  businessHours: {
                    ...settings.businessHours,
                    [day.value]: { ...dayHours, end: e.target.value },
                  },
                })
              }
              className="h-8 text-sm flex-1"
            />
          </div>
        )}
        {!isSelected && <div className="flex-1 text-sm text-muted-foreground italic">Closed</div>}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto space-y-6">
      {/* Section 1: General (Currency + Regional) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-white py-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <DollarSign className="h-5 w-5 text-pink-500" />
                Currency
              </CardTitle>
              <CardDescription className="text-gray-600">Currency and symbol</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Currency</Label>
                  <Select value={settings.currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Symbol</Label>
                  <Input
                    value={settings.currencySymbol}
                    onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                    placeholder="$"
                    maxLength={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-200 bg-white py-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
                <Globe className="h-5 w-5 text-pink-500" />
                Regional
              </CardTitle>
              <CardDescription className="text-gray-600">Timezone and date format</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Select value={settings.dateFormat} onValueChange={(v) => setSettings({ ...settings, dateFormat: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dateFormatOptions.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Business Hours */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Business Hours</h2>
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b border-gray-200 bg-white py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
              <Clock className="h-5 w-5 text-pink-500" />
              Operating Hours
            </CardTitle>
            <CardDescription className="text-gray-600">Set your operating days and hours</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {days.map(renderDayRow)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Banking - Own clear section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Banking & Payments</h2>
        <BankingSettings />
      </div>

      {/* Section 4: Notifications */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Notifications</h2>
        <NotificationSettings />
      </div>

      {/* Section 5: Calendar & Holidays */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Calendar</h2>
        <CalendarSettings />
      </div>

      {/* Save Button */}
      <div className="flex justify-end border-t border-gray-200 pt-4">
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-8 px-4 text-sm">
          {isSaving ? 'Saving...' : 'Save General Settings'}
        </Button>
      </div>
    </div>
  )
}
