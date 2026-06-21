'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/app/actions/clients'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, Cake, FileText, Sparkles, Building2, Receipt, UserCircle, MapPin, Users, Plus, X, CalendarDays } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientCreated?: () => void
  companies?: Array<{ id: string; companyName?: string | null; firstName?: string }>
  people?: Array<{ id: string; firstName: string; lastName: string; companyId?: string | null }>
}

export function CreateClientDialog({ open, onOpenChange, onClientCreated, companies = [], people = [] }: CreateClientDialogProps) {
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
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    if (formData.type === 'COMPANY' && !formData.companyFoundedAt?.trim()) {
      toast({
        title: 'Error',
        description: 'Founded date is required for a company',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createClient({
        type: formData.type,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        companyName: formData.companyName || undefined,
        companyId: formData.companyId || null,
        contactIds: formData.contactIds.length > 0 ? formData.contactIds : undefined,
        taxId: formData.taxId || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
        birthday: formData.birthday || undefined,
        companyFoundedAt: formData.type === 'COMPANY' ? formData.companyFoundedAt || undefined : undefined,
        notes: formData.notes || undefined,
        tags: [],
      })
      
      toast({
        title: 'Success',
        description: 'Client created successfully',
      })
      
      // Reset form
      setFormData({
        type: 'INDIVIDUAL',
        firstName: '',
        lastName: '',
        companyName: '',
        companyId: '',
        contactIds: [],
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
      })
      
      router.refresh()
      // Dispatch sync event
      if (typeof window !== 'undefined') {
        const { dispatchSyncEvent } = require('@/lib/sync-events')
        dispatchSyncEvent('client-created')
      }
      onOpenChange(false)
      
      if (onClientCreated) {
        onClientCreated()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create client',
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
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Create New Client
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information / Client Type */}
          <Card className="p-3 bg-gradient-to-br from-pink-50/50 to-purple-50/50 border-pink-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 rounded-md bg-pink-100">
                <User className="h-3.5 w-3.5 text-pink-600" />
              </div>
              <Label className="text-xs font-semibold text-gray-700">Client Type</Label>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'INDIVIDUAL' })}
                className={`flex-1 text-xs px-3 py-2.5 rounded-md border transition-colors ${
                  formData.type === 'INDIVIDUAL'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'COMPANY' })}
                className={`flex-1 text-xs px-3 py-2.5 rounded-md border transition-colors ${
                  formData.type === 'COMPANY'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Company
              </button>
            </div>

            {formData.type === 'INDIVIDUAL' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="bg-white"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="bg-white"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                {companies.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="companyId" className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-500" />
                      Company
                    </Label>
                    <Select
                      value={formData.companyId || 'none'}
                      onValueChange={(v) => setFormData({ ...formData, companyId: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger id="companyId" className="bg-white">
                        <SelectValue placeholder="None (individual)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (individual)</SelectItem>
                        {companies.map((c) => (
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
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-pink-600" />
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="bg-white"
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId" className="text-sm font-medium flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-gray-500" />
                    Tax ID
                  </Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="bg-white"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyFoundedAt" className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-pink-600" />
                    Founded <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyFoundedAt"
                    type="date"
                    value={formData.companyFoundedAt}
                    onChange={(e) => setFormData({ ...formData, companyFoundedAt: e.target.value })}
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500">Used in the client ID (like birth year for individuals).</p>
                </div>
              </div>
            )}
          </Card>

          {/* Business Contacts Section - Company only */}
          {formData.type === 'COMPANY' && (
            <Card className="p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-md bg-blue-100">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <Label className="text-xs font-semibold text-gray-700">Business Contacts</Label>
              </div>
              <p className="text-xs text-gray-500 mb-3">Link existing clients as contacts for this business</p>
              <div className="space-y-2">
                <Select
                  value="__add__"
                  onValueChange={(v) => {
                    if (v && v !== '__add__' && !formData.contactIds.includes(v)) {
                      setFormData({ ...formData, contactIds: [...formData.contactIds, v] })
                    }
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Add a contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__add__" className="text-gray-500">
                      Add a contact...
                    </SelectItem>
                    {people
                      .filter((p) => !formData.contactIds.includes(p.id))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                          {p.companyId ? ' (linked to another company)' : ''}
                        </SelectItem>
                      ))}
                    {people.filter((p) => !formData.contactIds.includes(p.id)).length === 0 && (
                      <SelectItem value="_empty" disabled>
                        No more contacts to add
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {formData.contactIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.contactIds.map((id) => {
                      const p = people.find((x) => x.id === id)
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="pl-2 pr-1 py-1 gap-1 bg-white border"
                        >
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
              </div>
            </Card>
          )}

          {/* Contact Section */}
          <Card className="p-3 bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 rounded-md bg-green-100">
                <Mail className="h-3.5 w-3.5 text-green-600" />
              </div>
              <Label className="text-xs font-semibold text-gray-700">Contact Information</Label>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-gray-500" />
                  Address
                </Label>
                <div className="space-y-2">
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    className="bg-white"
                    placeholder="Street address"
                  />
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    className="bg-white"
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="bg-white"
                      placeholder="City"
                    />
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="bg-white"
                      placeholder="State / Province"
                    />
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="bg-white"
                      placeholder="Postal code"
                    />
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="bg-white"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-500" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white"
                    placeholder="john.doe@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-500" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white"
                    placeholder="+1-555-0123"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Additional Info Section */}
          <Card className="p-3 bg-gradient-to-br from-pink-50/50 to-rose-50/50 border-pink-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 rounded-md bg-pink-100">
                <FileText className="h-3.5 w-3.5 text-pink-600" />
              </div>
              <Label className="text-xs font-semibold text-gray-700">Additional Information</Label>
            </div>
            <div className="space-y-3">
              {formData.type === 'INDIVIDUAL' && (
                <div className="space-y-2">
                  <Label htmlFor="birthday" className="text-sm font-medium flex items-center gap-1.5">
                    <Cake className="h-3.5 w-3.5 text-gray-500" />
                    Birthday
                  </Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                    className="bg-white"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-gray-500" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about the client..."
                  rows={3}
                  className="bg-white resize-none"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[140px] bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-md"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Client
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
