/**
 * The docs say what the code does, so these read the code: the verifier's settings, every refusal it can give,
 * door-sdk's and the Door's codes, and knock-verify's public items each have to be in the docs, and every link has
 * to land. Every whole TypeScript example has to compile. The skill is held to the Agent Skills rules. Nothing private
 * may be in a page. Knock's code is read from a checkout of getknock/knock beside this repo, or at KNOCK_DIR.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import GithubSlugger from 'github-slugger'
import type { Element } from 'hast'
import { visit } from 'unist-util-visit'
import { DOCS, KNOCK_REPO, NAV, REPO, ROOT, SITE, SKILLS, docs, filesUnder, frontMatter, hrefOf, rawHrefOf } from '../lib/content'
import { toTree } from '../lib/markdown'

const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8')
const doc = (file: string) => read(path.join('docs', file))

/** Knock's code, from a checkout of getknock/knock beside this repo, or at KNOCK_DIR */
const KNOCK = path.resolve(process.env.KNOCK_DIR ?? path.join(ROOT, '..', 'knock'))
if (!existsSync(path.join(KNOCK, 'crates', 'knock-verify')))
  throw new Error(`These tests read Knock's code: check out getknock/knock at ${KNOCK}, or set KNOCK_DIR to a checkout`)
const code = (file: string) => readFileSync(path.join(KNOCK, file), 'utf8')

