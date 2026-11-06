import Link from 'next/link'
import type { ReactNode } from 'react'
import { type Doc, neighbours, rawHrefOf } from '../lib/content'
import { toTree } from '../lib/markdown'
import { CopyPage } from './CopyPage'
import { Markdown } from './Markdown'
import { Sidebar } from './Sidebar'
import { Toc } from './Toc'

/**
 * A page of the docs: the list of pages, the page, and its sections. `top` takes the page's title (the home page's
 * hero), and the page is wide enough for it, without the list of sections.
 */
export async function Shell({ doc, top }: { doc: Doc; top?: ReactNode }) {
  const { tree, headings } = await toTree(doc.file, doc.body)
  const { prev, next } = neighbours(doc.slug)
  return (
    <div className={top ? 'shell wide' : 'shell'}>
      <Sidebar />
      <main id="main" className="page">
        {top ?? (
          <header className="page-head">
            <h1>{doc.title}</h1>
            <p className="lede">{doc.description}</p>
          </header>
        )}
        <CopyPage raw={rawHrefOf(doc.slug)} />
        <article className="prose">
          <Markdown tree={tree} />
        </article>
        <nav className="turn" aria-label="Next and previous pages">
          {prev ? (
            <Link href={prev.href} className="prev">
              <span>Previous</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={next.href} className="next">
              <span>Next</span>
              {next.title}
            </Link>
          ) : null}
        </nav>
      </main>
      {top ? null : (
        <aside className="rail">
          <Toc headings={headings} />
        </aside>
      )}
    </div>
  )
}
