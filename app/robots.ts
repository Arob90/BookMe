import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep authenticated app + API out of the index.
      disallow: ['/app/', '/api/'],
    },
    sitemap: 'https://bookme.bz/sitemap.xml',
    host: 'https://bookme.bz',
  }
}
