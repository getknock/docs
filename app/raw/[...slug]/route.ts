import { docBySlug, docs } from '../../../lib/content'

// Each page as the Markdown file it is, front matter and all: /raw/index.md is the home page
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return docs().map((d) => {
    const parts = (d.slug || 'index').split('/')
    parts[parts.length - 1] += '.md'
    return { slug: parts }
  })
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug.join('/').replace(/\.md$/, '')
  const doc = docBySlug(slug === 'index' ? '' : slug)
  if (!doc) return new Response('Not found', { status: 404 })
  return new Response(doc.source, { headers: { 'content-type': 'text/markdown; charset=utf-8' } })
}
