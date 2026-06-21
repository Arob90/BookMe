export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-16 bg-white border-b border-gray-200 animate-pulse" />
      <div className="flex-1 overflow-hidden p-2 sm:p-3 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-gray-200 animate-pulse" />
          <div className="h-96 bg-white rounded-2xl border border-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
