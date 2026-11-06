import type { MetadataRoute } from 'next'
import { SITE, docs } from '../lib/content'

// Every page, at its address on getknock.dev
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return docs().map((d) => ({ url: `${SITE}${d.href}` }))
}
