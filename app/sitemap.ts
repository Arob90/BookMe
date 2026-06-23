import type { MetadataRoute } from 'next'
import { DISTRICTS } from '@/lib/districts'

const BASE = 'https://bookme.bz'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/districts`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/book`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const districtPages: MetadataRoute.Sitemap = DISTRICTS.map((d) => ({
    url: `${BASE}/district/${d.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticPages, ...districtPages]
}
