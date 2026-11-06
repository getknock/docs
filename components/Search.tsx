'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export type Entry = { title: string; href: string; heading: string; text: string }

/** Where the first word of the search is in a section's text, with some text either side, cut between words. */
function snippet(text: string, words: string[]): string {
  const at = Math.max(0, ...words.map((w) => text.toLowerCase().indexOf(w)).filter((i) => i >= 0).slice(0, 1))
  const from = at > 60 ? text.indexOf(' ', at - 60) + 1 : 0
  const cut = text.lastIndexOf(' ', from + 160)
  const to = from + 160 >= text.length ? text.length : cut > from ? cut : from + 160
  return `${from > 0 ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`
}

export function find(index: Entry[], query: string): Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return index
    .map((e) => {
      const head = `${e.title} ${e.heading}`.toLowerCase()
      const all = `${head} ${e.text.toLowerCase()}`
      if (!words.every((w) => all.includes(w))) return null
      const score = words.reduce((n, w) => n + (head.includes(w) ? 10 : 0) + (all.split(w).length - 1), 0)
      return { e, score }
    })
    .filter((x): x is { e: Entry; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.e)
}

/** Search every section of every page, from ⌘K (Ctrl K) or the button. The index is one small file, fetched once. */
export function Search() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState<Entry[] | null>(null)
  const [query, setQuery] = useState('')
  const [at, setAt] = useState(0)
  // ⌘K on a Mac, Ctrl K elsewhere: known only in the browser, so set after the first render
  const [shortcut, setShortcut] = useState('⌘K')
  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut('Ctrl K')
  }, [])
  const router = useRouter()
  const results = useMemo(() => (index ? find(index, query) : []), [index, query])
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)

  const open = () => {
    dialog.current?.showModal()
    if (!index)
      fetch('/search.json')
        .then((r) => r.json())
        .then(setIndex)
        .catch(() => setIndex([]))
  }
  const go = (e: Entry | undefined) => {
    if (!e) return
    dialog.current?.close()
    setQuery('')
    router.push(e.href)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <button type="button" className="search-open" onClick={open}>
        <span>
          Search<span className="more"> the docs</span>
        </span>
        <kbd>{shortcut}</kbd>
      </button>
      <dialog
        ref={dialog}
        className="search"
        aria-label="Search the docs"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <input
          type="search"
          placeholder="Search: strict, V6, challenge, knock()…"
          value={query}
          autoFocus
          onChange={(e) => {
            setQuery(e.target.value)
            setAt(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setAt((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setAt((i) => Math.max(i - 1, 0))
            } else if (e.key === 'Enter') go(results[at])
          }}
          aria-controls="search-results"
          aria-activedescendant={results[at] ? `result-${at}` : undefined}
        />
        <ul id="search-results" role="listbox">
          {results.map((r, i) => (
            <li key={`${r.href}`} id={`result-${i}`} role="option" aria-selected={i === at}>
              <a
                href={r.href}
                onClick={(e) => {
                  e.preventDefault()
                  go(r)
                }}
                onMouseEnter={() => setAt(i)}
              >
                <strong>
                  {r.title}
                  {r.heading ? <span>, {r.heading}</span> : null}
                </strong>
                <span className="snippet">{snippet(r.text, words)}</span>
              </a>
            </li>
          ))}
        </ul>
        {query && index && !results.length ? <p className="none">Nothing on “{query}”. Try fewer words.</p> : null}
        {!index ? <p className="none">Reading the index…</p> : null}
      </dialog>
    </>
  )
}
