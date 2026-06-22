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
            <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
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
              <span className="font-display text-xl font-semibold tracking-tight text-pink-600">
                BookMeBz
              </span>
            </a>
            <a
              href="/login"
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
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
      <main className="relative overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex-1 flex flex-col min-h-0">
        <div className="relative text-center max-w-4xl mx-auto flex-1 flex flex-col justify-center">
          <div className="animate-fade-up mb-4 flex justify-center">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-gray-600">
              <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
              Modern scheduling for service businesses
            </span>
          </div>
          <h1 className="animate-fade-up delay-75 font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-gray-900 mb-3 leading-[1.1]">
            Streamline your business with
            <span className="block text-pink-600 mt-1">
              BookMeBz
            </span>
          </h1>
          <p className="animate-fade-up delay-150 text-sm sm:text-base text-gray-600 mb-5 max-w-2xl mx-auto leading-relaxed">
            The all-in-one scheduling and client management platform designed for service businesses.
            Manage appointments, track clients, handle payments, and grow your business effortlessly.
          </p>
          <div className="animate-fade-up delay-225 flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <a
              href="/book"
              className="group relative overflow-hidden bg-pink-500 hover:bg-pink-600 text-white text-sm px-6 py-3 rounded-full flex items-center gap-2 justify-center font-medium shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <span className="pointer-events-none absolute inset-0 -skew-x-12 bg-white/25 w-1/3 -translate-x-[120%] group-hover:animate-sheen" />
              Book Appointment
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <a
              href="/signup"
              className="border-2 border-pink-500 bg-white text-pink-600 text-sm px-6 py-3 rounded-full font-semibold flex items-center justify-center transition-all hover:bg-pink-50 hover:-translate-y-0.5"
            >
              Create Account — Free 14-day trial
            </a>
          </div>

          {/* Features: client grid with modal previews; images in /public/uploads */}
          <div className="animate-fade-up delay-300">
            <FeatureFlipGrid />
          </div>
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



