import { SITE, docs } from '../../lib/content'

// Every page in one file, in reading order, each under its address
export const dynamic = 'force-static'

export function GET() {
  const body = docs()
    .map((d) => `<!-- ${SITE}${d.href} -->\n\n# ${d.title}\n\n> ${d.description}\n\n${d.body.trim()}\n`)
    .join('\n\n')
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
