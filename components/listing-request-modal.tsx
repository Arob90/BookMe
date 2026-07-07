'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { CheckCircle2 } from 'lucide-react'
import { submitListingRequest } from '@/app/actions/listing-requests'

/**
 * A CTA that opens a lead-capture form (name / phone / email / message).
 * On submit it emails the admin inbox and stores the request.
 *
 * Render it in place of a link/button — pass the visual styling via `className`
 * and the label/icon as `children`. `source` records which CTA it came from.
 */
export function ListingRequestButton({
  source,
  className,
  children,
  title = 'Tell us about your business',
  description = 'Leave your details and we’ll get back to you about listing or advertising on BookMe.',
}: {
  source: string
  className?: string
  children: React.ReactNode
  title?: string
  description?: string
}) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', message: '', company: '' })

  const reset = () => {
    setForm({ fullName: '', phone: '', email: '', message: '', company: '' })
    setDone(false)
  }

  const submit = async () => {
    if (form.fullName.trim().length < 2) {
      toast({ title: 'Please enter your name', variant: 'destructive' })
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await submitListingRequest({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        message: form.message.trim() || null,
        source,
        company: form.company, // honeypot
      })
      setDone(true)
    } catch (e: any) {
      toast({ title: 'Something went wrong', description: e?.message ?? 'Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => { reset(); setOpen(true) }}>
        {children}
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
        <DialogContent className="max-w-md">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-3 font-display text-lg font-bold text-slate-900">Thanks — we got it!</h3>
              <p className="mt-1 text-sm text-slate-500">
                We’ll reach out to you shortly. Keep an eye on your email and phone.
              </p>
              <Button className="mt-5 bg-violet-600 hover:bg-violet-700" onClick={() => setOpen(false)}>Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                {/* Honeypot: hidden from users, catches bots. */}
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
                <div className="grid gap-1.5">
                  <div className="text-sm font-medium">Full name</div>
                  <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your name" />
                </div>
                <div className="grid gap-1.5">
                  <div className="text-sm font-medium">Email</div>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                </div>
                <div className="grid gap-1.5">
                  <div className="text-sm font-medium">Phone <span className="font-normal text-slate-400">(optional)</span></div>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+501 …" />
                </div>
                <div className="grid gap-1.5">
                  <div className="text-sm font-medium">Message <span className="font-normal text-slate-400">(optional)</span></div>
                  <Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your business or what you're interested in…" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={submit} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                  {saving ? 'Sending…' : 'Send'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
