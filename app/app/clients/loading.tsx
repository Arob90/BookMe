export default function ClientsLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-16 bg-white border-b border-gray-200 animate-pulse" />
      <div className="flex-1 overflow-hidden p-2 sm:p-3 bg-gray-50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-48 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
