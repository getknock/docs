/**
 * Markdown to HTML trees, as GitHub reads it (GFM, and its `> [!NOTE]` alerts), with three changes for the site:
 * links to other docs go to their pages, links to the rest of the repo go to GitHub, and code is highlighted in
 * Knock's colors at build time, so pages ship no highlighter.
 */
import path from 'node:path'
import type { Element, Root as HastRoot } from 'hast'
import { toString as textOf } from 'hast-util-to-string'
import type { Blockquote, Root as MdastRoot } from 'mdast'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { type Highlighter, createHighlighter } from 'shiki'
import { unified } from 'unified'
import { SKIP, visit } from 'unist-util-visit'
import { REPO, SITE, hrefOf, slugOf } from './content'
import { KNOCK_THEME } from './theme'

const LANGS = ['typescript', 'tsx', 'javascript', 'jsx', 'bash', 'rust', 'json', 'toml', 'http', 'diff', 'html', 'yaml', 'markdown']

let highlighter: Promise<Highlighter> | null = null
const shiki = () => {
  highlighter ??= createHighlighter({ themes: [KNOCK_THEME], langs: LANGS })
  return highlighter
}

const ALERTS = { NOTE: 'Note', TIP: 'Tip', IMPORTANT: 'Important', WARNING: 'Warning', CAUTION: 'Caution' } as const

/** GitHub's alerts: a blockquote that starts `[!NOTE]` (or TIP, IMPORTANT, WARNING, CAUTION) is a callout. */
function remarkAlerts() {
  return (tree: MdastRoot) => {
    visit(tree, 'blockquote', (node: Blockquote) => {
      const first = node.children[0]
      const text = first?.type === 'paragraph' ? first.children[0] : undefined
      const m = text?.type === 'text' ? /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(\n|$)/.exec(text.value) : null
      if (!m || !text || text.type !== 'text' || first?.type !== 'paragraph') return
      const kind = m[1] as keyof typeof ALERTS
      text.value = text.value.slice(m[0].length)
      if (!text.value) first.children.shift()
      if (!first.children.length) node.children.shift()
      node.data = { hName: 'aside', hProperties: { className: ['callout', `callout-${kind.toLowerCase()}`] } }
      node.children.unshift({
        type: 'paragraph',
        data: { hProperties: { className: ['callout-title'] } },
        children: [{ type: 'text', value: ALERTS[kind] }],
      })
    })
  }
}

/** Where a link in docs/<file> goes on the site: another doc's page, a skill file, or this repo on GitHub. */
export function siteHref(file: string, href: string): string {
  // A link to docs.getknock.dev stays on the site it's read on
  if (href === SITE || href.startsWith(`${SITE}/`)) return href.slice(SITE.length) || '/'
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('/')) return href
  const [target, hash] = href.split('#')
  const inRepo = path.posix.normalize(path.posix.join('docs', path.posix.dirname(file), target))
  const anchor = hash ? `#${hash}` : ''
  if (inRepo.startsWith('docs/') && inRepo.endsWith('.md')) return hrefOf(slugOf(inRepo.slice('docs/'.length))) + anchor
  if (inRepo.startsWith('skills/')) return `/${inRepo}${anchor}`
  return `${REPO}/blob/main/${inRepo}${anchor}`
}

function rehypeLinks(file: string) {
  return () => (tree: HastRoot) => {
    visit(tree, 'element', (el: Element) => {
      if (el.tagName === 'a' && typeof el.properties.href === 'string') el.properties.href = siteHref(file, el.properties.href)
    })
  }
}

/** Each fenced block through Shiki: `lang title="file"` gives the language and the caption. */
function rehypeHighlight(h: Highlighter) {
  const loaded = new Set(h.getLoadedLanguages())
  return () => (tree: HastRoot) => {
    visit(tree, 'element', (el: Element, i, parent) => {
      if (el.tagName !== 'pre' || !parent || i === undefined) return
      const code = el.children[0]
      if (code?.type !== 'element' || code.tagName !== 'code') return
      const classes = (code.properties.className as string[] | undefined) ?? []
      const lang = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length) ?? 'text'
      const meta = (code.data as { meta?: string } | undefined)?.meta ?? ''
      const title = /title="([^"]+)"/.exec(meta)?.[1]
      const out = h.codeToHast(textOf(code).replace(/\n$/, ''), { lang: loaded.has(lang) ? lang : 'text', theme: 'knock' })
      const pre = out.children[0] as Element
      pre.properties = { ...pre.properties, dataLang: lang, ...(title ? { dataTitle: title } : {}) }
      parent.children[i] = pre
      return SKIP
    })
  }
}

export type Heading = { depth: 2 | 3; id: string; text: string }
export type Section = { id: string; heading: string; text: string }

/** A doc's HTML tree, its headings for the page's contents, and its sections for search. */
export async function toTree(file: string, body: string): Promise<{ tree: HastRoot; headings: Heading[]; sections: Section[] }> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkAlerts)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeLinks(file))
    .use(rehypeHighlight(await shiki()))
  const tree = (await processor.run(processor.parse(body))) as HastRoot

  const headings: Heading[] = []
  const sections: Section[] = [{ id: '', heading: '', text: '' }]
  for (const node of tree.children) {
    if (node.type !== 'element') continue
    if (node.tagName === 'h2' || node.tagName === 'h3') {
      const h = { depth: node.tagName === 'h2' ? 2 : 3, id: String(node.properties.id), text: textOf(node) } as Heading
      headings.push(h)
      sections.push({ id: h.id, heading: h.text, text: '' })
    } else if (node.tagName !== 'pre' && node.tagName !== 'h1') {
      const s = sections[sections.length - 1]
      s.text = `${s.text} ${textOf(node)}`.replace(/\s+/g, ' ').trim()
    }
  }
  return { tree, headings, sections: sections.filter((s) => s.heading || s.text) }
}
