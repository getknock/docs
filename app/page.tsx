import type { Metadata } from 'next'
import { Hero } from '../components/Hero'
import { Shell } from '../components/Shell'
import { docBySlug, rawHrefOf } from '../lib/content'

export const metadata: Metadata = {
  alternates: { canonical: '/', types: { 'text/markdown': rawHrefOf('') } },
}

export default function Home() {
  const doc = docBySlug('')
  if (!doc) throw new Error('docs/README.md is the home page')
  return <Shell doc={doc} top={<Hero />} />
}
