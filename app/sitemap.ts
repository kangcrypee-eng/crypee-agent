import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://www.crypee.biz'
  const now = new Date().toISOString()

  return [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/market`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/modoo`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/blog/write`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/alerts/setup`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]
}
