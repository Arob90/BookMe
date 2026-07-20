'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Calendar, Clock, User, Search, CheckCircle2, Plus, Minus, ChevronLeft, ChevronRight, Phone, MapPin, Check, ChevronDown, X, Award, Sparkles } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, getDay } from 'date-fns'
import Link from 'next/link'
import { formatDuration } from '@/lib/utils'
import {
  computeEffectiveSlotWindow,
  type PublicHolidayLite,
} from '@/lib/booking-effective-hours'

interface Business {
  id: string
  name: string
  email: string
  phone: string | null
  address?: string | null
  district?: string | null
  profilePhoto?: string | null
  isOpenNow?: boolean | null
  todayHours?: string | null
}

interface Service {
  id: string
  name: string
  price: number | null
  hidePrice?: boolean
  durationMinutes: number
  durationUnit?: string | null
  description: string | null
  imageUrl?: string | null
  category?: { id: string; name: string; sortOrder?: number } | null
}

// (No gradients) keep service cards clean + outline-focused.

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  birthday: Date | string | null
  clientId?: string
}

/** durationMinutesPerUnit is captured when the line is added so Date & Time still works if `services` is not in memory. */
type BookingLine = { id: string; serviceId: string; quantity: number; durationMinutesPerUnit?: number }

/** Returns null if appointment bounds are missing or invalid (avoids blocking every slot). */
function parseAppointmentInterval(apt: { startAt?: unknown; endAt?: unknown }): { start: Date; end: Date } | null {
  const start = new Date(apt.startAt as string)
  const end = new Date(apt.endAt as string)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return null
  }
  return { start, end }
}

const KNOWN_DAY_KEYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const

/** Minutes from midnight for "HH:MM" / "HH:MM:SS" (same convention as time slot grid). */
function parseHHMMToMinutes(s: string | undefined | null): number | null {
  if (s == null || typeof s !== 'string') return null
  const t = s.trim()
  if (!t.includes(':')) return null
  const parts = t.split(':').map((p) => Number(p))
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null
  const h = parts[0]
  const m = parts[1]
  if (h < 0 || h > 47 || m < 0 || m > 59) return null
  return h * 60 + m
}

type DayHoursShape = { start: string; end: string }

/** API JSON may use lowercase day keys or `close` instead of `end` â€” align with getDayName() / timeSlots. */
function normalizeBusinessHoursRecord(raw: unknown): Record<string, DayHoursShape> | null {
  if (!raw || typeof raw !== 'object') return null
  const out: Record<string, DayHoursShape> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(k).toUpperCase().trim()
    if (!(KNOWN_DAY_KEYS as readonly string[]).includes(key)) continue
    if (!v || typeof v !== 'object') continue
    const o = v as { start?: unknown; end?: unknown; close?: unknown }
    const startRaw = o.start
    const endRaw = o.end ?? o.close
    const start = startRaw != null && String(startRaw).trim() ? String(startRaw).trim() : ''
    const end = endRaw != null && String(endRaw).trim() ? String(endRaw).trim() : ''
    if (start && end) out[key] = { start, end }
  }
  return Object.keys(out).length > 0 ? out : null
}

function normalizeBusinessDaysList(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  }
  return raw.map((d) => String(d).toUpperCase().trim()).filter(Boolean)
}

type BookingReceipt = {
  appointmentId: string
  businessName: string
  startAt: string
  endAt: string
  lineItems: Array<{
    lineId: string
    name: string
    quantity: number
    unitPrice: number
    subtotal: number
    gstAmount: number
    lineTotal: number
  }>
  subtotal: number
  gstTotal: number
  grandTotal: number
  durationMinutes: number
  clientFirstName: string
  clientLastName: string
  clientPublicId: string | null
  pointsBalance: number | null
  notes: string | null
}