/** The first column of each row of the tables in `md`, as the code spans in it. */
function firstColumn(md: string): string[] {
  return md
    .split('\n')
    .filter((l) => l.startsWith('| `'))
    .map((l) => /^\| `([^`]+)`/.exec(l)?.[1] ?? '')
}

describe('pages', () => {
  test('every page is in the nav, and every page in the nav is a file', () => {
    const inNav = NAV.flatMap((g) => g.files).sort()
    const onDisk = filesUnder(DOCS)
      .filter((f) => f.endsWith('.md'))
      .sort()
    expect(inNav).toEqual(onDisk)
  })

  test('every page has a title, a description and no title of its own', () => {
    for (const d of docs()) {
      expect(d.title.length).toBeGreaterThan(0)
      expect(d.description.length).toBeGreaterThan(20)
      expect(d.body.replace(/^```[\s\S]*?^```/gm, '')).not.toMatch(/^# /m)
    }
  })

  test('every page renders', async () => {
    for (const d of docs()) {
      const { tree, headings } = await toTree(d.file, d.body)
      expect(tree.children.length).toBeGreaterThan(0)
      for (const h of headings) expect(h.id).toMatch(/^[a-z0-9_-]+$/)
    }
  })
})

/** Every id on every page, as rendered, and every link, as the site has it. */
async function rendered() {
  const ids = new Map<string, Set<string>>()
  const links: { from: string; href: string }[] = []
  for (const d of docs()) {
    const { tree } = await toTree(d.file, d.body)
    const here = new Set<string>()
    visit(tree, 'element', (el: Element) => {
      if (typeof el.properties.id === 'string') here.add(el.properties.id)
      if (el.tagName === 'a' && typeof el.properties.href === 'string') links.push({ from: d.file, href: el.properties.href })
    })
    ids.set(d.href, here)
  }
  return { ids, links }
}

describe('links', () => {
  const skillFiles = filesUnder(SKILLS)
  const routes = new Set([
    ...docs().map((d) => rawHrefOf(d.slug)),
    '/llms.txt',
    '/llms-full.txt',
    '/SKILL.md',
    '/search.json',
    ...skillFiles.map((f) => `/skills/${f}`),
  ])

  test('each link lands on a page and a heading, a file, or a route', async () => {
    const { ids, links } = await rendered()
    const broken: string[] = []
    for (const { from, href } of links) {
      const [target, anchor] = href.split('#')
      const blob = ([[KNOCK_REPO, KNOCK], [REPO, ROOT]] as const).find(([repo]) => href.startsWith(`${repo}/blob/main/`))
      if (blob) {
        if (!existsSync(path.join(blob[1], target.slice(`${blob[0]}/blob/main/`.length)))) broken.push(`${from}: ${href}`)
      } else if (/^https?:/.test(href) || href.startsWith('#')) {
        if (href.startsWith('#') && !ids.get(docs().find((d) => d.file === from)?.href ?? '')?.has(anchor))
          broken.push(`${from}: ${href}`)
      } else if (ids.has(target)) {
        if (anchor && !ids.get(target)?.has(anchor)) broken.push(`${from}: ${href}`)
      } else if (!routes.has(target)) broken.push(`${from}: ${href}`)
    }
    expect(broken).toEqual([])
    expect(links.length).toBeGreaterThan(50)
  })

  test("the skill's links land too", () => {
    const broken: string[] = []
    for (const file of skillFiles.filter((f) => f.endsWith('.md'))) {
      const md = readFileSync(path.join(SKILLS, file), 'utf8')
      for (const [, href] of md.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^https?:/.test(href) || href.startsWith('/')) continue
        const [target, anchor] = href.split('#')
        const to = path.join(SKILLS, path.dirname(file), target)
        if (!existsSync(to)) {
          broken.push(`${file}: ${href}`)
          continue
        }
        if (anchor) {
          const slugger = new GithubSlugger()
          const heads = [...readFileSync(to, 'utf8').matchAll(/^#{1,6} (.+)$/gm)].map((m) => slugger.slug(m[1]))
          if (!heads.includes(anchor)) broken.push(`${file}: ${href}`)
        }
      }
    }
    expect(broken).toEqual([])
  })
})

describe('the verifier', () => {
  const main = code('server/verifier/src/main.rs')
  const settings = new Map(
    [...main.matchAll(/(?:env|url)\(\s*"(VERIFIER_[A-Z_]+)",\s*"([^"]*)"/g)].map((m) => [m[1], m[2]] as const),
  )

  test('every setting is documented, with its default, and nothing else is', () => {
    expect(settings.size).toBe(8)
    for (const file of ['docs/guides/verifier.md', 'skills/knock/reference/api.md']) {
      const rows = read(file)
        .split('\n')
        .filter((l) => l.startsWith('| `VERIFIER_'))
      const documented = new Map(
        rows.map((l) => {
          const [, name, dflt] = /^\| `(VERIFIER_[A-Z_]+)` \| `([^`]*)`/.exec(l) ?? []
          return [name, dflt] as const
        }),
      )
      expect(documented).toEqual(settings)
    }
  })

  // Every (check, error) the verifier can answer with, from its sources
  const sources = ['crates/knock-verify/src/lib.rs', 'crates/knock-verify/src/store.rs', 'server/verifier/src/main.rs']
    .map(code)
    .join('\n')
  const refusals = new Set([
    ...[...sources.matchAll(/\bno\(\s*(\d),\s*"([a-z_]+)"/g)].map((m) => `${m[1]} ${m[2]}`),
    ...[...sources.matchAll(/check:\s*(\d),\s*error:\s*"([a-z_]+)"/g)].map((m) => `${m[1]} ${m[2]}`),
    ...[...sources.matchAll(/\.at\((\d)\)/g)].map((m) => `${m[1]} unavailable`),
  ])

  test('the sources were read', () => {
    expect(refusals.size).toBeGreaterThan(20)
    expect(refusals.has('6 binding_not_final')).toBe(true)
    expect(refusals.has('0 busy')).toBe(true)
  })

  test('every refusal is in the reference, at its check, and nothing else is', () => {
    const md = doc('reference/checks.md')
    const every = md.slice(md.indexOf('## Every code'))
    const listed = new Set(
      every
        .split('\n')
        .filter((l) => l.startsWith('| `'))
        .flatMap((l) => {
          const m = /^\| `([a-z_]+)` \| ([\d, ]+) \|/.exec(l)
          return m ? m[2].split(',').map((c) => `${c.trim()} ${m[1]}`) : []
        }),
    )
    expect([...listed].sort()).toEqual([...refusals].sort())
  })

  test("each check's table has exactly its codes, and each why is in the verifier's words", () => {
    const md = doc('reference/checks.md')
    // The verifier's strings as it prints them (Rust's line continuations, escaped quotes and braces undone); each
    // why is checked in pieces, around its <placeholders> and ': ', and after a <name>'s
    const said = sources.replace(/\\\n\s*/g, '').replaceAll('\\"', '"').replaceAll('{{', '{').replaceAll('}}', '}')
    for (const check of ['0', '1', '2', '3', '4', '5', '6', '7', '8']) {
      const head = check === '0' ? "## The verifier's own trouble" : `## Check ${check}:`
      const at = md.indexOf(head)
      expect(at).toBeGreaterThan(0)
      const lines = md.slice(at, md.indexOf('\n## ', at + 1)).split('\n')
      const rows = lines.filter((l, i) => /^\| (?:\d \| )?`[a-z_]+` \|/.test(l) && !lines[i + 1]?.startsWith('| ---'))
      const codes = new Set(rows.map((l) => /`([a-z_]+)`/.exec(l)?.[1]))
      const its = [...refusals].filter((r) => r.startsWith(`${check} `)).map((r) => r.slice(2))
      expect([...codes].sort()).toEqual(its.sort())
      for (const row of rows) {
        const why = /`[a-z_]+` \| `([^`]+)`/.exec(row)?.[1] ?? ''
        expect(why.length).toBeGreaterThan(5)
        for (const piece of why.split(/<[^>]+>|: /).map((s) => s.trim().replace(/^'s /, '')).filter((s) => s.length > 2))
          expect(said.includes(piece) ? piece : `check ${check}: "${piece}" isn't in the verifier`).toBe(piece)
      }
    }
  })

  test("every refusal is in the skill's list, at its check", () => {
    const listed = new Set(
      read('skills/knock/reference/refusals.md')
        .split('\n')
        .map((l) => /^\| (\d) \| `([a-z_]+)` \|/.exec(l))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => `${m[1]} ${m[2]}`),
    )
    expect([...listed].sort()).toEqual([...refusals].sort())
  })
})

