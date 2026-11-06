/**
 * The docs are Markdown files in the repo's docs/ folder, readable on GitHub as they are. This app reads them at
 * build time, in the order NAV gives, and serves each as a page, and as Markdown for agents.
 */
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

/** The repo's root: `next dev` and `next build` run there. */
export const ROOT = process.cwd()
export const DOCS = path.join(ROOT, 'docs')
export const SKILLS = path.join(ROOT, 'skills')
/** Where the site is served */
export const SITE = 'https://docs.getknock.dev'
/** This repo, and Knock's code */
export const REPO = 'https://github.com/getknock/docs'
export const KNOCK_REPO = 'https://github.com/getknock/knock'

/** Reading order, in groups: each page is a file under docs/. */
export const NAV: { group: string; files: string[] }[] = [
  { group: 'Start', files: ['README.md', 'quickstart.md', 'how-it-works.md'] },
  {
    group: 'Guides',
    files: [
      'guides/knock-button.md',
      'guides/verify-in-your-server.md',
      'guides/verifier.md',
      'guides/one-human-once.md',
      'guides/strict-mode.md',
      'guides/testing.md',
    ],
  },
  {
    group: 'Reference',
    files: [
      'reference/door-sdk.md',
      'reference/verify.md',
      'reference/verifier-api.md',
      'reference/knock-verify.md',
      'reference/checks.md',
      'reference/protocol.md',
    ],
  },
  {
    group: 'Self-host',
    files: [
      'self-host/overview.md',
      'self-host/door.md',
      'self-host/console.md',
      'self-host/knockd.md',
      'self-host/own-network.md',
      'self-host/human-club.md',
    ],
  },
  { group: 'More', files: ['security.md', 'troubleshooting.md', 'agents.md'] },
]

export type Doc = {
  file: string
  slug: string
  href: string
  group: string
  title: string
  description: string
  /** The Markdown after its front matter. */
  body: string
  /** The file as it is, front matter and all. */
  source: string
}

/** README.md is the home page; every other file is served at its path without .md. */
export const slugOf = (file: string) => (file === 'README.md' ? '' : file.replace(/\.md$/, ''))
export const hrefOf = (slug: string) => (slug ? `/${slug}` : '/')
/** Where a page's Markdown is served for agents. */
export const rawHrefOf = (slug: string) => `/raw/${slug || 'index'}.md`

/** `---` front matter of `key: value` lines (title, description). */
export function frontMatter(src: string): { data: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(src)
  if (!m) return { data: {}, body: src }
  const data: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':')
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')
  }
  return { data, body: src.slice(m[0].length) }
}

let cache: Doc[] | null = null

export function docs(): Doc[] {
  if (cache) return cache
  cache = NAV.flatMap(({ group, files }) =>
    files.map((file) => {
      const source = readFileSync(path.join(DOCS, file), 'utf8')
      const { data, body } = frontMatter(source)
      if (!data.title || !data.description) throw new Error(`docs/${file}: front matter needs a title and a description`)
      const slug = slugOf(file)
      return { file, slug, href: hrefOf(slug), group, title: data.title, description: data.description, body, source }
    }),
  )
  return cache
}

export const docBySlug = (slug: string) => docs().find((d) => d.slug === slug)

/** The page before and after, in reading order. */
export function neighbours(slug: string): { prev?: Doc; next?: Doc } {
  const all = docs()
  const i = all.findIndex((d) => d.slug === slug)
  return { prev: all[i - 1], next: all[i + 1] }
}

/** Every file under a folder, as paths relative to it. */
export function filesUnder(dir: string, at = ''): string[] {
  return readdirSync(path.join(dir, at), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesUnder(dir, path.posix.join(at, e.name)) : [path.posix.join(at, e.name)],
  )
}