export default function BookPage() {
  const { toast } = useToast()
  const GST_RATE = 0.125
  const [step, setStep] = useState<'business' | 'client' | 'services' | 'datetime' | 'confirm'>('business')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [districtFilter, setDistrictFilter] = useState<string>('ALL')
  const [businessSearch, setBusinessSearch] = useState<string>('')
  const [services, setServices] = useState<Service[]>([])
  const [bookingLines, setBookingLines] = useState<BookingLine[]>([])
  const [pendingServiceQuantities, setPendingServiceQuantities] = useState<Record<string, number>>({})
  const [isReturning, setIsReturning] = useState(false)
  const [clientId, setClientId] = useState('')
  const [lookupPhone, setLookupPhone] = useState('')
  const [lookupMode, setLookupMode] = useState<'id' | 'phone'>('id')
  const [client, setClient] = useState<Client | null>(null)
  const [newClient, setNewClient] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthday: '',
  })
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [existingAppointments, setExistingAppointments] = useState<any[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [appointmentsLoadError, setAppointmentsLoadError] = useState(false)
  const [businessHours, setBusinessHours] = useState<any>(null)
  const [businessDays, setBusinessDays] = useState<string[]>([])
  const [publicHolidays, setPublicHolidays] = useState<PublicHolidayLite[]>([])
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [collapsedCategoryNames, setCollapsedCategoryNames] = useState<string[]>([])
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null)
  const [loadingBusinesses, setLoadingBusinesses] = useState<boolean>(true)
  const [bookingReceipt, setBookingReceipt] = useState<BookingReceipt | null>(null)
  const [postBookingPhase, setPostBookingPhase] = useState<'none' | 'success' | 'details'>('none')
  // When arriving from a company's "Book now" link (/book?business=<id>), preselect that
  // business and skip the picker. Applied once businesses load (see effect below).
  const [pendingBusinessId, setPendingBusinessId] = useState<string | null>(null)

  // Read the ?business= param once on mount.
  useEffect(() => {
    const bid = new URLSearchParams(window.location.search).get('business')
    if (bid) setPendingBusinessId(bid)
  }, [])

  // Load businesses on mount
  useEffect(() => {
    const CACHE_KEY = 'publicBusinesses:v1'
    const controller = new AbortController()

    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) {
          setBusinesses(parsed)
          setLoadingBusinesses(false)
        }
      }
    } catch {
      // ignore cache parse failures
    }

    fetch('/api/public/businesses', { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          console.error('Error from API:', data.error)
          try {
            sessionStorage.removeItem(CACHE_KEY)
          } catch {
            // ignore
          }
          setBusinesses([])
          setLoadingBusinesses(false)
          toast({
            title: 'Error',
            description: data.error || 'Failed to load businesses. Please try again.',
            variant: 'destructive',
          })
          return
        }

        if (data?.businesses) {
          setBusinesses(data.businesses)
          setLoadingBusinesses(false)
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.businesses))
          } catch {
            // ignore quota errors
          }
          if (data.businesses.length === 0) {
            console.log('No businesses found in database')
          }
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        console.error('Failed to load businesses:', err)
        setLoadingBusinesses(false)
        toast({
          title: 'Error',
          description: 'Failed to load businesses. Please try again.',
          variant: 'destructive',
        })
      })

    return () => controller.abort()
  }, [toast])

  // Once businesses are loaded, honor a ?business= deep link by jumping straight into
  // that company's booking flow. Runs once (clears the pending id after handling).
  useEffect(() => {
    if (!pendingBusinessId || businesses.length === 0) return
    const match = businesses.find((b) => b.id === pendingBusinessId)
    if (match) {
      setSelectedBusiness(match)
      setStep('client')
    }
    setPendingBusinessId(null)
  }, [pendingBusinessId, businesses])

  const DISTRICTS: Array<{ value: string; label: string }> = [
    { value: 'ALL', label: 'All locations' },
    { value: 'COROZAL', label: 'Corozal' },
    { value: 'ORANGE_WALK', label: 'Orange Walk' },
    { value: 'BELIZE', label: 'Belize' },
    { value: 'CAYO', label: 'Cayo' },
    { value: 'STANN_CREEK', label: 'Stann Creek' },
    { value: 'TOLEDO', label: 'Toledo' },
    { value: 'SAN_PEDRO', label: 'San Pedro' },
    { value: 'CAYE_CAULKER', label: 'Caye Caulker' },
    { value: 'UNKNOWN', label: 'Other / Not set' },
  ]

  const normalizeDistrict = (d?: string | null) => (d && d.trim() ? d.trim().toUpperCase() : 'UNKNOWN')
  const getBusinessInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] || 'B'
    const second = (parts[1]?.[0] || parts[0]?.[1] || '').toString()
    return (first + second).toUpperCase()
  }
  const formatImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return null
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/')) return imageUrl
    return `/${imageUrl}`
  }

  const getServiceDescriptionLines = (description?: string | null) => {
    if (!description) return []
    return description
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-*â€¢]\s*/, '').trim())
      .filter(Boolean)
  }

  const getServiceFallbackDetails = (service: Service): { summary: string; bullets: string[] } => {
    const name = (service.name || '').toLowerCase()

    if (name.includes('api')) {
      return {
        summary: 'Connect your platform with third-party services for secure, reliable data exchange.',
        bullets: [
          'Connect external tools and systems through structured endpoints',
          'Support real-time or scheduled data flow between platforms',
          'Improve workflow automation and reduce manual re-entry',
        ],
      }
    }

    if (name.includes('hosting')) {
      return {
        summary: 'Provision and maintain reliable hosting for your website or web application.',
        bullets: [
          'Configure hosting environment for stable uptime and performance',
          'Apply baseline security and deployment best practices',
          'Ensure your project is accessible and maintained after launch',
        ],
      }
    }

    if (name.includes('permission') || name.includes('user role') || name.includes('role')) {
      return {
        summary: 'Define role-based access so users only see and manage what they should.',
        bullets: [
          'Create role-specific access levels for team members',
          'Restrict sensitive actions based on user permissions',
          'Improve data security and operational accountability',
        ],
      }
    }

    if (name.includes('real-time') || name.includes('realtime') || name.includes('live')) {
      return {
        summary: 'Enable live updates so key business data stays current across your interface.',
        bullets: [
          'Refresh critical records as changes occur',
          'Reduce stale information during active operations',
          'Support faster response to new events and status changes',
        ],
      }
    }

    if (name.includes('chart') || name.includes('analytics') || name.includes('report')) {
      return {
        summary: 'Add visual analytics to help teams understand performance at a glance.',
        bullets: [
          'Display trends and KPIs in clear chart components',
          'Support faster decision-making with visual summaries',
          'Track progress over time with structured data views',
        ],
      }
    }

    if (name.includes('page') || name.includes('website')) {
      return {
        summary: 'Expand your website with structured pages designed for clarity and conversion.',
        bullets: [
          'Add pages tailored to your services and customer journey',
          'Maintain consistent layout, style, and messaging',
          'Improve discoverability and trust with complete content',
        ],
      }
    }

    return {
      summary: 'This add-on extends your setup with additional functionality to match your business needs.',
      bullets: [
        'Adds practical capabilities to improve day-to-day operations',
        'Integrates with your existing workflow and service setup',
        'Designed to scale as your business grows',
      ],
    }
  }

  const serviceFallbackImage = formatImageUrl(selectedBusiness?.profilePhoto ?? null)

  const servicesByCategory = useMemo(() => {
    const map = new Map<string, Service[]>()
    for (const s of services) {
      const key = s.category?.name?.trim() || 'Uncategorized'
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return [...map.entries()].sort((a, b) => {
      const aKey = a[0]
      const bKey = b[0]
      if (aKey === 'Uncategorized') return 1
      if (bKey === 'Uncategorized') return -1
      const sa = a[1][0]?.category?.sortOrder ?? 999999
      const sb = b[1][0]?.category?.sortOrder ?? 999999
      if (sa !== sb) return sa - sb
      return aKey.localeCompare(bKey)
    })
  }, [services])

  const toggleCategoryCollapsed = (categoryName: string) => {
    setCollapsedCategoryNames((prev) =>
      prev.includes(categoryName) ? prev.filter((n) => n !== categoryName) : [...prev, categoryName]
    )
  }

  const visibleBusinesses = useMemo(() => {
    const search = businessSearch.trim().toLowerCase()
    return businesses.filter((b) => {
      const district = normalizeDistrict(b.district)
      const districtOk = districtFilter === 'ALL' ? true : district === districtFilter
      const searchOk = !search ? true : b.name.toLowerCase().includes(search)
      return districtOk && searchOk
    })
  }, [businesses, districtFilter, businessSearch])

  const businessesByDistrict = useMemo(() => {
    const map = new Map<string, Business[]>()
    for (const b of visibleBusinesses) {
      const d = normalizeDistrict(b.district)
      map.set(d, [...(map.get(d) || []), b])
    }
    // Stable sort inside each district
    for (const [k, v] of map.entries()) {
      v.sort((a, b) => a.name.localeCompare(b.name))
      map.set(k, v)
    }
    return map
  }, [visibleBusinesses])

  // Load services whenever a business is in the flow (including Date & Time / Confirm) so duration/pricing stay available.
  useEffect(() => {
    if (
      selectedBusiness &&
      (step === 'services' || step === 'client' || step === 'datetime' || step === 'confirm')
    ) {
      fetch(`/api/public/services?businessId=${selectedBusiness.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            console.error('Error loading services:', data.error)
            toast({
              title: 'Error',
              description: data.error || 'Failed to load services.',
              variant: 'destructive',
            })
          } else if (data.services) {
            setServices(data.services)
            const categoryNames = Array.from(
              new Set<string>(
                data.services.map((s: Service) => (s.category?.name?.trim() || 'Uncategorized'))
              )
            )
            // Start with compact category rows; user can expand as needed.
            setCollapsedCategoryNames(categoryNames)
          }
        })
        .catch(err => {
          console.error('Failed to load services:', err)
          toast({
            title: 'Error',
            description: 'Failed to load services. Please try again.',
            variant: 'destructive',
          })
        })
    }
  }, [selectedBusiness, step, toast])

  useEffect(() => {
    setActiveServiceId(null)
    setServices([])
    setBookingLines([])
    setPendingServiceQuantities({})
  }, [selectedBusiness?.id])

  // Load business hours when a business is selected
  useEffect(() => {
    if (selectedBusiness) {
      fetch(`/api/public/business-hours?businessId=${selectedBusiness.id}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`)
          }
          return res.json()
        })
        .then(data => {
          if (data.error) {
            console.error('Error loading business hours:', data.error)
            // Set default hours if error
            const defaultBusinessHours = {
              MONDAY: { start: '09:00', end: '18:00' },
              TUESDAY: { start: '09:00', end: '18:00' },
              WEDNESDAY: { start: '09:00', end: '18:00' },
              THURSDAY: { start: '09:00', end: '18:00' },
              FRIDAY: { start: '09:00', end: '18:00' },
              SATURDAY: { start: '09:00', end: '18:00' },
              SUNDAY: { start: '09:00', end: '18:00' },
            }
            setBusinessHours(defaultBusinessHours)
            setBusinessDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
            setPublicHolidays([])
          } else if (data.businessHours) {
            const normalized = normalizeBusinessHoursRecord(data.businessHours)
            setBusinessHours(normalized ?? (data.businessHours as Record<string, DayHoursShape>))
            setBusinessDays(normalizeBusinessDaysList(data.businessDays))
            setPublicHolidays(Array.isArray(data.holidays) ? data.holidays : [])
          } else {
            // Fallback if no businessHours in response
            console.warn('No businessHours in response, using defaults')
            const defaultBusinessHours = {
              MONDAY: { start: '09:00', end: '18:00' },
              TUESDAY: { start: '09:00', end: '18:00' },
              WEDNESDAY: { start: '09:00', end: '18:00' },
              THURSDAY: { start: '09:00', end: '18:00' },
              FRIDAY: { start: '09:00', end: '18:00' },
              SATURDAY: { start: '09:00', end: '18:00' },
              SUNDAY: { start: '09:00', end: '18:00' },
            }
            setBusinessHours(defaultBusinessHours)
            setBusinessDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
            setPublicHolidays(Array.isArray(data.holidays) ? data.holidays : [])
          }
        })
        .catch(err => {
          console.error('Failed to load business hours:', err)
          // Set default hours on error
          const defaultBusinessHours = {
            MONDAY: { start: '09:00', end: '18:00' },
            TUESDAY: { start: '09:00', end: '18:00' },
            WEDNESDAY: { start: '09:00', end: '18:00' },
            THURSDAY: { start: '09:00', end: '18:00' },
            FRIDAY: { start: '09:00', end: '18:00' },
            SATURDAY: { start: '09:00', end: '18:00' },
            SUNDAY: { start: '09:00', end: '18:00' },
          }
          setBusinessHours(defaultBusinessHours)
          setBusinessDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
          setPublicHolidays([])
        })
    } else {
      // Clear business hours when no business is selected
      setBusinessHours(null)
      setBusinessDays([])
      setPublicHolidays([])
    }
  }, [selectedBusiness])

  // Parse date string as local date (not UTC)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day) // month is 0-indexed
  }

  // Get day name from date
  const getDayName = (date: Date): string => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
    return days[date.getDay()]
  }

  // Check if date is bookable (weekly schedule + holidays: closed / special hours)
  const isBusinessDay = (date: Date): boolean => {
    if (!businessHours) return true
    const ymd = format(date, 'yyyy-MM-dd')
    const eff = computeEffectiveSlotWindow(ymd, businessHours, businessDays, publicHolidays)
    return !eff.closed && eff.slotWindow != null
  }

  // Generate time slots based on effective hours for selected date (includes holiday overrides)
  const timeSlots = useMemo(() => {
    if (!selectedDate || !businessHours) return []

    const eff = computeEffectiveSlotWindow(selectedDate, businessHours, businessDays, publicHolidays)
    if (eff.closed || !eff.slotWindow) return []

    const dayHours = eff.slotWindow

    const [startHour, startMinute] = dayHours.start.split(':').map(Number)
    const [endHour, endMinute] = dayHours.end.split(':').map(Number)
    
    const slots: Array<{ hour: number; minute: number }> = []
    let currentHour = startHour
    let currentMinute = startMinute
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      slots.push({ hour: currentHour, minute: currentMinute })
      
      currentMinute += 15
      if (currentMinute >= 60) {
        currentMinute = 0
        currentHour += 1
      }
    }
    
    return slots
  }, [selectedDate, businessHours, businessDays, publicHolidays])

  // Must be declared before slot helpers (isSlotAvailable / canFitDuration) so they read
  // the same duration the server uses â€” not TDZ / stale closure from a later const.
  const totalPrice = useMemo(
    () =>
      bookingLines.reduce((sum, line) => {
        const service = services.find((s) => s.id === line.serviceId)
        const p = service?.price
        return sum + (p != null && !Number.isNaN(Number(p)) ? Number(p) * line.quantity : 0)
      }, 0),
    [bookingLines, services]
  )

  /** Consultation booking duration (fixed; independent of selected items). */
  const totalDuration = useMemo(() => {
    // Booking is a consultation-style appointment: service durations should NOT control slot length.
    // We keep service selections for context/pricing but always use a fixed duration.
    const CONSULTATION_DURATION_MINUTES = 60
    return CONSULTATION_DURATION_MINUTES
  }, [bookingLines, services])

  /** Minutes used for overlap checks when totalDuration is still 0 (missing data): optimistic 15 so the grid stays usable; server validates. */
  const slotConflictDurationMinutes = useMemo(() => {
    if (totalDuration > 0) return totalDuration
    // Consultation booking: even with no selected items yet, reserve a default slot length
    // so times are selectable on open days (server will also use consultation duration).
    return 60
  }, [totalDuration, bookingLines.length])

  /** How far past end-of-day to query conflicts when duration is unknown (avoid missing overlapping bookings). */
  const minutesForAppointmentFetch = useMemo(() => {
    if (totalDuration > 0) return totalDuration
    if (bookingLines.length > 0) return 24 * 60
    return 0
  }, [totalDuration, bookingLines.length])

  /** When set, the cart is longer than the effective open window for the selected day (with labels for messaging). */
  const durationExceedsDetails = useMemo(() => {
    if (!selectedDate || !businessHours || totalDuration <= 0) return null
    const eff = computeEffectiveSlotWindow(selectedDate, businessHours, businessDays, publicHolidays)
    if (eff.closed || !eff.slotWindow) return null
    const openM = parseHHMMToMinutes(eff.slotWindow.start)
    const closeM = parseHHMMToMinutes(eff.slotWindow.end)
    if (openM == null || closeM == null || closeM <= openM) return null
    const windowMinutes = closeM - openM
    if (totalDuration <= windowMinutes) return null
    return {
      windowMinutes,
      startLabel: eff.slotWindow.start,
      endLabel: eff.slotWindow.end,
    }
  }, [selectedDate, businessHours, businessDays, publicHolidays, totalDuration])

  // Same overlap rule as app/actions/public-booking.ts (interval [start, end)).
  const intervalsOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && aEnd > bStart

  // Check if a 15-minute grid cell is free (not blocked by any appointment)
  const isSlotAvailable = (hour: number, minute: number) => {
    if (!selectedDate) return true

    const slotStart = parseLocalDate(selectedDate)
    slotStart.setHours(hour, minute, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 15 * 60000)

    return !existingAppointments.some((apt) => {
      const iv = parseAppointmentInterval(apt)
      if (!iv) return false
      return intervalsOverlap(iv.start, iv.end, slotStart, slotEnd)
    })
  }

  // Whether the full booking [slotStart, slotStart + duration) overlaps any appointment and fits before close (when duration is known).
  // IMPORTANT: Do not walk 15-minute steps using clock arithmetic â€” that breaks when duration
  // crosses midnight or spans days (same bug class as server rejecting while UI showed "available").
  const canFitDuration = (hour: number, minute: number) => {
    if (!selectedDate) return false
    const conflictMin = slotConflictDurationMinutes
    if (conflictMin === 0) return false

    const slotStart = parseLocalDate(selectedDate)
    slotStart.setHours(hour, minute, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + conflictMin * 60000)

    // When we know the real total duration, booking must finish by closing time (minute-of-day, same as slot grid).
    // Using Date#setHours for "close" was fragile vs mixed DB formats; compare minutes-from-midnight instead.
    if (totalDuration > 0 && businessHours) {
      const eff = computeEffectiveSlotWindow(selectedDate, businessHours, businessDays, publicHolidays)
      if (!eff.closed && eff.slotWindow) {
        const openM = parseHHMMToMinutes(eff.slotWindow.start)
        const closeM = parseHHMMToMinutes(eff.slotWindow.end)
        if (openM != null && closeM != null && closeM > openM) {
          const slotM = hour * 60 + minute
          const spanEndM = slotM + totalDuration
          if (spanEndM > closeM) return false
        }
      }
    }

    return !existingAppointments.some((apt) => {
      const iv = parseAppointmentInterval(apt)
      if (!iv) return false
      return intervalsOverlap(iv.start, iv.end, slotStart, slotEnd)
    })
  }

  const handleTimeSlotClick = (hour: number, minute: number) => {
    if (!canFitDuration(hour, minute)) {
      toast({
        title: 'Time Not Available',
        description: 'This time slot cannot accommodate the selected services. Please choose another time.',
        variant: 'destructive',
      })
      return
    }

    setSelectedHour(hour)
    setSelectedMinute(minute)
    // Format time as HH:MM for the time input
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    setSelectedTime(timeString)
  }

  const handleBusinessSelect = (businessId: string) => {
    const business = businesses.find(b => b.id === businessId)
    if (business) {
      setSelectedBusiness(business)
      setStep('client')
    }
  }

  const handleClientIdLookup = async () => {
    if (!selectedBusiness) return
    const byPhone = lookupMode === 'phone'
    if (byPhone ? !lookupPhone.trim() : !clientId.trim()) return

    setIsLoading(true)
    try {
      const query = byPhone
        ? `phone=${encodeURIComponent(lookupPhone.trim())}`
        : `clientId=${encodeURIComponent(clientId)}`
      const response = await fetch(`/api/public/lookup-client?${query}&businessId=${selectedBusiness.id}`)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok) {
        // Next.js can return HTML error pages; don't try to parse them as JSON.
        const text = await response.text().catch(() => '')
        throw new Error(text ? `Lookup failed (${response.status}): ${text.slice(0, 250)}` : `Lookup failed (${response.status})`)
      }
      if (!contentType.toLowerCase().includes('application/json')) {
        const text = await response.text().catch(() => '')
        throw new Error(text ? `Unexpected response (${response.status}): ${text.slice(0, 250)}` : `Unexpected response (${response.status})`)
      }

      const data = await response.json()

      if (data.error) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to lookup client. Please try again.',
          variant: 'destructive',
        })
        return
      }

      if (data.client) {
        setClient(data.client)
        toast({
          title: 'Client Found',
          description: `Welcome back, ${data.client.firstName} ${data.client.lastName}!`,
        })
        setStep('services')
      } else {
        toast({
          title: 'Client Not Found',
          description: lookupMode === 'phone'
            ? 'No match for that phone number. Try your Client ID, or create a new account.'
            : 'Please check your Client ID or phone number, or create a new account.',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      console.error('Client lookup error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to lookup client. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNewClient = async () => {
    if (!newClient.firstName.trim() || !newClient.lastName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'First name and last name are required.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/public/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          businessId: selectedBusiness?.id ?? '',
        }),
      })
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text ? `Create client failed (${response.status}): ${text.slice(0, 250)}` : `Create client failed (${response.status})`)
      }
      if (!contentType.toLowerCase().includes('application/json')) {
        const text = await response.text().catch(() => '')
        throw new Error(text ? `Unexpected response (${response.status}): ${text.slice(0, 250)}` : `Unexpected response (${response.status})`)
      }

      const data = await response.json()

      if (data.client) {
        setClient(data.client)
        toast({
          title: 'Account Created',
          description: `Your Client ID is: ${data.client.clientId}. Please save this for future bookings!`,
        })
        setStep('services')
      } else {
        throw new Error(data.error || 'Failed to create client')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const totalSelectedQuantity = useMemo(
    () => bookingLines.reduce((sum, line) => sum + line.quantity, 0),
    [bookingLines]
  )

  const getPendingQuantity = (serviceId: string) => pendingServiceQuantities[serviceId] ?? 0

  const setPendingQuantity = (serviceId: string, quantity: number) => {
    setPendingServiceQuantities((prev) => {
      const next = { ...prev }
      if (quantity <= 0) {
        delete next[serviceId]
      } else {
        next[serviceId] = quantity
      }
      return next
    })
  }

  const incrementServiceQuantity = (serviceId: string) => {
    const currentQty = getPendingQuantity(serviceId)
    setPendingQuantity(serviceId, currentQty + 1)
  }

  const decrementServiceQuantity = (serviceId: string) => {
    const currentQty = getPendingQuantity(serviceId)
    setPendingQuantity(serviceId, currentQty - 1)
  }

  const commitBookingLine = (serviceId: string) => {
    const pending = getPendingQuantity(serviceId)
    const quantity = pending > 0 ? pending : 1
    const service = services.find((s) => s.id === serviceId)
    if (!service) {
      toast({
        title: 'Services still loading',
        description: 'Wait a moment for services to load, then add again.',
        variant: 'destructive',
      })
      return
    }
    setBookingLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        serviceId,
        quantity,
        durationMinutesPerUnit: Math.max(0, Number(service.durationMinutes) || 0),
      },
    ])
    setPendingServiceQuantities((prev) => {
      const next = { ...prev }
      delete next[serviceId]
      return next
    })
  }

  const removeBookingLine = (lineId: string) => {
    setBookingLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  const getServiceInitial = (name: string) => {
    const t = name.trim()
    if (!t) return '?'
    return t[0].toUpperCase()
  }

  // Load appointments overlapping the selected calendar day + booking duration (same window the server uses for conflicts).
  useEffect(() => {
    if (!selectedDate || !selectedBusiness) {
      setExistingAppointments([])
      setAppointmentsLoadError(false)
      return
    }
    const dayStart = parseLocalDate(selectedDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = parseLocalDate(selectedDate)
    dayEnd.setHours(23, 59, 59, 999)
    let rangeEnd = new Date(dayEnd.getTime() + Math.max(0, minutesForAppointmentFetch) * 60000)
    if (rangeEnd.getTime() <= dayStart.getTime()) {
      rangeEnd = new Date(dayStart.getTime() + 60 * 60 * 1000)
    }
    const params = new URLSearchParams({
      businessId: selectedBusiness.id,
      date: selectedDate,
      start: dayStart.toISOString(),
      end: rangeEnd.toISOString(),
    })
    const url = `/api/public/appointments?${params.toString()}`

    let cancelled = false
    setLoadingAppointments(true)
    setAppointmentsLoadError(false)

    ;(async () => {
      let success = false
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 400 * attempt))
        }
        try {
          const res = await fetch(url)
          const contentType = res.headers.get('content-type') || ''
          let data: { error?: string; appointments?: unknown[] } = {}
          if (contentType.toLowerCase().includes('application/json')) {
            try {
              data = await res.json()
            } catch {
              console.error('Invalid JSON from appointments API')
              continue
            }
          } else {
            await res.text().catch(() => '')
            console.error('Appointments API returned non-JSON:', res.status)
            continue
          }
          if (!res.ok || data.error) {
            console.error('Error loading appointments:', data.error || res.status)
            continue
          }
          if (cancelled) return
          setAppointmentsLoadError(false)
          setExistingAppointments((data.appointments || []) as any[])
          success = true
          break
        } catch (err) {
          console.error('Failed to load appointments:', err)
        }
      }
      if (!cancelled && !success) {
        setAppointmentsLoadError(true)
        setExistingAppointments([])
      }
      if (!cancelled) {
        setLoadingAppointments(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedDate, selectedBusiness, minutesForAppointmentFetch])

  const formatSummaryDuration = (minutes: number) => {
    if (minutes < 1200) return formatDuration(minutes, 'MINUTES')
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    const mins = minutes % 60

    const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`

    // For long durations, show bigger units (years / months / weeks / days) and keep it concise (max 2 parts).
    if (days >= 30) {
      const years = Math.floor(days / 365)
      let rem = days % 365
      const months = Math.floor(rem / 30)
      rem = rem % 30
      const weeks = Math.floor(rem / 7)
      const remDays = rem % 7

      const parts: string[] = []
      if (years > 0) {
        parts.push(plural(years, 'year'))
        if (months > 0) parts.push(plural(months, 'month'))
        else if (weeks > 0) parts.push(plural(weeks, 'week'))
        else if (remDays > 0) parts.push(plural(remDays, 'day'))
        return parts.slice(0, 2).join(' ')
      }

      // < 1 year: express as 1â€“12 months, optionally with weeks (then days if no weeks).
      if (months > 0) {
        parts.push(plural(months, 'month'))
        if (weeks > 0) parts.push(plural(weeks, 'week'))
        else if (remDays > 0) parts.push(plural(remDays, 'day'))
        return parts.slice(0, 2).join(' ')
      }
    }

    // Otherwise keep the compact day/hour/min display.
    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (mins > 0) parts.push(`${mins}m`)
    return parts.join(' ') || `${minutes} min`
  }

  const selectedLineItems = useMemo(() => {
    return bookingLines
      .map((line) => {
        const service = services.find((s) => s.id === line.serviceId)
        if (!service) return null
        const unitPrice = service.price != null && !Number.isNaN(Number(service.price)) ? Number(service.price) : 0
        const subtotal = unitPrice * line.quantity
        const gstAmount = subtotal * GST_RATE
        const lineTotal = subtotal + gstAmount
        return {
          lineId: line.id,
          serviceId: line.serviceId,
          name: service.name,
          quantity: line.quantity,
          unitPrice,
          subtotal,
          gstAmount,
          lineTotal,
        }
      })
      .filter(Boolean) as Array<{
      lineId: string
      serviceId: string
      name: string
      quantity: number
      unitPrice: number
      subtotal: number
      gstAmount: number
      lineTotal: number
    }>
  }, [bookingLines, services])

  const totalGst = selectedLineItems.reduce((sum, item) => sum + item.gstAmount, 0)
  const grandTotal = totalPrice + totalGst

  const downloadReceipt = (r: BookingReceipt) => {
    const dpr = typeof window !== 'undefined' ? Math.max(1, Math.min(3, window.devicePixelRatio || 1)) : 1
    const width = 980
    const padding = 64
    const lineH = 32
    const rowH = 30
    const leftX = padding
    const rightX = width - padding

    const whenLine = `${format(parseISO(r.startAt), 'EEEE, MMMM d, yyyy')}  ${format(parseISO(r.startAt), 'h:mm a')} â€“ ${format(parseISO(r.endAt), 'h:mm a')}`
    const formatMoney = (n: number) => `$${Number(n || 0).toFixed(2)}`
    const services = r.lineItems.map((li) => ({
      name: `${li.name}${li.quantity > 1 ? ` x${li.quantity}` : ''}`,
      total: formatMoney(li.lineTotal),
    }))

    // Height estimate: header + meta + client + services rows + totals + notes
    const estimatedRows =
      12 +
      Math.max(1, services.length) +
      (r.notes ? Math.min(10, String(r.notes).split('\n').length) + 2 : 0)
    const height = padding * 2 + estimatedRows * rowH + 220

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = '#fff7fb'
    ctx.fillRect(0, 0, width, height)

    // Card
    const cardX = 24
    const cardY = 24
    const cardW = width - cardX * 2
    const cardH = height - cardY * 2

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(cardX, cardY, cardW, cardH)
    ctx.strokeStyle = '#fbcfe8'
    ctx.lineWidth = 2
    ctx.strokeRect(cardX, cardY, cardW, cardH)

    // Top accent
    ctx.fillStyle = '#ec4899'
    ctx.fillRect(cardX, cardY, cardW, 8)

    const drawDivider = (y: number) => {
      ctx.strokeStyle = '#f1f5f9'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(leftX, y)
      ctx.lineTo(rightX, y)
      ctx.stroke()
    }

    const drawWrapped = (text: string, x: number, y: number, maxWidth: number, font: string, color: string) => {
      ctx.font = font
      ctx.fillStyle = color
      const words = String(text || '').split(' ')
      let line = ''
      let yy = y
      for (let i = 0; i < words.length; i++) {
        const test = line ? `${line} ${words[i]}` : words[i]
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, yy)
          yy += rowH
          line = words[i]
        } else {
          line = test
        }
      }
      if (line) ctx.fillText(line, x, yy)
      return yy + rowH
    }

    // Header
    let y = cardY + 56
    y = drawWrapped('Booking receipt', leftX, y, cardW - padding * 2, '800 54px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#0f172a')
    y = drawWrapped(r.businessName, leftX, y - 6, cardW - padding * 2, '700 24px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#334155')
    y += 6

    // Reference block
    ctx.fillStyle = '#fff1f2'
    ctx.fillRect(leftX, y, cardW - padding * 2, 44)
    ctx.strokeStyle = '#fecdd3'
    ctx.lineWidth = 1
    ctx.strokeRect(leftX, y, cardW - padding * 2, 44)
    ctx.font = '700 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
    ctx.fillStyle = '#be185d'
    ctx.fillText('Reference', leftX + 14, y + 28)
    ctx.font = '600 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    ctx.fillStyle = '#9d174d'
    ctx.textAlign = 'right'
    ctx.fillText(r.appointmentId, rightX - 14, y + 28)
    ctx.textAlign = 'left'
    y += 62

    // Meta
    y = drawWrapped(`When: ${whenLine}`, leftX, y, cardW - padding * 2, '600 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#334155')
    y = drawWrapped(`Duration: ${formatSummaryDuration(r.durationMinutes)}`, leftX, y - 4, cardW - padding * 2, '600 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#334155')
    y += 8
    drawDivider(y)
    y += 26

    // Client
    y = drawWrapped(`Client: ${r.clientFirstName} ${r.clientLastName}`.trim(), leftX, y, cardW - padding * 2, '800 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#0f172a')
    if (r.clientPublicId) {
      y = drawWrapped(`Client ID: ${r.clientPublicId}`, leftX, y - 6, cardW - padding * 2, '600 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', '#475569')
    }
    if (typeof r.pointsBalance === 'number') {
      y = drawWrapped(`Loyalty points: ${r.pointsBalance}`, leftX, y - 10, cardW - padding * 2, '600 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#64748b')
    }
    y += 6
    drawDivider(y)
    y += 26

    // Services header
    ctx.font = '800 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
    ctx.fillStyle = '#0f172a'
    ctx.fillText('Services', leftX, y)
    y += 18
    drawDivider(y)
    y += 24

    // Services rows (two column)
    const maxNameW = cardW - padding * 2 - 140
    for (const s of (services.length ? services : [{ name: '(none)', total: '' }])) {
      const startY = y
      y = drawWrapped(`- ${s.name}`, leftX, y, maxNameW, '600 17px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#475569')
      ctx.font = '700 17px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
      ctx.fillStyle = '#334155'
      ctx.textAlign = 'right'
      ctx.fillText(s.total, rightX, startY + 2)
      ctx.textAlign = 'left'
    }

    y += 8
    drawDivider(y)
    y += 26

    // Totals block
    const totalsX = rightX - 360
    const totalsW = 360
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(totalsX, y - 6, totalsW, 120)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.strokeRect(totalsX, y - 6, totalsW, 120)

    const drawTotalRow = (label: string, value: string, yy: number, bold = false) => {
      ctx.font = `${bold ? 800 : 700} ${bold ? 20 : 16}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`
      ctx.fillStyle = '#0f172a'
      ctx.textAlign = 'left'
      ctx.fillText(label, totalsX + 16, yy)
      ctx.textAlign = 'right'
      ctx.fillText(value, totalsX + totalsW - 16, yy)
      ctx.textAlign = 'left'
    }

    drawTotalRow('Subtotal', formatMoney(r.subtotal), y + 26)
    drawTotalRow('GST (12.5%)', formatMoney(r.gstTotal), y + 54)
    drawTotalRow('Total', formatMoney(r.grandTotal), y + 92, true)
    y += 150

    // Notes
    if (r.notes) {
      drawDivider(y)
      y += 26
      ctx.font = '800 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
      ctx.fillStyle = '#0f172a'
      ctx.fillText('Notes', leftX, y)
      y += 18
      drawDivider(y)
      y += 24
      const noteLines = String(r.notes).split('\n').slice(0, 10)
      for (const t of noteLines) {
        y = drawWrapped(t, leftX, y, cardW - padding * 2, '600 17px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial', '#475569')
      }
      y += 8
    }

    // Always create a real JPEG Blob so the file is definitely a .jpg
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `booking-receipt-${r.appointmentId}.jpg`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      },
      'image/jpeg',
      0.92
    )
  }

  const handleBookAppointment = async () => {
    if (!selectedBusiness || !client || !selectedDate || !selectedTime) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date and time.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const localStart = parseLocalDate(selectedDate)
      const [th, tm] = selectedTime.split(':').map(Number)
      localStart.setHours(th, tm, 0, 0)
      const startAt = localStart.toISOString()
      const response = await fetch('/api/public/book-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          clientId: client.id,
          ...(bookingLines.length > 0
            ? {
                serviceIds: [...new Set(bookingLines.map((l) => l.serviceId))],
                serviceSelections: bookingLines.map(({ serviceId, quantity }) => ({
                  serviceId,
                  quantity,
                })),
              }
            : {}),
          calendarDate: selectedDate,
          startAt,
          notes,
        }),
      })

      const data = await response.json()

      if (data.appointment) {
        const apt = data.appointment
        const pts =
          typeof apt.client?.pointsBalance === 'number' ? apt.client.pointsBalance : null
        setBookingReceipt({
          appointmentId: apt.id,
          businessName: selectedBusiness.name,
          startAt: typeof apt.startAt === 'string' ? apt.startAt : new Date(apt.startAt).toISOString(),
          endAt: typeof apt.endAt === 'string' ? apt.endAt : new Date(apt.endAt).toISOString(),
          lineItems: selectedLineItems.map((item) => ({
            lineId: item.lineId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            gstAmount: item.gstAmount,
            lineTotal: item.lineTotal,
          })),
          subtotal: totalPrice,
          gstTotal: totalGst,
          grandTotal,
          durationMinutes: totalDuration,
          clientFirstName: client.firstName,
          clientLastName: client.lastName,
          clientPublicId: client.clientId ?? null,
          pointsBalance: pts,
          notes: notes.trim() || null,
        })
        setStep('confirm')
        setPostBookingPhase('success')
      } else {
        throw new Error(data.error || 'Failed to book appointment')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to book appointment. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Check if business is currently open
  const isBusinessOpenNow = (): boolean => {
    if (!businessHours || !businessDays.length) return false
    
    const now = new Date()
    const currentDayName = getDayName(now)
    
    // Check if today is a business day
    if (!businessDays.includes(currentDayName)) return false
    
    // Get today's hours
    const todayHours = businessHours[currentDayName as keyof typeof businessHours]
    if (!todayHours) return false
    
    // Parse current time and business hours
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute
    
    const [startHour, startMinute] = todayHours.start.split(':').map(Number)
    const [endHour, endMinute] = todayHours.end.split(':').map(Number)
    const startTimeInMinutes = startHour * 60 + startMinute
    const endTimeInMinutes = endHour * 60 + endMinute
    
    // Check if current time is within business hours
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes
  }

  // Format business hours for display
  const formatBusinessHours = (): string => {
    if (!businessHours || !businessDays.length) return 'Hours vary'
    
    // Group consecutive days with same hours
    const dayNames: Record<string, string> = {
      MONDAY: 'Mon',
      TUESDAY: 'Tue',
      WEDNESDAY: 'Wed',
      THURSDAY: 'Thu',
      FRIDAY: 'Fri',
      SATURDAY: 'Sat',
      SUNDAY: 'Sun',
    }
    
    const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    const openDays = dayOrder.filter(day => businessDays.includes(day))
    
    if (openDays.length === 0) return 'Closed'
    
    // Format time from 24-hour to 12-hour
    const formatTime = (time: string): string => {
      const [hour, minute] = time.split(':').map(Number)
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
    }
    
    // Get hours for first day
    const firstDayHours = businessHours[openDays[0] as keyof typeof businessHours]
    if (!firstDayHours) return 'Hours vary'
    
    const startTime = formatTime(firstDayHours.start)
    const endTime = formatTime(firstDayHours.end)
    
    // Check if all days have same hours
    const allSameHours = openDays.every(day => {
      const dayHours = businessHours[day as keyof typeof businessHours]
      return dayHours && dayHours.start === firstDayHours.start && dayHours.end === firstDayHours.end
    })
    
    if (allSameHours && openDays.length === 7) {
      return `Daily: ${startTime} - ${endTime}`
    } else if (allSameHours) {
      if (openDays.length === 1) {
        return `${dayNames[openDays[0]]}: ${startTime} - ${endTime}`
      } else {
        return `${dayNames[openDays[0]]}-${dayNames[openDays[openDays.length - 1]]}: ${startTime} - ${endTime}`
      }
    } else {
      // Different hours - show simplified version
      return `Open ${openDays.length} days/week`
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-sm">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="font-display text-xl font-semibold tracking-tight text-slate-900">BookMe</span>
            </Link>
            <Link href="/" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              Back to home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'confirm' ? (
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 mb-6">
              <Button variant="outline" size="sm" asChild className="gap-1">
                <Link href="/">
                  <ChevronLeft className="h-4 w-4" />
                  Back to home
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('business')
                  setSelectedBusiness(null)
                  setClient(null)
                  setBookingLines([])
                  setPendingServiceQuantities({})
                  setSelectedDate('')
                  setSelectedTime('')
                  setSelectedHour(null)
                  setSelectedMinute(null)
                  setNotes('')
                  setBookingReceipt(null)
                  setPostBookingPhase('none')
                }}
              >
                Book another appointment
              </Button>
            </div>
            <div className="rounded-[22px] border border-violet-100 bg-white p-8 text-center shadow-sm">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-slate-900">You&apos;re all set</p>
              <p className="text-sm text-slate-500 mt-1">
                Your receipt opened in a second window. You can open it again anytime below.
              </p>
              {bookingReceipt && postBookingPhase === 'none' && (
                <Button
                  variant="outline"
                  className="mt-4 rounded-full border-violet-200 text-violet-700 hover:bg-violet-50"
                  onClick={() => setPostBookingPhase('details')}
                >
                  View receipt again
                </Button>
              )}
            </div>

            <Dialog
              open={postBookingPhase === 'success'}
              onOpenChange={(open) => {
                if (!open) {
                  setTimeout(() => setPostBookingPhase('details'), 0)
                }
              }}
            >
              <DialogContent className="sm:max-w-md border-violet-100">
                <DialogHeader className="sm:text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                    <Sparkles className="h-6 w-6 text-violet-600" />
                  </div>
                  <DialogTitle className="text-xl">Appointment booked!</DialogTitle>
                  <DialogDescription className="text-base text-slate-600 pt-1">
                    Your booking is confirmed. Close this message to see your full receipt, services, and account details.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center gap-2">
                  <Button
                    className="rounded-full bg-violet-500 hover:bg-violet-600"
                    onClick={() => setPostBookingPhase('details')}
                  >
                    View receipt
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={postBookingPhase === 'details'}
              onOpenChange={(open) => {
                if (!open) setPostBookingPhase('none')
              }}
            >
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg border-violet-100">
                <DialogHeader>
                  <DialogTitle className="text-xl text-slate-900">Booking receipt</DialogTitle>
                  <DialogDescription className="text-slate-600">
                    {bookingReceipt?.businessName} â€” reference{' '}
                    <span className="font-mono text-violet-700 break-all">
                      {bookingReceipt?.appointmentId ?? 'â€”'}
                    </span>
                  </DialogDescription>
                </DialogHeader>

                {bookingReceipt && (
                  <div className="space-y-4 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">When</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {format(parseISO(bookingReceipt.startAt), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-slate-700">
                        {format(parseISO(bookingReceipt.startAt), 'h:mm a')} â€“{' '}
                        {format(parseISO(bookingReceipt.endAt), 'h:mm a')}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Duration {formatSummaryDuration(bookingReceipt.durationMinutes)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Your account</p>
                      <p className="mt-1 text-slate-900">
                        {bookingReceipt.clientFirstName} {bookingReceipt.clientLastName}
                      </p>
                      {bookingReceipt.clientPublicId && (
                        <p className="mt-1 font-mono text-sm font-semibold text-violet-700">
                          Client ID: {bookingReceipt.clientPublicId}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-slate-800">
                        <Award className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                          Loyalty points balance:{' '}
                          <strong>{bookingReceipt.pointsBalance ?? 'â€”'}</strong>
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Services</p>
                      <ul className="space-y-2">
                        {bookingReceipt.lineItems.map((item) => (
                          <li
                            key={item.lineId}
                            className="flex justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
                          >
                            <span className="text-slate-800">
                              {item.name}
                              {item.quantity > 1 ? (
                                <span className="text-slate-500"> Ã—{item.quantity}</span>
                              ) : null}
                            </span>
                            <span className="font-semibold text-slate-900 tabular-nums">
                              ${item.lineTotal.toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-slate-700">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="tabular-nums">${bookingReceipt.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (12.5%)</span>
                          <span className="tabular-nums">${bookingReceipt.gstTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-violet-600 pt-1">
                          <span>Total</span>
                          <span className="tabular-nums">${bookingReceipt.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {bookingReceipt.notes && (
                      <div className="rounded-lg border border-slate-100 bg-white p-3">
                        <p className="text-xs font-semibold text-slate-500">Notes</p>
                        <p className="mt-1 text-slate-700 whitespace-pre-wrap">{bookingReceipt.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-col">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => bookingReceipt && downloadReceipt(bookingReceipt)}
                      disabled={!bookingReceipt}
                    >
                      Download receipt
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setStep('business')
                        setSelectedBusiness(null)
                        setClient(null)
                        setBookingLines([])
                        setPendingServiceQuantities({})
                        setSelectedDate('')
                        setSelectedTime('')
                        setSelectedHour(null)
                        setSelectedMinute(null)
                        setNotes('')
                        setBookingReceipt(null)
                        setPostBookingPhase('none')
                      }}
                    >
                      Book another
                    </Button>
                    <Button asChild className="rounded-full bg-violet-500 hover:bg-violet-600">
                      <Link href="/">Return home</Link>
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {['business', 'client', 'services', 'datetime'].map((s, index) => {
                const stepNames = ['Business', 'Client', 'Products & Services', 'Date & Time']
                const currentStepIndex = ['business', 'client', 'services', 'datetime'].indexOf(step)
                const isActive = index <= currentStepIndex
                return (
                  <div key={s} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                      isActive ? 'bg-violet-500 border-violet-500 text-white' : 'border-gray-300 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    {index < 3 && (
                      <div className={`w-12 h-0.5 ${isActive ? 'bg-violet-500' : 'bg-gray-300'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Selected business banner — confirms who the client is booking with */}
            {selectedBusiness && step !== 'business' && (
              <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
                {formatImageUrl(selectedBusiness.profilePhoto) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formatImageUrl(selectedBusiness.profilePhoto) as string}
                    alt={selectedBusiness.name}
                    className="h-11 w-11 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
                    {getBusinessInitials(selectedBusiness.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">Booking with</p>
                  <p className="truncate font-display text-base font-bold text-slate-900">{selectedBusiness.name}</p>
                  {(selectedBusiness.district || selectedBusiness.address) && (
                    <p className="truncate text-xs text-slate-500">
                      {selectedBusiness.address || selectedBusiness.district}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Select Business */}
            {step === 'business' && (
              <Card className="rounded-[22px] border-2 border-violet-300 shadow-sm">
                <CardHeader>
                  <CardTitle>Select a Business</CardTitle>
                  <CardDescription>Choose the business you&apos;d like to book with</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-start mb-4">
                    <Button variant="outline" size="sm" asChild className="gap-1">
                      <Link href="/">
                        <ChevronLeft className="h-4 w-4" />
                        Back to home
                      </Link>
                    </Button>
                  </div>
                  {businesses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No businesses available at this time.</p>
                      <p className="text-sm text-gray-500">
                        Please contact the administrator to set up business accounts.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="sticky top-[88px] z-10 -mx-2 px-2 py-3 bg-white/90 backdrop-blur border-b border-gray-100 rounded-md">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Location</Label>
                            <Select value={districtFilter} onValueChange={setDistrictFilter}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DISTRICTS.map((d) => (
                                  <SelectItem key={d.value} value={d.value}>
                                    {d.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Search</Label>
                            <div className="relative">
                              <Search className="h-4 w-4 text-violet-300 absolute left-3 top-1/2 -translate-y-1/2" />
                              <Input
                                value={businessSearch}
                                onChange={(e) => setBusinessSearch(e.target.value)}
                                placeholder="Search business name..."
                                className="pl-9"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                          <span>
                            Showing <span className="font-semibold text-gray-700">{visibleBusinesses.length}</span> business{visibleBusinesses.length === 1 ? '' : 'es'}
                          </span>
                          {(districtFilter !== 'ALL' || businessSearch.trim()) && (
                            <button
                              type="button"
                              className="text-violet-600 hover:text-violet-700 font-medium"
                              onClick={() => {
                                setDistrictFilter('ALL')
                                setBusinessSearch('')
                              }}
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </div>

                      {visibleBusinesses.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-gray-600 mb-2">No businesses match your filters.</p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setDistrictFilter('ALL')
                              setBusinessSearch('')
                            }}
                          >
                            Clear filters
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-1">
                          {DISTRICTS.filter((d) => d.value !== 'ALL').map((d) => {
                            const list = businessesByDistrict.get(d.value) || []
                            if (list.length === 0) return null
                            return (
                              <details
                                key={d.value}
                                className="group rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                                open={districtFilter !== 'ALL' || businessSearch.trim() ? true : list.length <= 2}
                              >
                                <summary className="cursor-pointer select-none list-none px-4 py-3 flex items-center justify-between bg-violet-50/80 border-b border-violet-100">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{d.label}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                      {list.length}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500 group-open:hidden">Show</span>
                                  <span className="text-xs text-gray-500 hidden group-open:inline">Hide</span>
                                </summary>
                                <div className="p-4 pt-3 bg-white">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {list.map((business) => (
                                      <button
                                        key={business.id}
                                        onClick={() => handleBusinessSelect(business.id)}
                                        className="group relative w-full text-left rounded-[22px] border-2 border-violet-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden px-4 py-3.5"
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/70 via-white to-white pointer-events-none" />
                                        <div className="relative flex items-center gap-3 sm:gap-4 min-h-[92px]">
                                          <div className="min-w-0 flex-1 pr-2">
                                            <h4 className="font-semibold text-slate-900 truncate text-[1.35rem] leading-tight">
                                              {business.name}
                                            </h4>
                                            <div className="mt-1.5 flex items-center gap-2">
                                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                business.isOpenNow === true
                                                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                                  : business.isOpenNow === false
                                                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                                              }`}>
                                                {business.isOpenNow === true ? 'Open now' : business.isOpenNow === false ? 'Closed now' : 'Hours unavailable'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                                              <Clock className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                              <span className="truncate">{business.todayHours || 'Tap to view hours'}</span>
                                            </div>
                                            <div className="mt-1.5 flex flex-col items-start gap-1 text-[11px] text-slate-500">
                                              <div className="flex items-center gap-1 min-w-0 max-w-full">
                                                <Phone className="h-3 w-3 text-violet-500 shrink-0" />
                                                <span className="truncate">{business.phone || 'No phone'}</span>
                                              </div>
                                              <div className="flex items-center gap-1 min-w-0 max-w-full">
                                                <MapPin className="h-3 w-3 text-violet-500 shrink-0" />
                                                <span className="truncate">{business.address || 'No address'}</span>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="shrink-0 flex flex-col items-center gap-2">
                                            <div className="h-14 w-14 rounded-xl border border-violet-200 bg-white shadow-sm flex items-center justify-center">
                                              {formatImageUrl(business.profilePhoto) ? (
                                                <img
                                                  src={formatImageUrl(business.profilePhoto) || ''}
                                                  alt={`${business.name} logo`}
                                                  className="h-12 w-12 rounded-lg object-cover"
                                                />
                                              ) : (
                                                <div className="h-12 w-12 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm ring-1 ring-violet-200/60">
                                                  {getBusinessInitials(business.name)}
                                                </div>
                                              )}
                                            </div>
                                            <span className="inline-flex items-center justify-center rounded-full bg-violet-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm group-hover:bg-violet-600 transition-colors">
                                              Select
                                            </span>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </details>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Client Information */}
            {step === 'client' && selectedBusiness && (
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                  <CardDescription>Are you a returning customer or new customer?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setStep('business')
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to select business
                    </Button>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant={isReturning ? 'default' : 'outline'}
                      onClick={() => setIsReturning(true)}
                      className="flex-1"
                    >
                      Returning Customer
                    </Button>
                    <Button
                      variant={!isReturning ? 'default' : 'outline'}
                      onClick={() => setIsReturning(false)}
                      className="flex-1"
                    >
                      New Customer
                    </Button>
                  </div>

                  {isReturning ? (
                    <div className="space-y-4">
                      {/* Look up by Client ID or phone — some people don't remember their ID. */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={lookupMode === 'id' ? 'default' : 'outline'}
                          onClick={() => setLookupMode('id')}
                          className="w-full"
                        >
                          Client ID
                        </Button>
                        <Button
                          type="button"
                          variant={lookupMode === 'phone' ? 'default' : 'outline'}
                          onClick={() => setLookupMode('phone')}
                          className="w-full"
                        >
                          Phone number
                        </Button>
                      </div>

                      {lookupMode === 'id' ? (
                        <div>
                          <Label htmlFor="clientId">Client ID</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="clientId"
                              placeholder="e.g., AR-1990-1"
                              value={clientId}
                              onChange={(e) => setClientId(e.target.value.toUpperCase())}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleClientIdLookup() }}
                              className="font-mono"
                            />
                            <Button onClick={handleClientIdLookup} disabled={isLoading || !clientId.trim()}>
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Enter your Client ID from a previous booking
                          </p>
                        </div>
                      ) : (
                        <div>
                          <Label htmlFor="lookupPhone">Phone number</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              id="lookupPhone"
                              type="tel"
                              placeholder="e.g., 610-1234"
                              value={lookupPhone}
                              onChange={(e) => setLookupPhone(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleClientIdLookup() }}
                            />
                            <Button onClick={handleClientIdLookup} disabled={isLoading || !lookupPhone.trim()}>
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Use the phone number you booked with before
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={newClient.firstName}
                            onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={newClient.lastName}
                            onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newClient.email}
                          onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={newClient.phone}
                          onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="birthday">Birthday</Label>
                        <Input
                          id="birthday"
                          type="date"
                          value={newClient.birthday}
                          onChange={(e) => setNewClient({ ...newClient, birthday: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleCreateNewClient} disabled={isLoading} className="w-full">
                        Continue
                      </Button>
                    </div>
                  )}

                  {client && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Client Found:</strong> {client.firstName} {client.lastName}
                        {client.clientId && (
                          <span className="block mt-1 font-mono text-green-600">ID: {client.clientId}</span>
                        )}
                      </p>
                      <Button onClick={() => setStep('services')} className="mt-3 w-full">
                        Continue to products &amp; services
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Services preview — lets the client see what's on offer while filling out their info */}
            {step === 'client' && selectedBusiness && services.length > 0 && (
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Services offered</CardTitle>
                  <CardDescription>You&apos;ll pick services on the next step.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {servicesByCategory.map(([categoryName, categoryServices]) => (
                    <div key={categoryName}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-600">{categoryName}</p>
                      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                        {categoryServices.map((service) => {
                          const priceLabel = (service as any).hidePrice
                            ? 'Price on request'
                            : service.price != null && !Number.isNaN(Number(service.price))
                            ? `$${Number(service.price).toFixed(2)}`
                            : '—'
                          return (
                            <li key={service.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">{service.name}</p>
                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(service.durationMinutes, service.durationUnit)}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                                {priceLabel}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Select products & services */}
            {step === 'services' && client && (
              <Card className="rounded-[22px] border-2 border-violet-300 shadow-sm">
                <CardHeader>
                  <CardTitle>Select products &amp; services</CardTitle>
                  <CardDescription>
                    Browse by categoryâ€”tap a category row to collapse or expand it. Tap a card to view photos + description.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
                  <div className="col-span-full flex justify-start lg:col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setStep('client')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to client information
                    </Button>
                  </div>
                  <div className="space-y-6 min-w-0">
                    {services.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No products or services available for this business.</p>
                      </div>
                    ) : (
                      <>
                        {servicesByCategory.map(([categoryName, categoryServices]) => {
                        const categoryCollapsed = collapsedCategoryNames.includes(categoryName)
                        return (
                          <div
                            key={categoryName}
                            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleCategoryCollapsed(categoryName)}
                              aria-expanded={!categoryCollapsed}
                              className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-violet-300/75 border-b border-violet-200 text-left hover:bg-violet-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-inset"
                            >
                              <span className="text-sm font-semibold text-white min-w-0">{categoryName}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/95 text-violet-600 tabular-nums">
                                  {categoryServices.length}
                                </span>
                                <ChevronDown
                                  className={`h-5 w-5 text-white shrink-0 transition-transform duration-200 ${
                                    categoryCollapsed ? '-rotate-90' : 'rotate-0'
                                  }`}
                                  aria-hidden
                                />
                              </div>
                            </button>
                            {!categoryCollapsed && (
                            <div className="p-4 pt-3 bg-white">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 items-start">
                                {categoryServices.map((service) => {
                                  const quantity = getPendingQuantity(service.id)
                                  const isSelected =
                                    quantity > 0 || bookingLines.some((l) => l.serviceId === service.id)
                                  const priceLabel =
                                    (service as any).hidePrice
                                      ? 'Price on request'
                                      : service.price != null && !Number.isNaN(Number(service.price))
                                      ? `$${Number(service.price).toFixed(2)}`
                                      : 'â€”'
                                  const imgUrl = formatImageUrl(service.imageUrl) || serviceFallbackImage
                                  return (
                                    <div
                                      key={`${categoryName}-${service.id}`}
                                      className={`rounded-[22px] border overflow-hidden transition-all self-start w-full ${
                                        isSelected
                                          ? 'border-violet-500 ring-2 ring-violet-400/40 shadow-[0_10px_24px_rgba(236,72,153,0.16)]'
                                          : 'border-violet-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                                      }`}
                                    >
                                      <div className="w-full bg-white px-3 py-3 sm:px-3.5 sm:py-3.5">
                                        <div className="flex flex-col gap-2 min-h-[132px]">
                                          <div className="flex items-start justify-between gap-3">
                                            <div className={`h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-white shadow-sm overflow-hidden flex items-center justify-center border ${isSelected ? 'border-violet-300 ring-2 ring-violet-200/60' : 'border-violet-100'}`}>
                                              {imgUrl ? (
                                                <img
                                                  src={imgUrl}
                                                  alt={service.name}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <div className="h-full w-full bg-violet-100 text-violet-700 flex items-center justify-center font-semibold text-sm sm:text-base">
                                                  {getServiceInitial(service.name)}
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex min-w-0 flex-col items-end gap-1 text-right">
                                              <span className="inline-flex items-center justify-center rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-800 border border-slate-200">
                                                {priceLabel}
                                              </span>
                                              <span className="inline-flex items-center justify-end gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] sm:text-[11px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                                                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-violet-600" />
                                                {formatDuration(service.durationMinutes, service.durationUnit)}
                                              </span>
                                            </div>
                                          </div>

                                          <h4 className="font-semibold text-slate-900 line-clamp-2 text-sm leading-snug text-left min-h-[2.25rem]">
                                            {service.name}
                                          </h4>

                                          <div className="flex flex-row flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 w-full">
                                            <div className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-violet-50 p-0.5">
                                              <button
                                                type="button"
                                                className="h-6 w-6 inline-flex items-center justify-center rounded-full text-violet-700 hover:bg-violet-100 disabled:opacity-40"
                                                onClick={() => decrementServiceQuantity(service.id)}
                                                aria-label="Decrease quantity"
                                                disabled={quantity <= 0}
                                              >
                                                <Minus className="h-3 w-3" />
                                              </button>
                                              <span className="px-1.5 text-[13px] font-semibold text-violet-700 min-w-[1.75rem] text-center tabular-nums">
                                                {quantity}
                                              </span>
                                              <button
                                                type="button"
                                                className="h-6 w-6 inline-flex items-center justify-center rounded-full text-violet-700 hover:bg-violet-100"
                                                onClick={() => incrementServiceQuantity(service.id)}
                                                aria-label="Increase quantity"
                                              >
                                                <Plus className="h-3 w-3" />
                                              </button>
                                            </div>
                                            <Button
                                              type="button"
                                              className="h-7 shrink-0 rounded-full bg-violet-500 hover:bg-violet-600 text-[11px] px-2.5 whitespace-nowrap"
                                              onClick={() => commitBookingLine(service.id)}
                                            >
                                              <span className="hidden sm:inline">Add booking</span>
                                              <span className="sm:hidden">Add</span>
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setActiveServiceId((prev) => (prev === service.id ? null : service.id))
                                        }}
                                        className="flex w-full items-center justify-center gap-1 border-t border-violet-200 bg-violet-500 py-1.5 text-white hover:bg-violet-600 transition-colors"
                                      >
                                        <span className="text-xs font-semibold">View</span>
                                        <ChevronDown
                                          className={`h-4 w-4 shrink-0 opacity-90 transition-transform ${activeServiceId === service.id ? 'rotate-180' : ''}`}
                                        />
                                      </button>
                                      {activeServiceId === service.id && (
                                        <div className="border-t border-violet-100 bg-gradient-to-b from-violet-50/40 to-white p-3 sm:p-4">
                                          <div className="space-y-3">
                                            <div>
                                              {(() => {
                                                const descriptionLines = getServiceDescriptionLines(service.description)
                                                if (!descriptionLines.length) {
                                                  const fallback = getServiceFallbackDetails(service)
                                                  return (
                                                    <div className="space-y-2.5">
                                                      <p className="text-sm text-slate-700 leading-relaxed">{fallback.summary}</p>
                                                      <ul className="space-y-2">
                                                        {fallback.bullets.map((line, idx) => (
                                                          <li key={`${service.id}-fallback-inline-${idx}`} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                                                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                                                            <span>{line}</span>
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )
                                                }
                                                if (descriptionLines.length === 1) {
                                                  return <p className="text-sm text-slate-700 leading-relaxed">{descriptionLines[0]}</p>
                                                }
                                                return (
                                                  <ul className="space-y-2">
                                                    {descriptionLines.map((line, idx) => (
                                                      <li key={`${service.id}-inline-line-${idx}`} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                                                        <span>{line}</span>
                                                      </li>
                                                    ))}
                                                  </ul>
                                                )
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            )}
                          </div>
                        )
                        })}
                      </>
                    )}
                  </div>

                  {/* Desktop right-side summary */}
                  <div className="hidden lg:block">
                    <div className="sticky top-4">
                      {bookingLines.length > 0 ? (
                        <div className="rounded-[22px] border-2 border-violet-200 bg-white p-4 sm:p-5 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking Summary</p>
                          <div className="mt-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <span className="text-sm text-slate-600">Selected items</span>
                              <span className="text-sm font-semibold text-slate-900">{totalSelectedQuantity}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <span className="text-sm text-slate-600">Total duration</span>
                              <span className="text-sm font-semibold text-slate-900">{formatSummaryDuration(totalDuration)}</span>
                            </div>

                            {selectedLineItems.length > 0 && (
                              <div className="space-y-2 border-b border-gray-100 pb-3 max-h-[300px] overflow-y-auto pr-1">
                                {selectedLineItems.map((item) => (
                                  <div key={item.lineId} className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-semibold text-slate-900 min-w-0">{item.name}</p>
                                      <button
                                        type="button"
                                        onClick={() => removeBookingLine(item.lineId)}
                                        className="shrink-0 rounded-full p-1 text-slate-500 hover:bg-violet-100 hover:text-violet-700 transition-colors"
                                        aria-label="Remove this line"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span>Qty {item.quantity} x ${item.unitPrice.toFixed(2)}</span>
                                        <span>${item.subtotal.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>GST (12.5%)</span>
                                        <span>${item.gstAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between font-semibold text-slate-700">
                                        <span>Line total</span>
                                        <span>${item.lineTotal.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Subtotal</span>
                              <span className="text-sm font-semibold text-slate-900">${totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">GST (12.5%)</span>
                              <span className="text-sm font-semibold text-slate-900">${totalGst.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-sm text-slate-700 font-medium">Total amount</span>
                              <span className="text-xl font-bold text-violet-600">${grandTotal.toFixed(2)}</span>
                            </div>
                            <Button onClick={() => setStep('datetime')} className="w-full mt-2 bg-violet-500 hover:bg-violet-600">
                              Continue to date &amp; time
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-slate-700">Booking Summary</p>
                          <p className="mt-1 text-sm text-slate-500">You can book a consultation without selecting items.</p>
                          <Button onClick={() => setStep('datetime')} className="w-full mt-3 bg-violet-500 hover:bg-violet-600">
                            Continue to date &amp; time
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile summary (stays below list) */}
                  <div className="lg:hidden">
                    <div className="rounded-[22px] border-2 border-violet-200 bg-white p-4 sm:p-5 shadow-sm">
                      <div className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5 flex flex-col justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Check className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-slate-900">Ready to schedule</p>
                              <p className="text-xs text-slate-500">Continue to pick a date and time.</p>
                            </div>
                          </div>
                          <Button onClick={() => setStep('datetime')} className="w-full mt-4 bg-violet-500 hover:bg-violet-600">
                            Continue to date &amp; time
                          </Button>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking Summary</p>
                          <div className="mt-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <span className="text-sm text-slate-600">Selected items</span>
                              <span className="text-sm font-semibold text-slate-900">{totalSelectedQuantity}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                              <span className="text-sm text-slate-600">Total duration</span>
                              <span className="text-sm font-semibold text-slate-900">{formatSummaryDuration(totalDuration)}</span>
                            </div>

                            {selectedLineItems.length > 0 && (
                              <div className="space-y-2 border-b border-gray-100 pb-3">
                                {selectedLineItems.map((item) => (
                                  <div key={item.lineId} className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-semibold text-slate-900 min-w-0">{item.name}</p>
                                      <button
                                        type="button"
                                        onClick={() => removeBookingLine(item.lineId)}
                                        className="shrink-0 rounded-full p-1 text-slate-500 hover:bg-violet-100 hover:text-violet-700 transition-colors"
                                        aria-label="Remove this line"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <span>Qty {item.quantity} x ${item.unitPrice.toFixed(2)}</span>
                                        <span>${item.subtotal.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span>GST (12.5%)</span>
                                        <span>${item.gstAmount.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center justify-between font-semibold text-slate-700">
                                        <span>Line total</span>
                                        <span>${item.lineTotal.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">Subtotal</span>
                              <span className="text-sm font-semibold text-slate-900">${totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-600">GST (12.5%)</span>
                              <span className="text-sm font-semibold text-slate-900">${totalGst.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-sm text-slate-700 font-medium">Total amount</span>
                              <span className="text-xl font-bold text-violet-600">${grandTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Select Date & Time */}
            {step === 'datetime' && client && (
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Select Date &amp; Time</CardTitle>
                  <CardDescription>Choose when you&apos;d like your appointment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setStep('services')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back to products &amp; services
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
                  {/* Calendar â€” left on large screens */}
                  <div className="min-w-0">
                    <Label>Select Date *</Label>
                    <div className="mt-2 border border-gray-200 rounded-lg p-4 bg-white">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                          className="h-8 w-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="font-semibold text-gray-900">
                          {format(calendarMonth, 'MMMM yyyy')}
                        </h3>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar Days */}
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const monthStart = startOfMonth(calendarMonth)
                          const monthEnd = endOfMonth(calendarMonth)
                          const startDate = monthStart
                          const endDate = monthEnd
                          const days = eachDayOfInterval({ start: startDate, end: endDate })
                          const firstDayOfWeek = getDay(monthStart)
                          
                          const cells = []
                          
                          // Add empty cells for days before month starts
                          for (let i = 0; i < firstDayOfWeek; i++) {
                            cells.push(<div key={`empty-${i}`} className="aspect-square" />)
                          }
                          
                          // Add day cells
                          days.forEach((day) => {
                            const selectedDateObj = selectedDate ? parseLocalDate(selectedDate) : null
                            const isSelected = selectedDateObj && isSameDay(day, selectedDateObj)
                            const isCurrentDay = isToday(day)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const dayStart = new Date(day)
                            dayStart.setHours(0, 0, 0, 0)
                            const isPast = dayStart < today
                            const isBusinessDayForDate = isBusinessDay(day)
                            
                            cells.push(
                              <button
                                key={day.toISOString()}
                                onClick={() => {
                                  if (!isPast && isBusinessDayForDate) {
                                    setSelectedDate(format(day, 'yyyy-MM-dd'))
                                    setSelectedTime('')
                                    setSelectedHour(null)
                                    setSelectedMinute(null)
                                  }
                                }}
                                disabled={isPast || !isBusinessDayForDate}
                                className={`aspect-square rounded-md text-sm font-medium transition-colors ${
                                  isPast
                                    ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                                    : !isBusinessDayForDate
                                    ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-violet-500 text-white hover:bg-violet-600'
                                    : isCurrentDay
                                    ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                    : 'text-gray-700 bg-white hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                {format(day, 'd')}
                              </button>
                            )
                          })
                          
                          return cells
                        })()}
                      </div>
                    </div>
                    {selectedDate && (
                      <p className="text-xs text-gray-600 mt-2">
                        Selected: {format(parseLocalDate(selectedDate), 'EEEE, MMMM d, yyyy')}
                      </p>
                    )}
                  </div>

                  {/* Time slots â€” right on large screens */}
                  <div className="min-w-0 flex flex-col min-h-[280px] lg:min-h-[360px]">
                    <Label>Available time slots *</Label>
                    {appointmentsLoadError && selectedDate && (
                      <p className="mt-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                        We couldn&apos;t load this day&apos;s bookings. Refresh the page or try another date â€” otherwise a time may look free but fail when you submit.
                      </p>
                    )}
                    {selectedDate && bookingLines.length > 0 && totalDuration === 0 && (
                      <p className="mt-1.5 text-xs text-red-900 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                        Your selected services don&apos;t have a duration on file, so times can&apos;t be validated here. Go back to Services and re-add them, or contact the business.
                      </p>
                    )}
                    {selectedDate && durationExceedsDetails && (
                      <p className="mt-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                        These services total{' '}
                        <strong>{formatDuration(totalDuration, 'MINUTES')}</strong> of booking time, but on this date
                        the business is only open <strong>{durationExceedsDetails.windowMinutes} minutes</strong> (
                        {durationExceedsDetails.startLabel}â€“{durationExceedsDetails.endLabel}). Remove items or book
                        another day â€” no start time fits before closing.
                      </p>
                    )}
                    {!selectedDate ? (
                      <div className="mt-2 flex flex-1 items-center justify-center rounded-lg border border-dashed border-violet-200/80 bg-violet-50/40 px-4 py-10 text-center text-sm text-slate-500">
                        Select a date on the left to see available times here.
                      </div>
                    ) : loadingAppointments ? (
                      <div className="mt-2 flex flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white p-8 text-gray-500">
                        Loading available times...
                      </div>
                    ) : (
                      <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden flex flex-col flex-1 min-h-0 bg-white">
                          {timeSlots.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                              {!isBusinessDay(parseLocalDate(selectedDate)) 
                                ? 'This business is closed on this day. Please select another date.'
                                : 'No available time slots for this date.'}
                            </div>
                          ) : (
                            <div className="max-h-[min(420px,50vh)] overflow-y-auto flex-1">
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3">
                                {timeSlots.map((slot) => {
                                  const isAvailable = isSlotAvailable(slot.hour, slot.minute)
                                  const canFit = canFitDuration(slot.hour, slot.minute)
                                  const isSelected = selectedHour === slot.hour && selectedMinute === slot.minute
                                  const slotTime = parseLocalDate(selectedDate)
                                  slotTime.setHours(slot.hour, slot.minute, 0, 0)
                                  const isUnavailable = !isAvailable || !canFit
                                  
                                  return (
                                    <button
                                      key={`${slot.hour}-${slot.minute}`}
                                      onClick={() => {
                                        if (!isUnavailable) {
                                          handleTimeSlotClick(slot.hour, slot.minute)
                                        } else {
                                          // Show why it's unavailable
                                          if (!isAvailable) {
                                            toast({
                                              title: 'Time Slot Unavailable',
                                              description: 'This time slot is already booked. Please select another time.',
                                              variant: 'destructive',
                                            })
                                          } else if (!canFit) {
                                            toast({
                                              title: 'Time Slot Unavailable',
                                              description: `This time slot cannot accommodate the selected services (${formatSummaryDuration(totalDuration)}). Please choose an earlier time or reduce services.`,
                                              variant: 'destructive',
                                            })
                                          }
                                        }
                                      }}
                                      disabled={isUnavailable}
                                      title={isUnavailable ? (isAvailable ? 'Cannot fit selected services' : 'Already booked') : 'Available'}
                                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                                        isUnavailable
                                          ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                                          : isSelected
                                          ? 'bg-violet-500 border-violet-500 text-white hover:bg-violet-600 shadow-md'
                                          : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50'
                                      }`}
                                    >
                                      {format(slotTime, 'h:mm a')}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                    {selectedDate && selectedTime && (
                      <p className="text-xs text-gray-600 mt-2">
                        Selected time:{' '}
                        {format(
                          (() => {
                            const d = parseLocalDate(selectedDate)
                            d.setHours(selectedHour || 0, selectedMinute || 0, 0, 0)
                            return d
                          })(),
                          'h:mm a'
                        )}
                      </p>
                    )}
                  </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Any special requests or notes..."
                    />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Total Duration</span>
                      <span className="font-semibold">{formatSummaryDuration(totalDuration)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Price</span>
                      <span className="text-lg font-semibold text-violet-600">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button onClick={handleBookAppointment} disabled={isLoading || !selectedDate || !selectedTime} className="w-full">
                    {isLoading ? 'Booking...' : 'Book Appointment'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <Toaster />
    </div>
  )
}

