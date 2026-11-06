import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Search } from '../components/Search'
import { KNOCK_REPO, SITE } from '../lib/content'
import { mono, pixel, sans } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Knock docs', template: '%s | Knock docs' },
  description: 'Let one real human in, once: a Knock button with door-sdk, and a verifier beside your site.',
  icons: { icon: '/favicon.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${pixel.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to the page
        </a>
        <header className="top">
          <Link href="/" className="brand">
            <img src="/icon.svg" alt="" width={28} height={28} />
            Knock <span>docs</span>
          </Link>
          <Search />
          <nav className="links" aria-label="For agents and the code">
            <a href="/SKILL.md">SKILL.md</a>
            <a href="/llms.txt">llms.txt</a>
            <a href={KNOCK_REPO}>GitHub</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  )
}
