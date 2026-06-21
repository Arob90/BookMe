'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Clock, MapPin } from 'lucide-react'

export type LocationValue =
  | 'COROZAL'
  | 'ORANGE_WALK'
  | 'BELIZE'
  | 'CAYO'
  | 'STANN_CREEK'
  | 'TOLEDO'
  | 'SAN_PEDRO'
  | 'CAYE_CAULKER'
  | 'UNKNOWN'

export type MapBusiness = {
  id: string
  name: string
  location?: string | null
}

const LOCATION_LABELS: Record<LocationValue, string> = {
  COROZAL: 'Corozal',
  ORANGE_WALK: 'Orange Walk',
  BELIZE: 'Belize',
  CAYO: 'Cayo',
  STANN_CREEK: 'Stann Creek',
  TOLEDO: 'Toledo',
  SAN_PEDRO: 'San Pedro',
  CAYE_CAULKER: 'Caye Caulker',
  UNKNOWN: 'Other / Not set',
}

// Map palette based on your reference + your additions:
// - San Pedro: teal
// - Caye Caulker: coral
const LOCATION_COLORS: Record<LocationValue, { fill: string; stroke: string }> = {
  COROZAL: { fill: '#F4C542', stroke: '#D2A425' }, // warm yellow
  ORANGE_WALK: { fill: '#E24B4B', stroke: '#C63A3A' }, // red
  BELIZE: { fill: '#6BB24A', stroke: '#4E8E35' }, // green (from reference map)
  CAYO: { fill: '#2C7ACB', stroke: '#1F5FA1' }, // blue
  STANN_CREEK: { fill: '#7C3AED', stroke: '#5B21B6' }, // purple
  TOLEDO: { fill: '#F08A2A', stroke: '#D46F16' }, // orange
  SAN_PEDRO: { fill: '#0EA5A5', stroke: '#0B7C7C' }, // teal
  CAYE_CAULKER: { fill: '#FF6F61', stroke: '#E55B4E' }, // coral
  UNKNOWN: { fill: '#E5E7EB', stroke: '#CBD5E1' }, // gray
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] || 'B'
  const b = parts[1]?.[0] || parts[0]?.[1] || ''
  return (a + b).toUpperCase()
}

function normalizeLocation(value?: string | null): LocationValue {
  const v = value?.trim()?.toUpperCase()
  if (!v) return 'UNKNOWN'
  const allowed: LocationValue[] = [
    'COROZAL',
    'ORANGE_WALK',
    'BELIZE',
    'CAYO',
    'STANN_CREEK',
    'TOLEDO',
    'SAN_PEDRO',
    'CAYE_CAULKER',
    'UNKNOWN',
  ]
  return (allowed.includes(v as LocationValue) ? (v as LocationValue) : 'UNKNOWN')
}

