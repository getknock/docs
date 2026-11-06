'use client'
import { useState } from 'react'

/** Copies the code block it sits on, as text. */
export function CopyButton() {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="copy"
      onClick={async (e) => {
        const pre = e.currentTarget.closest('figure')?.querySelector('pre')
        if (!pre) return
        await navigator.clipboard.writeText(pre.innerText.replace(/\n$/, ''))
        setDone(true)
        setTimeout(() => setDone(false), 1600)
      }}
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}
