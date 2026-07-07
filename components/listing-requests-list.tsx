'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Inbox, Mail, Phone, Trash2, Tag } from 'lucide-react'
import {
  getListingRequests, updateListingRequestStatus, deleteListingRequest,
} from '@/app/actions/listing-requests'

type Request = Awaited<ReturnType<typeof getListingRequests>>[number]
type Status = 'NEW' | 'CONTACTED' | 'CLOSED'

const STATUS_STYLE: Record<Status, string> = {
  NEW: 'bg-violet-100 text-violet-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

export function ListingRequestsList({ initialRequests }: { initialRequests: Request[] }) {
  const { toast } = useToast()
  const router = useRouter()
  const [requests, setRequests] = useState<Request[]>(initialRequests)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (!q) return true
      return `${r.fullName} ${r.email} ${r.phone ?? ''} ${r.source ?? ''} ${r.message ?? ''}`.toLowerCase().includes(q)
    })
  }, [requests, search, statusFilter])

  const newCount = requests.filter((r) => r.status === 'NEW').length

  const setStatus = async (id: string, status: Status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    try {
      await updateListingRequestStatus(id, status)
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
      try { setRequests(await getListingRequests()) } catch { /* ignore */ }
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteListingRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
      toast({ title: 'Deleted' })
      router.refresh()
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-violet-500" />
            Listing & advertising requests
            {newCount > 0 && <Badge className="border-0 bg-violet-600 text-white">{newCount} new</Badge>}
          </CardTitle>
          <CardDescription>
            Leads from the “list your business / advertise with us” forms. Also emailed to sasoandco.ltd@gmail.com.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / email / message…" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-900">No requests</p>
              <p className="mt-1 text-sm text-slate-500">New enquiries from the marketing pages will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{r.fullName}</p>
                        <Badge className={`border-0 text-[10px] ${STATUS_STYLE[r.status as Status] ?? ''}`}>{r.status}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 hover:text-violet-600">
                          <Mail className="h-3.5 w-3.5" /> {r.email}
                        </a>
                        {r.phone && (
                          <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 hover:text-violet-600">
                            <Phone className="h-3.5 w-3.5" /> {r.phone}
                          </a>
                        )}
                        {r.source && (
                          <span className="inline-flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> {r.source}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>

                  {r.message && (
                    <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{r.message}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select value={r.status} onValueChange={(v) => setStatus(r.id, v as Status)}>
                      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-700 border-red-200 hover:bg-red-50">
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this request?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently removes the lead. This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600" onClick={() => remove(r.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