export function BelizeMapSelector(props: {
  businesses: MapBusiness[]
  onPickLocation: (location: LocationValue) => void
  onPickBusiness: (businessId: string) => void
}) {
  const { businesses, onPickLocation, onPickBusiness } = props
  const [open, setOpen] = useState(false)
  const [activeLocation, setActiveLocation] = useState<LocationValue>('BELIZE')

  const businessesForActive = useMemo(() => {
    const loc = activeLocation
    return businesses
      .filter((b) => normalizeLocation(b.location) === loc)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [businesses, activeLocation])

  const handleClickLocation = (loc: LocationValue) => {
    setActiveLocation(loc)
    onPickLocation(loc)
    setOpen(true)
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-pink-600" />
          <p className="text-sm font-semibold text-gray-900">Pick a location on the map</p>
        </div>
        <p className="text-xs text-gray-500">Opens a list of businesses</p>
      </div>

      {/* Belize map - geographically accurate district boundaries (Caribbean coast on right) */}
      <div className="p-4 bg-gradient-to-b from-white to-gray-50">
        <div className="mx-auto max-w-md">
          <svg viewBox="0 0 150 360" className="w-full h-auto" role="img" aria-label="Belize map selector">
            {/* Mainland districts - based on actual Belize geography */}
            {/* COROZAL - northeast, borders Mexico (N) and Caribbean (E) */}
            <path
              d="M18 0 L72 0 L72 38 L45 52 L30 48 Z"
              fill={LOCATION_COLORS.COROZAL.fill}
              stroke={LOCATION_COLORS.COROZAL.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('COROZAL')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            {/* ORANGE WALK - northwest, inland, borders Guatemala (W) */}
            <path
              d="M0 8 L18 0 L30 48 L28 92 L12 85 Z"
              fill={LOCATION_COLORS.ORANGE_WALK.fill}
              stroke={LOCATION_COLORS.ORANGE_WALK.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('ORANGE_WALK')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            {/* BELIZE - central-east coast, Belize City */}
            <path
              d="M45 52 L72 38 L78 88 L76 158 L62 182 L48 168 L45 115 Z"
              fill={LOCATION_COLORS.BELIZE.fill}
              stroke={LOCATION_COLORS.BELIZE.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('BELIZE')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            {/* CAYO - large west/center, Belmopan, borders Guatemala */}
            <path
              d="M28 92 L45 52 L45 115 L48 168 L38 232 L22 248 L14 212 L10 135 Z"
              fill={LOCATION_COLORS.CAYO.fill}
              stroke={LOCATION_COLORS.CAYO.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('CAYO')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            {/* STANN CREEK - southeast coast, Dangriga */}
            <path
              d="M48 168 L62 182 L66 232 L58 268 L44 255 L42 218 Z"
              fill={LOCATION_COLORS.STANN_CREEK.fill}
              stroke={LOCATION_COLORS.STANN_CREEK.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('STANN_CREEK')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            {/* TOLEDO - southernmost */}
            <path
              d="M22 248 L38 232 L42 218 L44 255 L58 268 L52 318 L32 338 L10 318 L12 272 Z"
              fill={LOCATION_COLORS.TOLEDO.fill}
              stroke={LOCATION_COLORS.TOLEDO.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('TOLEDO')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />

            {/* Cayes: Ambergris Caye (San Pedro) runs N-S off northern coast; Caye Caulker below it */}
            <ellipse
              cx="108"
              cy="88"
              rx="20"
              ry="7"
              fill={LOCATION_COLORS.SAN_PEDRO.fill}
              stroke={LOCATION_COLORS.SAN_PEDRO.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('SAN_PEDRO')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />
            <ellipse
              cx="102"
              cy="128"
              rx="12"
              ry="5"
              fill={LOCATION_COLORS.CAYE_CAULKER.fill}
              stroke={LOCATION_COLORS.CAYE_CAULKER.stroke}
              strokeWidth="1.5"
              onClick={() => handleClickLocation('CAYE_CAULKER')}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            />

            {/* Labels */}
            <g fontFamily="ui-sans-serif, system-ui" fontSize="9" fill="#111827" fontWeight="500">
              <text x="42" y="28">Corozal</text>
              <text x="10" y="45">Orange Walk</text>
              <text x="58" y="125">Belize</text>
              <text x="24" y="168">Cayo</text>
              <text x="50" y="242">Stann Creek</text>
              <text x="28" y="298">Toledo</text>
              <text x="112" y="88">San Pedro</text>
              <text x="106" y="130">Caye Caulker</text>
            </g>
          </svg>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{LOCATION_LABELS[activeLocation]}</DialogTitle>
          </DialogHeader>

          {businessesForActive.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-gray-600">No businesses found for this location yet.</p>
              <p className="text-xs text-gray-500 mt-1">Try another location on the map.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {businessesForActive.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    onPickBusiness(b.id)
                    setOpen(false)
                  }}
                  className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-pink-500 hover:bg-pink-50/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-semibold">
                      {getInitials(b.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                        <span className="text-xs font-medium text-pink-600">Select</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>Continue booking</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

