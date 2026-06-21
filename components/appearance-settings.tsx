'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useSession } from 'next-auth/react'

type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_THEME = 'bookme.theme'
const STORAGE_ACCENT = 'bookme.accentHsl'

function scopedKey(base: string, userEmail: string | null | undefined): string {
  const safe = String(userEmail || 'anonymous').trim().toLowerCase()
  return `bookme.user.${safe}.${base}`
}

function hexToHsl(hex: string): string | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return null
  const n = m[1]
  const r = parseInt(n.slice(0, 2), 16) / 255
  const g = parseInt(n.slice(2, 4), 16) / 255
  const b = parseInt(n.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  const S = Math.round(s * 100)
  const L = Math.round(l * 100)
  return `${h} ${S}% ${L}%`
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  const dark = mode === 'dark' || (mode === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
}

function applyAccent(hsl: string) {
  document.documentElement.style.setProperty('--app-accent', hsl)
  // Also keep an RGB version for chart libraries.
  const m = hsl.trim().match(/^(\d+)\s+(\d+)%\s+(\d+)%$/)
  if (m) {
    const h = Number(m[1])
    const s = Number(m[2]) / 100
    const l = Number(m[3]) / 100
    const c = (1 - Math.abs(2 * l - 1)) * s
    const hh = (h % 360) / 60
    const x = c * (1 - Math.abs((hh % 2) - 1))
    let r1 = 0
    let g1 = 0
    let b1 = 0
    if (0 <= hh && hh < 1) {
      r1 = c
      g1 = x
    } else if (1 <= hh && hh < 2) {
      r1 = x
      g1 = c
    } else if (2 <= hh && hh < 3) {
      g1 = c
      b1 = x
    } else if (3 <= hh && hh < 4) {
      g1 = x
      b1 = c
    } else if (4 <= hh && hh < 5) {
      r1 = x
      b1 = c
    } else if (5 <= hh && hh < 6) {
      r1 = c
      b1 = x
    }
    const m2 = l - c / 2
    const r = Math.round((r1 + m2) * 255)
    const g = Math.round((g1 + m2) * 255)
    const b = Math.round((b1 + m2) * 255)
    document.documentElement.style.setProperty('--app-accent-rgb', `${r} ${g} ${b}`)
  }
}

export function AppearanceSettings() {
  const { data: session } = useSession()
  const userEmail = (session?.user as any)?.email as string | undefined

  const presets = useMemo(
    () => [
      { id: 'red', label: 'Red', hsl: '0 84% 60%', hex: '#ef4444' },
      { id: 'yellow', label: 'Yellow', hsl: '48 96% 53%', hex: '#eab308' },
      { id: 'pastel-yellow', label: 'Pastel yellow', hsl: '48 100% 85%', hex: '#fef08a' },
      { id: 'pink', label: 'Pink', hsl: '329 78% 58%', hex: '#ec4899' },
      { id: 'dusty-pink', label: 'Dusty pink', hsl: '340 35% 62%', hex: '#c08497' },
      { id: 'forest-green', label: 'Forest green', hsl: '154 51% 28%', hex: '#166534' },
      { id: 'sage-green', label: 'Sage green', hsl: '109 19% 62%', hex: '#a3b18a' },
      { id: 'violet', label: 'Violet', hsl: '262 83% 58%', hex: '#7c3aed' },
      { id: 'fushia', label: 'Fushia', hsl: '292 84% 61%', hex: '#d946ef' },
      { id: 'dusty-plum', label: 'Dusty plum', hsl: '285 23% 52%', hex: '#8b5f91' },
      { id: 'orange', label: 'Orange', hsl: '24 94% 50%', hex: '#f97316' },
      { id: 'pastel-orange', label: 'Pastel orange', hsl: '28 100% 85%', hex: '#fed7aa' },
      { id: 'light-blue', label: 'Light blue', hsl: '199 89% 75%', hex: '#7dd3fc' },
      { id: 'navy', label: 'Navy', hsl: '221 68% 30%', hex: '#1e3a8a' },
      { id: 'teal', label: 'Teal', hsl: '173 80% 40%', hex: '#0d9488' },
      { id: 'aqua', label: 'Aqua', hsl: '189 94% 43%', hex: '#06b6d4' },
      { id: 'brown', label: 'Brown', hsl: '25 38% 34%', hex: '#7c4a2d' },
      { id: 'taupe', label: 'Taupe', hsl: '30 12% 45%', hex: '#78716c' },
      { id: 'black', label: 'Black', hsl: '222 47% 11%', hex: '#111827' },
      { id: 'grey', label: 'Grey', hsl: '220 9% 46%', hex: '#6b7280' },
      { id: 'gold', label: 'Gold', hsl: '45 93% 47%', hex: '#ca8a04' },
    ],
    []
  )

  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [accentPreset, setAccentPreset] = useState<string>('pink')
  const [customHex, setCustomHex] = useState<string>('#ec4899')

  useEffect(() => {
    const themeKey = scopedKey('theme', userEmail)
    const accentKey = scopedKey('accentHsl', userEmail)

    // One-time migration: if global keys exist, move into this user scope.
    const legacyTheme = localStorage.getItem(STORAGE_THEME)
    if (!localStorage.getItem(themeKey) && legacyTheme) {
      localStorage.setItem(themeKey, legacyTheme)
    }
    const legacyAccent = localStorage.getItem(STORAGE_ACCENT)
    if (!localStorage.getItem(accentKey) && legacyAccent) {
      localStorage.setItem(accentKey, legacyAccent)
    }

    const storedTheme = (localStorage.getItem(themeKey) as ThemeMode | null) ?? 'system'
    setThemeMode(storedTheme)
    applyTheme(storedTheme)

    const storedAccent = localStorage.getItem(accentKey)
    if (storedAccent) {
      applyAccent(storedAccent)
      const preset = presets.find((p) => p.hsl === storedAccent)
      if (preset) {
        setAccentPreset(preset.id)
        setCustomHex(preset.hex)
      } else {
        setAccentPreset('custom')
      }
    } else {
      const d = presets.find((p) => p.id === 'pink') ?? presets[0]
      applyAccent(d.hsl)
    }

    const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => {
      const cur = (localStorage.getItem(themeKey) as ThemeMode | null) ?? 'system'
      if (cur === 'system') applyTheme('system')
    }
    mql?.addEventListener?.('change', onChange)
    return () => {
      mql?.removeEventListener?.('change', onChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, presets])

  const onThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode)
    localStorage.setItem(scopedKey('theme', userEmail), mode)
    applyTheme(mode)
  }

  const onAccentPresetChange = (id: string) => {
    setAccentPreset(id)
    if (id === 'custom') {
      const hsl = hexToHsl(customHex) || presets[0].hsl
      localStorage.setItem(scopedKey('accentHsl', userEmail), hsl)
      applyAccent(hsl)
      return
    }
    const preset = presets.find((p) => p.id === id) ?? presets[0]
    setCustomHex(preset.hex)
    localStorage.setItem(scopedKey('accentHsl', userEmail), preset.hsl)
    applyAccent(preset.hsl)
  }

  const onCustomHexChange = (hex: string) => {
    setCustomHex(hex)
    const hsl = hexToHsl(hex)
    if (!hsl) return
    setAccentPreset('custom')
    localStorage.setItem(scopedKey('accentHsl', userEmail), hsl)
    applyAccent(hsl)
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white py-4">
        <CardTitle className="text-base font-semibold text-gray-800">Appearance</CardTitle>
        <CardDescription className="text-gray-600">Theme and accent color.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Theme</Label>
            <Select value={themeMode} onValueChange={(v) => onThemeChange(v as ThemeMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Accent</Label>
            <Select value={accentPreset} onValueChange={onAccentPresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Custom accent color</Label>
            <div className="flex items-center gap-3">
              <Input
                type="color"
                value={customHex}
                onChange={(e) => onCustomHexChange(e.target.value)}
                className="h-10 w-16 p-1"
              />
              <Input
                value={customHex}
                onChange={(e) => onCustomHexChange(e.target.value)}
                placeholder="#ec4899"
                className="max-w-[180px]"
              />
              <div className="text-xs text-muted-foreground">
                Changes highlighted pink UI across the app.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

