import type { Entry } from '../../components/Search'
import { docs } from '../../lib/content'
import { toTree } from '../../lib/markdown'

// Every section of every page, for the search box: fetched once, searched in the browser
export const dynamic = 'force-static'

export async function GET() {
  const entries: Entry[] = []
  for (const d of docs()) {
    const { sections } = await toTree(d.file, d.body)
    for (const s of sections)
      entries.push({
        title: d.title,
        href: s.id ? `${d.href}#${s.id}` : d.href,
        heading: s.heading,
        text: s.heading ? s.text : `${d.description} ${s.text}`.trim(),
      })
  }
  return Response.json(entries)
}