describe('door-sdk and the Door', () => {
  const sdk = code('packages/door-sdk/src/index.ts')
  const door = code('apps/door/lib/door.ts') + code('apps/door/app/knock/Door.tsx')
  const codes = new Set([
    ...[...sdk.matchAll(/KnockError\('([a-z_]+)'/g)].map((m) => m[1]),
    ...[...sdk.matchAll(/m\.error \?\? '([a-z_]+)'/g)].map((m) => m[1]),
    ...[...door.matchAll(/new Refusal\('([a-z_]+)'/g)].map((m) => m[1]),
    ...[...door.matchAll(/error: '([a-z_]+)'/g)].map((m) => m[1]),
  ])

  test('the sources were read', () => {
    for (const c of ['blocked', 'closed', 'timeout', 'challenge', 'refused', 'rejected', 'not_enrolled', 'not_ready'])
      expect(codes.has(c)).toBe(true)
  })

  test('every code is documented where people look for it', () => {
    for (const file of ['docs/reference/door-sdk.md', 'docs/guides/knock-button.md', 'skills/knock/reference/refusals.md']) {
      const documented = new Set(firstColumn(read(file)))
      for (const c of codes) expect(documented.has(c) ? c : `${file} lacks ${c}`).toBe(c)
    }
  })

  test('the defaults the docs give are the SDK’s', () => {
    expect(sdk).toContain("export const DOOR = 'http://localhost:3000'")
    expect(sdk).toContain('o.timeoutMs ?? 180_000')
    expect(sdk).toContain("'popup,width=420,height=680'")
    const ref = doc('reference/door-sdk.md')
    expect(ref).toContain("const DOOR = 'http://localhost:3000'")
    expect(ref).toContain('| `timeoutMs` | `180000` |')
    expect(ref).toContain('420 by 680')
  })
})

describe('the examples', () => {
  // A whole example has imports or exports, and no bare signatures. Fragments and listings are left out.
  const examples = [
    ...docs().map((d) => ({ from: `docs/${d.file}`, md: d.body })),
    ...filesUnder(SKILLS)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ from: `skills/${f}`, md: readFileSync(path.join(SKILLS, f), 'utf8') })),
  ].flatMap(({ from, md }) =>
    [...md.matchAll(/^```(tsx?)([^\n]*)\n([\s\S]*?)^```/gm)]
      .filter(([, , , code]) => /^(import|export) /m.test(code) && !/^function [^\n{]*$/m.test(code))
      .map(([, lang, meta, code], i) => ({
        // Each page's examples share a folder, where their titles put them, so they can import each other
        file: path.join(from.replace(/[/.]/g, '-'), /title="([^"]+)"/.exec(meta)?.[1] ?? `example-${i}.${lang}`),
        code,
      })),
  )

  test('every whole TypeScript example compiles, against door-sdk itself', () => {
    expect(examples.length).toBeGreaterThanOrEqual(10)
    const dir = path.join(ROOT, '.examples')
    const write = (file: string, text: string) => {
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, text)
    }
    rmSync(dir, { recursive: true, force: true })
    try {
      // Examples that import from a checkout beside them, as the quickstart's do, find Knock's
      mkdirSync(dir, { recursive: true })
      symlinkSync(KNOCK, path.join(dir, 'knock'))
      for (const e of examples) {
        const at = path.join(dir, e.file)
        write(at, e.code)
        // An example that imports its own copy of door-sdk, as the quickstart has you make, gets the real file
        for (const [, copy] of e.code.matchAll(/from '(\.{1,2}\/[^']*door-sdk)'/g))
          write(path.join(path.dirname(at), `${copy}.ts`), code('packages/door-sdk/src/index.ts'))
      }
      write(path.join(dir, 'site.d.ts'), 'declare function letIn(who: { human: string; name: string }): Promise<void>\n')
      write(
        path.join(dir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'es2023',
            lib: ['dom', 'dom.iterable', 'es2023'],
            module: 'esnext',
            moduleResolution: 'bundler',
            jsx: 'react-jsx',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            allowImportingTsExtensions: true,
            types: ['bun'],
            paths: {
              '@knock-dev/door-sdk': [path.join(KNOCK, 'packages/door-sdk/src/index.ts')],
              '@knock-dev/verify': [path.join(KNOCK, 'packages/verify/src/index.ts')],
              '@libsql/client': [path.join(KNOCK, 'packages/verify/node_modules/@libsql/client')],
            },
          },
          include: ['**/*.ts', '**/*.tsx'],
          exclude: ['knock'],
        }),
      )
      const tsc = Bun.spawnSync([path.join(ROOT, 'node_modules/.bin/tsc'), '-p', dir], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      expect(`${tsc.stdout}${tsc.stderr}`).toBe('')
      expect(tsc.exitCode).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 60_000)
})

