'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getBankingSettings,
  updatePaymentMethodsEnabled,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  type PaymentMethodType,
} from '@/app/actions/banking'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import {
  Banknote,
  Landmark,
  Wallet,
  Send,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'

const METHOD_CONFIG = {
  CASH: { label: 'Cash', icon: Banknote },
  BANK: { label: 'Bank', icon: Landmark },
  WALLET: { label: 'Wallet', icon: Wallet },
  WIRE: { label: 'Wire', icon: Send },
} as const

export function BankingSettings() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<{
    methodsEnabled: Record<PaymentMethodType, boolean>
    banks: { id: string; name: string; accountNumber: string | null }[]
    wallets: { id: string; name: string; accountNumber: string | null }[]
    wirePlaces: { id: string; name: string; accountNumber: string | null }[]
  } | null>(null)
  const [adding, setAdding] = useState<PaymentMethodType | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [editName, setEditName] = useState('')
  const [editAccountNumber, setEditAccountNumber] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const result = await getBankingSettings()
      if (result) setData(result)
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load banking settings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleToggle = async (method: PaymentMethodType, enabled: boolean) => {
    if (!data) return
    setSaving(true)
    try {
      await updatePaymentMethodsEnabled({ [method]: enabled })
      setData({
        ...data,
        methodsEnabled: { ...data.methodsEnabled, [method]: enabled },
      })
      toast({ title: 'Saved', description: `Payment method updated` })
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async (type: PaymentMethodType) => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await createPaymentAccount({
        type,
        name: newName.trim(),
        accountNumber: newAccountNumber.trim() || undefined,
      })
      toast({ title: 'Added', description: `${METHOD_CONFIG[type].label} account added` })
      setNewName('')
      setNewAccountNumber('')
      setAdding(null)
      await load()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to add',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string, type: PaymentMethodType) => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await updatePaymentAccount(id, {
        name: editName.trim(),
        accountNumber: editAccountNumber.trim() || undefined,
      })
      toast({ title: 'Updated', description: 'Account updated' })
      setEditing(null)
      await load()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this account?')) return
    setSaving(true)
    try {
      await deletePaymentAccount(id)
      toast({ title: 'Deleted', description: 'Account removed' })
      setEditing(null)
      await load()
      router.refresh()
    } catch (e: unknown) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to delete',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getAccounts = (type: PaymentMethodType) => {
    if (!data) return []
    if (type === 'BANK') return data.banks
    if (type === 'WALLET') return data.wallets
    if (type === 'WIRE') return data.wirePlaces
    return []
  }

  const getAccountLabel = (type: PaymentMethodType) => {
    if (type === 'BANK') return 'Account number'
    if (type === 'WALLET') return 'Wallet ID / Account'
    if (type === 'WIRE') return 'Details (e.g. transfer place name)'
    return 'Details'
  }

  if (loading || !data) {
    return (
      <Card className="shadow-sm border-gray-200">
        <CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b border-gray-200 bg-white">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <Landmark className="h-5 w-5 text-pink-500" />
          Banking & Payment Methods
        </CardTitle>
        <CardDescription className="text-gray-600">
          Enable payment methods and add banks, wallets, and wire transfer places
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Toggles */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Payment methods</Label>
          <div className="space-y-2">
            {(Object.keys(METHOD_CONFIG) as PaymentMethodType[]).map((method) => {
              const config = METHOD_CONFIG[method]
              const Icon = config.icon
              return (
                <div
                  key={method}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  <Checkbox
                    checked={data.methodsEnabled[method]}
                    onCheckedChange={(checked) => handleToggle(method, !!checked)}
                    disabled={saving}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Bank accounts */}
        {data.methodsEnabled.BANK && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Banks & account numbers
            </Label>
            <div className="space-y-2">
              {data.banks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-gray-50/50"
                >
                  {editing === b.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Bank name"
                        className="h-8 flex-1"
                      />
                      <Input
                        value={editAccountNumber}
                        onChange={(e) => setEditAccountNumber(e.target.value)}
                        placeholder="Account number"
                        className="h-8 flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(b.id, 'BANK')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{b.name}</span>
                      {b.accountNumber && (
                        <span className="text-sm text-muted-foreground">
                          ****{b.accountNumber.slice(-4)}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(b.id)
                          setEditName(b.name)
                          setEditAccountNumber(b.accountNumber || '')
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600"
                        onClick={() => handleDelete(b.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {adding === 'BANK' ? (
                <div className="flex items-center gap-2 p-2 rounded border border-dashed">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Bank name"
                    className="h-8"
                  />
                  <Input
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    placeholder="Account number"
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => handleAdd('BANK')} disabled={saving}>
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setAdding('BANK')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add bank
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Wallets */}
        {data.methodsEnabled.WALLET && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallets
            </Label>
            <div className="space-y-2">
              {data.wallets.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-gray-50/50"
                >
                  {editing === w.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Wallet name"
                        className="h-8 flex-1"
                      />
                      <Input
                        value={editAccountNumber}
                        onChange={(e) => setEditAccountNumber(e.target.value)}
                        placeholder={getAccountLabel('WALLET')}
                        className="h-8 flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(w.id, 'WALLET')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{w.name}</span>
                      {w.accountNumber && (
                        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {w.accountNumber}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(w.id)
                          setEditName(w.name)
                          setEditAccountNumber(w.accountNumber || '')
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600"
                        onClick={() => handleDelete(w.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {adding === 'WALLET' ? (
                <div className="flex items-center gap-2 p-2 rounded border border-dashed">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Wallet name"
                    className="h-8"
                  />
                  <Input
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    placeholder={getAccountLabel('WALLET')}
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => handleAdd('WALLET')} disabled={saving}>
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setAdding('WALLET')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add wallet
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Wire transfer places */}
        {data.methodsEnabled.WIRE && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4" />
              Wire transfer places
            </Label>
            <div className="space-y-2">
              {data.wirePlaces.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 p-2 rounded border border-gray-200 bg-gray-50/50"
                >
                  {editing === w.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Place name"
                        className="h-8 flex-1"
                      />
                      <Input
                        value={editAccountNumber}
                        onChange={(e) => setEditAccountNumber(e.target.value)}
                        placeholder={getAccountLabel('WIRE')}
                        className="h-8 flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(w.id, 'WIRE')}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{w.name}</span>
                      {w.accountNumber && (
                        <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                          {w.accountNumber}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(w.id)
                          setEditName(w.name)
                          setEditAccountNumber(w.accountNumber || '')
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600"
                        onClick={() => handleDelete(w.id)}
                        disabled={saving}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {adding === 'WIRE' ? (
                <div className="flex items-center gap-2 p-2 rounded border border-dashed">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Place name"
                    className="h-8"
                  />
                  <Input
                    value={newAccountNumber}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    placeholder={getAccountLabel('WIRE')}
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => handleAdd('WIRE')} disabled={saving}>
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAdding(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setAdding('WIRE')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add wire transfer place
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
