import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SKILLS } from '../../lib/content'

// The Knock skill's SKILL.md, at the site's root: /skills/knock/ has it with its reference files
export const dynamic = 'force-static'

export function GET() {
  const md = readFileSync(path.join(SKILLS, 'knock', 'SKILL.md'), 'utf8')
  return new Response(md, { headers: { 'content-type': 'text/markdown; charset=utf-8' } })
}