describe('knock-verify', () => {
  test('every public item is in its reference', () => {
    const src = code('crates/knock-verify/src/lib.rs') + code('crates/knock-verify/src/store.rs')
    const items = new Set(
      [...src.matchAll(/^\s*pub (?:async )?(?:fn|struct|enum|trait|const) ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1]),
    )
    expect(items.size).toBeGreaterThan(40)
    const md = doc('reference/knock-verify.md')
    const missing = [...items].filter((i) => !md.includes(i))
    expect(missing).toEqual([])
  })

  test('the constants the docs give are the crate’s', () => {
    const src = code('crates/knock-verify/src/lib.rs')
    for (const [name, value] of [
      ['WORLD_CHAIN', '480'],
      ['CHALLENGE_TTL', '120'],
      ['DEPTH', '3'],
      ['CACHE_TTL', '60'],
    ]) {
      expect(src).toContain(`pub const ${name}: u64 = ${value};`)
      expect(doc('reference/knock-verify.md')).toContain(`| \`${name}\` | \`${value}\` |`)
    }
  })
})

describe('@knock-dev/verify', () => {
  const src = code('packages/verify/src/index.ts')

  test('every export is in its reference', () => {
    const items = new Set(
      [...src.matchAll(/^export (?:async )?(?:function|class|const|interface|type) ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1]),
    )
    expect(items.size).toBeGreaterThan(30)
    const md = doc('reference/verify.md')
    const missing = [...items].filter((i) => !new RegExp(`\\b${i}\\b`).test(md))
    expect(missing).toEqual([])
  })

  test('the constants the docs give are the package’s', () => {
    for (const [name, value] of [
      ['WORLD_CHAIN', '480'],
      ['CHALLENGE_MS', '120_000'],
      ['DEPTH', '3n'],
      ['CACHE_MS', '60_000'],
      ['MAX_BINDING_DAYS', '365'],
    ]) {
      expect(src).toContain(`export const ${name} = ${value}`)
      expect(doc('reference/verify.md')).toContain(`| \`${name}\` | \`${value}\` |`)
    }
  })
})

/** The settings a part reads, each in the first column of its page's tables, and no setting it doesn't read */
function documents(page: string, read: Set<string>, like: RegExp) {
  const listed = new Set(firstColumn(doc(page)).filter((c) => like.test(c)))
  expect([...listed].sort()).toEqual([...read].sort())
}

