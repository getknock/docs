import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Shell } from '../../components/Shell'
import { docBySlug, docs, rawHrefOf } from '../../lib/content'

type Params = { params: Promise<{ slug: string[] }> }

export const dynamicParams = false

export function generateStaticParams() {
  return docs()
    .filter((d) => d.slug)
    .map((d) => ({ slug: d.slug.split('/') }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const doc = docBySlug((await params).slug.join('/'))
  // Its address on docs.getknock.dev, and the same page as Markdown, for agents
  return doc
    ? {
        title: doc.title,
        description: doc.description,
        alternates: { canonical: doc.href, types: { 'text/markdown': rawHrefOf(doc.slug) } },
      }
    : {}
}

export default async function Page({ params }: Params) {
  const doc = docBySlug((await params).slug.join('/'))
  if (!doc) notFound()
  return <Shell doc={doc} />
}
