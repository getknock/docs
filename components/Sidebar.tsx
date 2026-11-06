import { NAV, docs } from '../lib/content'
import { NavLink } from './NavLink'

/** The docs in reading order. On a narrow screen it folds into a menu above the page. */
export function Sidebar() {
  const all = docs()
  const groups = NAV.map(({ group }) => ({ group, pages: all.filter((d) => d.group === group) }))
  const list = (
    <nav aria-label="Docs">
      {groups.map(({ group, pages }) => (
        <section key={group}>
          <h2>{group}</h2>
          <ul>
            {pages.map((d) => (
              <li key={d.file}>
                <NavLink href={d.href}>{d.title}</NavLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
  return (
    <aside className="sidebar">
      <details className="menu">
        <summary>Pages</summary>
        {list}
      </details>
      <div className="wide">{list}</div>
    </aside>
  )
}
