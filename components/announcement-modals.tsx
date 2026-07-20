'use client'

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PartyPopper, Gift, Heart, Sparkles, CalendarDays } from 'lucide-react'
import {
  getPendingAnnouncements, acknowledgeAnnouncement, type PendingAnnouncement,
} from '@/app/actions/announcements'

const STYLE: Record<string, { Icon: typeof PartyPopper; ring: string; cta: string }> = {
  IDEA_APPROVED: { Icon: PartyPopper, ring: 'bg-violet-100 text-violet-600', cta: 'Yay! 🎉' },
  IDEA_REWARD: { Icon: Gift, ring: 'bg-emerald-100 text-emerald-600', cta: 'Thank you! 💜' },
  SUPPORT_REWARD: { Icon: Heart, ring: 'bg-rose-100 text-rose-600', cta: 'Appreciate it 🙏' },
  GENERIC: { Icon: Sparkles, ring: 'bg-violet-100 text-violet-600', cta: 'Got it' },
  WELCOME: { Icon: CalendarDays, ring: 'bg-violet-100 text-violet-600', cta: "Let's go! 🎉" },
}

/** Shows queued celebratory modals to the provider, one at a time, then acknowledges each. */
export function AnnouncementModals() {
  const [queue, setQueue] = useState<PendingAnnouncement[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    let cancelled = false
    getPendingAnnouncements()
      .then((a) => { if (!cancelled) setQueue(a) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const current = queue[idx]
  if (!current) return null

  const style = STYLE[current.kind] ?? STYLE.GENERIC
  const days = typeof current.meta?.days === 'number' ? (current.meta.days as number) : null

  // A trailing "XoXo,\n<name>" paragraph renders as a handwritten sign-off.
  const paragraphs = current.body?.split('\n\n') ?? []
  const hasSignOff = paragraphs.length > 0 && paragraphs[paragraphs.length - 1].startsWith('XoXo,')
  const bodyText = hasSignOff ? paragraphs.slice(0, -1).join('\n\n') : current.body
  const signOffLines = hasSignOff ? paragraphs[paragraphs.length - 1].split('\n') : null

  const next = async () => {
    try { await acknowledgeAnnouncement(current.id) } catch { /* ignore */ }
    setIdx((i) => i + 1)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) next() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${style.ring}`}>
            <style.Icon className="h-8 w-8" />
          </span>
          <DialogTitle className="mt-4 text-xl">{current.title}</DialogTitle>
          {bodyText && (
            <DialogDescription className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {bodyText}
            </DialogDescription>
          )}
          {signOffLines && (
            <div className="mt-1 text-center text-sm leading-relaxed text-slate-600">
              <p>{signOffLines[0]}</p>
              {signOffLines[1] && (
                <p className="mt-0.5 font-signature text-4xl leading-tight text-violet-700">{signOffLines[1]}</p>
              )}
            </div>
          )}
        </DialogHeader>

        {days != null && (
          <div className="mx-auto rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
            +{days} free days added
          </div>
        )}

        <DialogFooter className="sm:justify-center">
          <Button onClick={next} className="bg-violet-600 hover:bg-violet-700">{style.cta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