describe('self-hosting', () => {
  test("knockd's settings are in its guide", () => {
    const main = code('server/knockd/src/main.rs')
    const read = new Set([...main.matchAll(/\b(?:std::env::var|var)\("([A-Z_]+)"\)/g)].map((m) => m[1]))
    expect(read.size).toBeGreaterThanOrEqual(10)
    documents('self-host/knockd.md', read, /^[A-Z][A-Z_]+$/)
  })

  test("the Console's settings are in its guide", () => {
    const src = ['lib', 'app'].flatMap((d) => filesUnder(path.join(KNOCK, 'apps/door', d)).map((f) => code(path.join('apps/door', d, f))))
    const read = new Set(src.flatMap((t) => [...t.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z_]+)/g)].map((m) => m[1])))
    expect(read.size).toBeGreaterThanOrEqual(5)
    documents('self-host/console.md', read, /^NEXT_PUBLIC_/)
  })

  test("the Human Club's settings are in its guide", () => {
    const src = ['lib', 'app'].flatMap((d) =>
      filesUnder(path.join(KNOCK, 'apps/bouncer', d)).map((f) => code(path.join('apps/bouncer', d, f))),
    )
    const read = new Set(
      src.flatMap((t) => [...t.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1])).filter((v) => v !== 'NODE_ENV' && v !== 'VERCEL'),
    )
    expect(read.size).toBeGreaterThanOrEqual(8)
    documents('self-host/human-club.md', read, /^[A-Z][A-Z_]+$/)
  })
})

describe('the skill', () => {
  const md = readFileSync(path.join(SKILLS, 'knock', 'SKILL.md'), 'utf8')
  const { data, body } = frontMatter(md)

  test('its front matter follows the Agent Skills rules', () => {
    expect(data.name).toBe('knock')
    expect(data.name).toMatch(/^[a-z0-9-]{1,64}$/)
    expect(data.description.length).toBeGreaterThan(100)
    expect(data.description.length).toBeLessThanOrEqual(1024)
    expect(data.description).not.toMatch(/[<>]/)
    expect(Object.keys(data).sort()).toEqual(['description', 'name'])
  })

  test('its body is under 500 lines, and its references are one level deep', () => {
    expect(body.split('\n').length).toBeLessThan(500)
    const refs = [...body.matchAll(/\]\((reference\/[^)#]+)/g)].map((m) => m[1])
    expect(new Set(refs)).toEqual(new Set(['reference/api.md', 'reference/refusals.md']))
    for (const r of refs) expect(readFileSync(path.join(SKILLS, 'knock', r), 'utf8')).toMatch(/^## Contents$/m)
  })
})

describe('what agents read', () => {
  test('llms.txt links every page, in order', async () => {
    const { GET } = await import('../app/llms.txt/route')
    const txt = await GET().text()
    let at = 0
    for (const d of docs()) {
      const i = txt.indexOf(`](${SITE}${rawHrefOf(d.slug)})`)
      expect(i).toBeGreaterThan(at)
      at = i
    }
  })

  test('search finds a page by what it says', async () => {
    const { GET } = await import('../app/search.json/route')
    const entries: { href: string; text: string }[] = await (await GET()).json()
    expect(entries.length).toBeGreaterThan(80)
    expect(entries.some((e) => e.href === `${hrefOf('guides/strict-mode')}#the-three-settings`)).toBe(true)
  })
})

describe('nothing private', () => {
  const deployments = code('contracts/deployments/480.json')
  // Public contracts may be named (World ID's, ENS's, Knock's own); no wallet, relayer, signer or device key
  const allowed = new Set(
    [
      ...(deployments.match(/0x[0-9a-fA-F]{40}/g) ?? []),
      '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe', // ENS's Universal Resolver
    ].map((a) => a.toLowerCase()),
  )
  const files = [
    ...filesUnder(DOCS).map((f) => path.join('docs', f)),
    ...filesUnder(SKILLS).map((f) => path.join('skills', f)),
  ]

  test('no addresses but public contracts, no hashes, no home paths', () => {
    const found: string[] = []
    for (const f of files) {
      const text = read(f)
      for (const a of text.match(/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g) ?? [])
        if (!allowed.has(a.toLowerCase())) found.push(`${f}: an address that isn't a public contract`)
      for (const h of text.match(/0x[0-9a-fA-F]{64}(?![0-9a-fA-F])/g) ?? [])
        if (BigInt(h) !== 0n) found.push(`${f}: a 32-byte value`)
      if (text.includes('/Users/')) found.push(`${f}: a home path`)
    }
    expect(found).toEqual([])
    expect(files.length).toBeGreaterThan(15)
  })
})
