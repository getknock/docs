import { NAV, SITE, docs, rawHrefOf } from '../../lib/content'

// llms.txt: what Knock is, and every page as Markdown at its address on getknock.dev, in reading order
export const dynamic = 'force-static'

export function GET() {
  const all = docs()
  const lines = [
    '# Knock',
    '',
    "> Knock lets a site let in a real human, once: they press green on their Wedgie (a small USB device whose key is bound to their World ID on World Chain and named in ENS), and the site's verifier checks the press. Sites add a button with @knock-dev/door-sdk and run knock-verifier (or embed the knock-verify Rust crate).",
    '',
    `Every page below is Markdown. ${SITE}/llms-full.txt is all of them in one file; ${SITE}/SKILL.md teaches a coding agent to add Knock to a site.`,
    '',
  ]
  for (const { group } of NAV) {
    lines.push(`## ${group}`, '')
    for (const d of all.filter((x) => x.group === group)) lines.push(`- [${d.title}](${SITE}${rawHrefOf(d.slug)}): ${d.description}`)
    lines.push('')
  }
  lines.push('## For agents', '', `- [SKILL.md](${SITE}/SKILL.md): add a Knock button and a verifier to a site, step by step`, '')
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
