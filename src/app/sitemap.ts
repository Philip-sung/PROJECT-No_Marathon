import type { MetadataRoute } from 'next';

const BASE = 'https://no-marathon.kr';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/record`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/detour`, changeFrequency: 'weekly', priority: 0.7 },
  ];
}
