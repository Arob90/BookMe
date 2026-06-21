'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { updateClient } from '@/app/actions/clients'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Building2, Receipt, UserCircle, Users, MapPin, X, CalendarDays } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EditClientDialogProps {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientUpdated?: () => void
  companies?: Array<{ id: string; companyName?: string | null; firstName?: string }>
  people?: Array<{ id: string; firstName: string; lastName: string; companyId?: string | null }>
}

export function EditClientDialog({ client, open, onOpenChange, onClientUpdated, companies = [], people = [] }: EditClientDialogProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [formData, setFormData] = useState({
    type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'COMPANY',
    firstName: '',
    lastName: '',
    companyName: '',
    companyId: '' as string,
    contactIds: [] as string[],
    taxId: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    birthday: '',
    companyFoundedAt: '',
    notes: '',
    vipTag: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when dialog opens or client changes
  useEffect(() => {
    if (open && client) {
      let birthdayFormatted = ''
      if (client.birthday) {
        const bday = new Date(client.birthday)
        birthdayFormatted = `${bday.getFullYear()}-${String(bday.getMonth() + 1).padStart(2, '0')}-${String(bday.getDate()).padStart(2, '0')}`
      }

      let companyFoundedFormatted = ''
      if (client.companyFoundedAt) {
        const fd = new Date(client.companyFoundedAt)
        companyFoundedFormatted = `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, '0')}-${String(fd.getDate()).padStart(2, '0')}`
      }

      const contacts = client.contacts || []
      const contactIds = contacts.map((c: any) => c.id)

      setFormData({
        type: (client.type || 'INDIVIDUAL') as 'INDIVIDUAL' | 'COMPANY',
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        companyName: client.companyName || client.firstName || '',
        companyId: client.companyId || '',
        contactIds,
        taxId: client.taxId || '',
        email: client.email || '',
        phone: client.phone || '',
        addressLine1: client.addressLine1 || '',
        addressLine2: client.addressLine2 || '',
        city: client.city || '',
        state: client.state || '',
        postalCode: client.postalCode || '',
        country: client.country || '',
        birthday: birthdayFormatted,
        companyFoundedAt: companyFoundedFormatted,
        notes: client.notes || '',
        vipTag: client.tags?.includes('VIP') || false,
      })
    }
  }, [open, client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.type === 'INDIVIDUAL' && (!formData.firstName?.trim() || !formData.lastName?.trim())) {
      toast({
        title: 'Error',
        description: 'First name and last name are required',
        variant: 'destructive',
      })
      return
    }
    if (formData.type === 'COMPANY' && !formData.companyName?.trim()) {
      toast({
        title: 'Error',
        description: 'Company name is required',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const tags = formData.vipTag ? ['VIP'] : []
      const payload = formData.type === 'COMPANY'
        ? {
            type: 'COMPANY' as const,
            companyName: formData.companyName || undefined,
            companyFoundedAt: formData.companyFoundedAt || null,
            contactIds: formData.contactIds,
            taxId: formData.taxId || undefined,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            addressLine1: formData.addressLine1 || undefined,
            addressLine2: formData.addressLine2 || undefined,
            city: formData.city || undefined,
            state: formData.state || undefined,
            postalCode: formData.postalCode || undefined,
            country: formData.country || undefined,
            notes: formData.notes || undefined,
            tags,
          }
        : {
            type: 'INDIVIDUAL' as const,
            firstName: formData.firstName || undefined,
            lastName: formData.lastName || undefined,
            companyId: formData.companyId || null,
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            addressLine1: formData.addressLine1 || undefined,
            addressLine2: formData.addressLine2 || undefined,
            city: formData.city || undefined,
            state: formData.state || undefined,
            postalCode: formData.postalCode || undefined,
            country: formData.country || undefined,
            birthday: formData.birthday || undefined,
            notes: formData.notes || undefined,
            tags,
          }
      
      await updateClient(client.id, payload)
      
      toast({
        title: 'Success',
        description: 'Client updated successfully',
      })
      
      router.refresh()
      // Dispatch sync event
      if (typeof window !== 'undefined') {
        const { dispatchSyncEvent } = require('@/lib/sync-events')
        dispatchSyncEvent('client-updated', { clientId: client.id })
      }
      onOpenChange(false)
      
      if (onClientUpdated) {
        onClientUpdated()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update client',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Edit Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'INDIVIDUAL' })}
              className={`flex-1 text-xs px-3 py-2 rounded-md border ${
                formData.type === 'INDIVIDUAL' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'COMPANY' })}
              className={`flex-1 text-xs px-3 py-2 rounded-md border ${
                formData.type === 'COMPANY' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              Company
            </button>
          </div>

          {formData.type === 'INDIVIDUAL' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              {companies.length > 0 && (
                <div>
                  <Label htmlFor="companyId" className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Company
                  </Label>
                  <Select
                    value={formData.companyId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, companyId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger id="companyId">
                      <SelectValue placeholder="None (individual)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (individual)</SelectItem>
                      {companies.filter((c) => c.id !== client?.id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName || c.firstName || 'Company'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="companyName" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Company Name *
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <Label htmlFor="taxId" className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Tax ID
                </Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="companyFoundedAt" className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Founded
                </Label>
                <Input
                  id="companyFoundedAt"
                  type="date"
                  value={formData.companyFoundedAt}
                  onChange={(e) => setFormData({ ...formData, companyFoundedAt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Middle part of client ID (year). Clear the date to use 0000 until set again.
                </p>
              </div>
            </div>
          )}

          {/* Business Contacts - Company only */}
          {formData.type === 'COMPANY' && (
            <Card className="p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <Label className="text-xs font-semibold">Business Contacts</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Link existing clients as contacts</p>
              <Select
                value="__add__"
                onValueChange={(v) => {
                  if (v && v !== '__add__' && !formData.contactIds.includes(v)) {
                    setFormData({ ...formData, contactIds: [...formData.contactIds, v] })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add a contact..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__add__" className="text-gray-500">Add a contact...</SelectItem>
                  {people
                    .filter((p) => p.id !== client?.id && !formData.contactIds.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                        {p.companyId && p.companyId !== client?.id ? ' (linked)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formData.contactIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.contactIds.map((id) => {
                    const p = people.find((x) => x.id === id)
                    return (
                      <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                        {p ? `${p.firstName} ${p.lastName}` : id}
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              contactIds: formData.contactIds.filter((c) => c !== id),
                            })
                          }
                          className="rounded-full p-0.5 hover:bg-gray-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          <div className="space-y-3">
            <div>
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Address
              </Label>
              <div className="space-y-2 mt-1">
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street address"
                />
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Apartment, suite, etc. (optional)"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State / Province"
                  />
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="Postal code"
                  />
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          </div>

          {formData.type === 'INDIVIDUAL' && (
            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="vip"
              checked={formData.vipTag}
              onCheckedChange={(checked) => setFormData({ ...formData, vipTag: checked as boolean })}
            />
            <Label htmlFor="vip" className="cursor-pointer">
              VIP Client
            </Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes about the client..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
