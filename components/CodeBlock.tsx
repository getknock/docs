import type { ComponentProps } from 'react'
import { CopyButton } from './CopyButton'

const NAMES: Record<string, string> = {
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  bash: 'Shell',
  sh: 'Shell',
  shell: 'Shell',
  rust: 'Rust',
  rs: 'Rust',
  json: 'JSON',
  toml: 'TOML',
  http: 'HTTP',
  diff: 'Diff',
  html: 'HTML',
  yaml: 'YAML',
  markdown: 'Markdown',
  md: 'Markdown',
  text: 'Text',
}

type Props = ComponentProps<'pre'> & { 'data-lang'?: string; 'data-title'?: string }

/** A fenced block on the Wedgie's frame: its file or language above it, and a copy button. */
export function CodeBlock({ 'data-lang': lang = 'text', 'data-title': title, ...pre }: Props) {
  return (
    <figure className="code">
      <figcaption>
        <span className={title ? 'file' : 'lang'}>{title ?? NAMES[lang] ?? lang}</span>
        <CopyButton />
      </figcaption>
      <pre {...pre} />
    </figure>
  )
}
