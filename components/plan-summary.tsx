'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getTeamMembersForBusiness } from '@/app/actions/team-members'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { StaffSettings } from '@/components/staff-settings'
import { Users } from 'lucide-react'

export function PlanSummary() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [seatCap, setSeatCap] = useState<number>(1)
  const [seatsUsed, setSeatsUsed] = useState<number>(1)
  const [ownerEmail, setOwnerEmail] = useState<string>('')
  const [members, setMembers] = useState<
    Array<{ id: string; email: string; role: string; firstName: string | null; lastName: string | null }>
  >([])

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await getTeamMembersForBusiness()
      setSeatCap(res.seatCap)
      setSeatsUsed(res.seatsUsed)
      setOwnerEmail(res.owner.email)
      setMembers(
        res.members.map((m) => ({
          id: m.id,
          email: m.email,
          role: String(m.role),
          firstName: m.firstName ?? null,
          lastName: m.lastName ?? null,
        }))
      )
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to load plan', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const label = useMemo(() => {
    return `${seatsUsed} / ${seatCap} seat${seatCap === 1 ? '' : 's'} used`
  }, [seatsUsed, seatCap])

  const planName = useMemo(() => {
    if (seatCap <= 1) return 'Solo'
    if (seatCap <= 5) return 'Team (5)'
    if (seatCap <= 10) return 'Team (10)'
    return `Team (${seatCap})`
  }, [seatCap])

  const remaining = Math.max(0, seatCap - seatsUsed)
  const percent = seatCap > 0 ? Math.min(100, Math.round((seatsUsed / seatCap) * 100)) : 0

  const seatRows = useMemo(() => {
    const owner = {
      key: '__owner',
      email: ownerEmail || 'Owner',
      role: 'OWNER',
      name: 'Business owner',
    }
    const team = members.map((m) => {
      const full = `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim()
      return { key: m.id, email: m.email, role: m.role, name: full || 'Team member' }
    })
    return [owner, ...team]
  }, [members, ownerEmail])

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white py-4">
        <CardTitle className="text-base font-semibold text-gray-800">Plan</CardTitle>
        <div className="flex items-center justify-between gap-3">
          <CardDescription className="text-gray-600">Your seat allowance for staff logins.</CardDescription>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                aria-label="Manage staff"
                title="Manage staff"
              >
                <Users className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Staff</DialogTitle>
                <DialogDescription>Add, edit, or remove staff members for this business.</DialogDescription>
              </DialogHeader>
              <StaffSettings variant="plain" />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading plan…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Current plan</div>
                <div className="text-base font-semibold text-gray-900">{planName}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{label}</div>
                <div className="text-xs text-muted-foreground">
                  {remaining} seat{remaining === 1 ? '' : 's'} remaining
                </div>
              </div>
            </div>

            <div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                <div
                  className={`h-full ${percent >= 90 ? 'bg-rose-500' : percent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Seats = owner login + staff logins. Use the team icon above to manage staff.
              </div>
            </div>

            <div className="rounded-lg border bg-white">
              <div className="px-3 py-2 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Who’s using seats
              </div>
              <div className="divide-y">
                {seatRows.map((r) => (
                  <div key={r.key} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{r.email}</div>
                      <div className="text-xs text-muted-foreground">{r.name}</div>
                    </div>
                    <div className="text-[11px] rounded-full border px-2 py-0.5 text-muted-foreground w-fit">
                      {r.role}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

