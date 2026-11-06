'use client'
import { useEffect, useState } from 'react'
import type { Heading } from '../lib/markdown'

/** The page's sections, the one being read marked as you scroll. */
export function Toc({ headings }: { headings: Heading[] }) {
  const [here, setHere] = useState<string | null>(null)
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => Boolean(e))
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        const first = els.find((el) => seen.get(el.id))
        if (first) setHere(first.id)
      },
      { rootMargin: '-72px 0px -60% 0px' },
    )
    for (const el of els) io.observe(el)
    return () => io.disconnect()
  }, [headings])
  if (!headings.length) return null
  return (
    <nav className="toc" aria-label="On this page">
      <h2>On this page</h2>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? 'sub' : undefined}>
            <a href={`#${h.id}`} aria-current={here === h.id ? 'location' : undefined}>
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
