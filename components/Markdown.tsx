import type { Root } from 'hast'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import Link from 'next/link'
import type { ComponentProps } from 'react'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { CodeBlock } from './CodeBlock'

/** A link: another page of the docs moves within the site, anything else is a plain link. */
function A({ href = '', ...rest }: ComponentProps<'a'>) {
  return href.startsWith('/') && !/\.(md|txt|json)(#|$)/.test(href) ? <Link href={href} {...rest} /> : <a href={href} {...rest} />
}

/** Wide tables scroll inside the column instead of widening the page. */
function Table(props: ComponentProps<'table'>) {
  return (
    <div className="table" tabIndex={0} role="region" aria-label="Table">
      <table {...props} />
    </div>
  )
}

/** A heading that links to itself. */
function heading(Tag: 'h2' | 'h3') {
  return function H({ id, children, ...rest }: ComponentProps<'h2'>) {
    return (
      <Tag id={id} {...rest}>
        <a className="here" href={`#${id}`}>
          {children}
        </a>
      </Tag>
    )
  }
}

export function Markdown({ tree }: { tree: Root }) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { a: A, pre: CodeBlock, table: Table, h2: heading('h2'), h3: heading('h3') },
  })
}
