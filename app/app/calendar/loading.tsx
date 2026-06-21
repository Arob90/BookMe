export default function CalendarLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-16 bg-white border-b border-gray-200 animate-pulse" />
      <div className="flex-1 overflow-hidden p-2 sm:p-3 bg-gray-50">
        <div className="h-full bg-white rounded-2xl border border-gray-200 animate-pulse" />
      </div>
    </div>
  )
}
