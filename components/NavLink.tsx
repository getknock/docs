'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/** A link in the sidebar, marked when it's the page being read. */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const here = usePathname().replace(/\/$/, '') === href.replace(/\/$/, '')
  return (
    <Link href={href} aria-current={here ? 'page' : undefined}>
      {children}
    </Link>
  )
}
