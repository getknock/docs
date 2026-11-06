'use client'
import { useState } from 'react'

/** The page as Markdown, for pasting into an assistant: the same file GitHub shows. */
export function CopyPage({ raw }: { raw: string }) {
  const [said, setSaid] = useState<string | null>(null)
  return (
    <span className="page-tools">
      <button
        type="button"
        onClick={async () => {
          try {
            const md = await (await fetch(raw)).text()
            await navigator.clipboard.writeText(md)
            setSaid('Copied as Markdown')
          } catch {
            setSaid("Couldn't copy: open the Markdown instead")
          }
          setTimeout(() => setSaid(null), 2000)
        }}
      >
        {said ?? 'Copy page'}
      </button>
      <a href={raw}>Markdown</a>
    </span>
  )
}
