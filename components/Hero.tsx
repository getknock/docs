import Link from 'next/link'

const CHECKS = ['made right', 'just now, here', 'named in ENS', 'signed, pressed', 'never seen', 'bound human', 'fresh proof', 'first time in']

/**
 * One knock, start to end, played once as the page opens: the site's button, the Door, the Wedgie's own KNOCK screen
 * and a green press, then the verifier's checks and the stamp. With reduced motion it's the finished picture.
 */
function KnockFlow() {
  return (
    <figure className="flow">
      <div className="track" aria-hidden="true">
        <span className="dot" />
      </div>
      <ol className="stations">
        <li className="station">
          <div className="window site" aria-hidden="true">
            <div className="bar">
              <i />
              <i />
              <i />
              <span>club.example</span>
            </div>
            <div className="body">
              <p>Members get in once.</p>
              <span className="knock-btn">Knock</span>
            </div>
          </div>
          <p>
            <strong>Your page</strong> calls <code>knock()</code> from a click.
          </p>
        </li>
        <li className="station">
          <div className="window door" aria-hidden="true">
            <div className="bar">
              <img src="/icon.svg" alt="" />
              <span>Knock</span>
            </div>
            <div className="body">
              <p className="origin">https://club.example</p>
              <p>asks your Wedgie to knock, as a bound human</p>
            </div>
          </div>
          <p>
            <strong>Knock's Door</strong> opens and asks the Wedgie, over USB.
          </p>
        </li>
        <li className="station">
          <div className="device" aria-hidden="true">
            <div className="screen">
              <p className="title">
                <img src="/icon.svg" alt="" />
                KNOCK
              </p>
              <p>as wedgie.itzraj.eth</p>
              <p className="muted">for</p>
              <p>https://club.example</p>
              <p className="muted small">unverified: the Door says so</p>
              <p className="muted small foot">a bound human</p>
            </div>
            <div className="buttons">
              <span className="go" />
              <span className="stop" />
            </div>
          </div>
          <p>
            <strong>Its owner</strong> reads the site on the screen and presses green.
          </p>
        </li>
        <li className="station">
          <div className="checklist" aria-hidden="true">
            <ol>
              {CHECKS.map((c, i) => (
                <li key={c} style={{ '--n': i } as React.CSSProperties} className={i === 6 ? 'not-asked' : undefined}>
                  {c}
                </li>
              ))}
            </ol>
            <p className="stamp">In</p>
          </div>
          <p>
            <strong>Your verifier</strong> checks ENS, World Chain and the signature: one human, in once.
          </p>
        </li>
      </ol>
      <figcaption className="sr">
        A knock: your page asks for one, Knock's Door opens and asks the Wedgie, its owner presses green, and your
        verifier checks the knock and lets one human in.
      </figcaption>
    </figure>
  )
}

export function Hero() {
  return (
    <header className="hero">
      <h1>
        <span>One press.</span> <span>One human.</span>
      </h1>
      <p className="lede">
        Knock lets your site let in a real person, once. They press green on their Wedgie, and your verifier checks
        that press against ENS and World Chain. You add a button and run one small service beside your site; nobody
        makes an account or types a thing.
      </p>
      <p className="ctas">
        <Link className="go" href="/quickstart">
          Start the quickstart
        </Link>
        <Link href="/how-it-works">How a knock works</Link>
      </p>
      <KnockFlow />
    </header>
  )
}
