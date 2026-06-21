import { AppTopbar } from '@/components/app-topbar'
import { InventoryList } from '@/components/inventory-list'
import { getInventoryItems, getInventoryCategories } from '@/app/actions/inventory'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { filter?: string; view?: string; itemId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const includeArchived = searchParams.view === 'archived'
  const [items, categories] = await Promise.all([
    getInventoryItems(includeArchived),
    getInventoryCategories(),
  ])

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Inventory" />
      <div className="flex-1 overflow-hidden p-3 sm:p-4 bg-transparent">
        <InventoryList items={items} filter={searchParams.filter} view={searchParams.view} categories={categories} initialItemId={searchParams.itemId} />
      </div>
    </div>
  )
}

