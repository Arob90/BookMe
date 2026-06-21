/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    // Slow disks / OneDrive can make chunk fetches hit the default timeout in dev.
    if (dev && !isServer && config.output) {
      config.output.chunkLoadTimeout = 300000
    }
    return config
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Optimize for faster loading
  reactStrictMode: true,
  swcMinify: true,
  // Reduce timeout issues
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Security headers applied to every response.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
  // Redirect /dashboard, /calendar etc. to /app/dashboard, /app/calendar (avoids 404 for old links)
  async redirects() {
    const appRoutes = ['dashboard', 'calendar', 'clients', 'services', 'loyalty', 'inventory', 'analytics', 'reports', 'policies', 'settings']
    return appRoutes.map((segment) => ({
      source: `/${segment}`,
      destination: `/app/${segment}`,
      permanent: false,
    }))
  },
}

module.exports = nextConfig
