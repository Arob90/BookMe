import { FeatureFlipGrid } from '@/components/feature-flip-grid'

export const metadata = {
  title: 'BookMeBz - Scheduling & Client Management',
  description: 'The all-in-one scheduling and client management platform designed for service businesses.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/40 glass-nav sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div className="h-9 w-9 rounded-xl bg-pink-500 flex items-center justify-center shadow-sm">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    d="M20.5 3.5c-4.7 1.1-8.9 4-11.8 7.9L6 15l3.6-2.2c3.9-2.4 7.1-6.2 8.9-10.5.2-.5.8-.7 1.2-.3l1.3 1.3c.4.4.3 1-.2 1.2-4.2 1.9-8 5.1-10.5 8.9L8 17l3.6-2.7c3.9-2.9 6.8-7.1 7.9-11.8"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M4 20h6" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-xl font-bold text-pink-600">
                BookMeBz
              </span>
            </a>
            <a 
              href="/login" 
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
            >
              Login
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex-1 flex flex-col min-h-0">
        <div className="text-center max-w-4xl mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
            Streamline Your Business with
            <span className="block text-pink-600 mt-0.5">
              BookMeBz
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-3 max-w-2xl mx-auto leading-relaxed">
            The all-in-one scheduling and client management platform designed for service businesses.
            Manage appointments, track clients, handle payments, and grow your business effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <a 
              href="/book" 
              className="bg-pink-500 hover:bg-pink-600 text-white text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 justify-center font-medium shadow-sm transition-colors"
            >
              Book Appointment
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a 
              href="/signup" 
              className="border-2 border-pink-500 text-pink-600 hover:bg-pink-50 text-sm px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Create Account
            </a>
          </div>

          {/* Features: client grid with modal previews; images in /public/uploads */}
          <FeatureFlipGrid />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/40 glass-nav mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Powered by{' '}
              <span className="font-semibold text-pink-600">SaSo Pixel Studio</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              © 2025 BookMeBz. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}



