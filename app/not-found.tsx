import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-pink-600 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
        <p className="text-gray-600 mb-6">
          This page could not be found. Check the URL or go back to the home page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-lg font-medium text-center transition-colors"
          >
            Home
          </Link>
          <Link
            href="/login"
            className="border-2 border-pink-500 text-pink-600 hover:bg-pink-50 px-6 py-2.5 rounded-lg font-medium text-center transition-colors"
          >
            Login
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-6">
          Logged in? Try{' '}
          <Link href="/app/dashboard" className="text-pink-600 font-medium hover:underline">
            Dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}
