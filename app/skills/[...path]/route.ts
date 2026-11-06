import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SKILLS, filesUnder } from '../../../lib/content'

// skills/ as it is in the repo: a skill folder to install whole
export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return filesUnder(SKILLS).map((f) => ({ path: f.split('/') }))
}

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const file = (await params).path.join('/')
  if (!filesUnder(SKILLS).includes(file)) return new Response('Not found', { status: 404 })
  return new Response(readFileSync(path.join(SKILLS, file), 'utf8'), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  })
}
