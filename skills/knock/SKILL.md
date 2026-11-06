---
name: knock
description: Add Knock to a website, so a real human gets in with one press on their Wedgie, a USB device bound to World ID and named in ENS. Use when asked to add a Knock button or Knock sign-in, to let each human do something once (enter, vote, claim, sign up) with Knock, to use @knock-dev/door-sdk or @knock-dev/verify, to run or call knock-verifier, to embed the knock-verify Rust crate, or to debug a knock that was refused (codes such as bad_challenge, wrong_origin, records_changing, revoked, binding_not_final, already_entered).
---

# Knock

Knock lets a site let in a real human, once. The person presses green on their **Wedgie**. Its key is bound to their World ID on World Chain and named in ENS, such as `wedgie.itzraj.eth`. A site adds two things:

1. **A button** that calls `knock()` from `@knock-dev/door-sdk`. It opens Knock's **Door**, a popup that asks the Wedgie, and resolves with what the Wedgie signed: the **assertion**.
2. **A verifier**: `@knock-dev/verify` inside the site's own server when it runs JavaScript or TypeScript, or else `knock-verifier`, a small Rust service beside it. Either gives out challenges and checks assertions against ENS and World Chain, eight checks in order. The site's server acts on its answer.

## Rules that matter

1. **Call `knock()` inside the click handler, before any `await`.** Browsers allow the Door's popup only while handling a click. Pass the challenge as a promise: `knock({ challenge: getChallenge() })`. Don't `await` the challenge first.
2. **The assertion proves nothing until the verifier says yes.** Send it to the site's server, have the server check it (`verifier.verify()` from `@knock-dev/verify`, or `knock-verifier`'s `POST /verify`), and act only on that answer. Never let the browser tell the server "they're in", and never run the checks in the browser.
3. **Challenges come from the verifier only:** one per knock, used once, good for 120 seconds. Never make one up, cache one, or reuse one.
4. **The verifier's origin must be the page's origin exactly** (`origin` in `@knock-dev/verify`, `VERIFIER_ORIGIN` in the service): scheme, host and port, no path or trailing slash. `http://localhost:5173` and `http://127.0.0.1:5173` are different. Each origin (production, staging, dev) needs its own verifier and database.
5. **Key the site's records by `knock.nullifier`**, the human, not by `name` or `key`. One human can own several Wedgies, and change names.
6. **For "once per human", pass `action`** to `verify()` or `/verify`, such as `"enter"`: 1 to 32 characters of `a-z`, `0-9` and `-`. Leave it out when any number of knocks is fine.
7. **Say what happened, in the API's own words.** Show a `KnockError`'s `message`, or a refusal's `why`. Show nothing for `rejected` (red on the Wedgie) or `closed` (Door closed).
8. **Don't invent packages or install commands.** door-sdk and `@knock-dev/verify` aren't on npm, and knock-verify isn't on crates.io. The repo, `getknock/knock`, is private: use a checkout.

## Workflow

Copy this checklist and tick it off:

```
- [ ] 1. Find the site's stack, its server, and its origins (dev, staging, production)
- [ ] 2. Get door-sdk into the site
- [ ] 3. Set up a verifier for the dev origin: @knock-dev/verify, or knock-verifier
- [ ] 4. Add the server routes: challenge, and verify-then-act
- [ ] 5. Add the button
- [ ] 6. Handle every way a knock can fail
- [ ] 7. Add tests
- [ ] 8. Check it, and hand over what needs a person
```

### 1. Find the stack and origins

Read the project: its framework, where server code lives, its dev port, and how it starts sessions or records actions. Write down each origin. Ask what the user wants a knock to do (sign in, enter once, vote once) if it isn't clear.

### 2. Get door-sdk

door-sdk is one TypeScript file with no dependencies, at `packages/door-sdk/src/index.ts` in the Knock repo.

- **Site inside the Knock monorepo:** add `"@knock-dev/door-sdk": "workspace:*"`. For Next.js, add `transpilePackages: ['@knock-dev/door-sdk']`.
- **Anywhere else:** copy the file in, such as `src/lib/door-sdk.ts`, and import from it. Keep its header comment, and note where it came from.

### 3. Set up a verifier

**A JavaScript or TypeScript server** (Node 20 or later, Bun, Deno, serverless functions) runs the checks itself with `@knock-dev/verify`. Get it as door-sdk: `"@knock-dev/verify": "workspace:*"` in the Knock monorepo, or else copy `packages/verify/src/index.ts` and `packages/protocol/src/index.ts`, point the first's `'@knock-dev/protocol'` import at the second, and add `viem`, `@noble/curves` and `@libsql/client`. Make one `Verifier` per origin, with a store every instance of the server shares: `libsqlStore()` over a SQLite file, or Turso on serverless. See [reference/api.md](reference/api.md#knock-devverify-typescript).

**Any other server** runs `knock-verifier` beside it. From the root of a Knock checkout:

```bash
VERIFIER_ORIGIN=http://localhost:5173 cargo run --release -p knock-verifier
```

It listens on `127.0.0.1:8788`, needs no keys, and reads both chains through public RPCs by default. It stops at start if an RPC is the wrong chain. Other settings: `VERIFIER_ADDR`, `VERIFIER_DB`, `VERIFIER_ETH_RPC`, `VERIFIER_WORLD_RPC`, `VERIFIER_MAX_BINDING_DAYS` (365) and `VERIFIER_STRICT` (`off`). Keep strict mode off unless a knock pays out something that can't be taken back; see [reference/api.md](reference/api.md).

For a Rust server, the `knock-verify` crate runs the same checks in-process. See [reference/api.md](reference/api.md#knock-verify-rust).

### 4. Server routes

Two routes on the site's own origin. With `@knock-dev/verify`, in Next.js:

```ts
// app/api/knock/route.ts. Keep the verifier in a module of its own, which the challenge route imports too.
import { createClient } from '@libsql/client'
import { Refusal, Verifier, libsqlStore } from '@knock-dev/verify'

const verifier = new Verifier({
  origin: process.env.KNOCK_ORIGIN ?? 'http://localhost:5173', // the page's origin, exactly
  store: libsqlStore(createClient({ url: process.env.KNOCK_DB ?? 'file:knock.db', authToken: process.env.KNOCK_DB_TOKEN })),
})

export async function POST(req: Request) {
  const { assertion } = await req.json()
  try {
    const k = await verifier.verify(assertion, { action: 'enter' })
    await letIn({ human: k.nullifier, name: k.name }) // the site's own session, vote, claim…
    return Response.json({ ok: true, name: k.name })
  } catch (e) {
    if (e instanceof Refusal) return Response.json(e, { status: e.status })
    throw e
  }
}
```

The challenge route returns `{ challenge }` from `await verifier.challenge()`, catching a `Refusal` the same way.

With `knock-verifier`, the server asks it, so it stays on `127.0.0.1`:

```ts
// app/api/knock/challenge/route.ts
const VERIFIER = process.env.KNOCK_VERIFIER ?? 'http://127.0.0.1:8788'

export async function POST() {
  const r = await fetch(`${VERIFIER}/challenge`, { method: 'POST' })
  return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json' } })
}
```

```ts
// app/api/knock/route.ts
const VERIFIER = process.env.KNOCK_VERIFIER ?? 'http://127.0.0.1:8788'

export async function POST(req: Request) {
  const { assertion } = await req.json()
  const r = await fetch(`${VERIFIER}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ assertion, action: 'enter' }),
  })
  const v = await r.json()
  if (!v.ok) return Response.json({ ok: false, check: v.check, error: v.error, why: v.why }, { status: r.status })
  const { name, nullifier } = v.knock
  await letIn({ human: nullifier, name }) // the site's own session, vote, claim…
  return Response.json({ ok: true, name })
}
```

Adapt these to the site's server: Express, Hono, Rails, Django or anything that can make an HTTP request. Pass the verifier's status codes through: 400 for check 1, 403 for checks 2 to 8, 429 `busy`, 503 `unavailable`.

### 5. The button

```tsx
'use client'
import { KnockError, knock } from '@knock-dev/door-sdk' // or the copied file
import { useState } from 'react'

async function challenge(): Promise<`0x${string}`> {
  const r = await fetch('/api/knock/challenge', { method: 'POST' })
  const j = await r.json()
  if (!r.ok) throw new Error(j.why ?? 'Knock is unavailable right now')
  return j.challenge
}

export function KnockButton({ onIn }: { onIn: (name: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState<string | null>(null)

  function enter() {
    setBusy(true)
    setSaid('Waiting for your Wedgie…')
    knock({ challenge: challenge() }) // in the click itself: the Door is a popup
      .then(async (assertion) => {
        setSaid('Checking…')
        const r = await fetch('/api/knock', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ assertion }),
        })
        const v = await r.json()
        setSaid(v.ok ? null : v.why)
        if (v.ok) onIn(v.name)
      })
      .catch((e) => {
        const quiet = e instanceof KnockError && (e.code === 'rejected' || e.code === 'closed')
        setSaid(quiet ? null : e instanceof Error ? e.message : String(e))
      })
      .finally(() => setBusy(false))
  }

  return (
    <div>
      <button type="button" onClick={enter} disabled={busy}>Knock</button>
      <p role="status">{said}</p>
    </div>
  )
}
```

Without React, do the same in a plain `click` listener. Match the site's own components, styles and wording.

- One knock at a time: disable the button while one is going.
- Show the button only where knocking works: `'serial' in navigator`, which means a desktop Chromium browser. Elsewhere, keep the site's usual way in.

### 6. Failures

Every `KnockError` code and every refusal, with what to show, is in [reference/refusals.md](reference/refusals.md). The ones people meet most:

- `blocked`: popups were blocked, or `knock()` ran after an `await`.
- `not_enrolled`: the Wedgie isn't set up. The message says to use the Knock Console.
- Check 2 `bad_challenge`, "that challenge expired": more than 2 minutes passed. Knock again.
- Check 3 `records_changing`: the name was set up under a minute ago. Knock again shortly.
- Check 8 `already_entered`: the action worked; this human has done it.

### 7. Tests

- Make the knock flow take `knock` and `fetch` as parameters, and test it against fake answers: each `KnockError` code, `ok: true`, and refusals.
- Test the server route against the verifier's answers: `ok`, a 403 refusal, 429 and 503.
- If the site runs a verifier in tests, send it made-up knocks: all must bounce. The Knock repo's `apps/bouncer/scripts/bot.ts` shows how.

### 8. Check it, and hand over

- Run the project's typecheck, lint and tests.
- Start the Door (`cd apps/door && bun run dev` in the Knock checkout, on `http://localhost:3000`), the verifier, and the site.
- A knock that gets in needs a person to press green on a set-up Wedgie in a desktop Chromium browser. You can't do that: tell the user what to run and what they should see, such as "In: wedgie.itzraj.eth", and "already done" on a second knock with the same action.

## Tell the user

Say these plainly when they matter to the site:

- The Door runs locally for now (`http://localhost:3000`, door-sdk's `DOOR`). A hosted Door isn't there yet, but a site can serve its own copy: https://docs.getknock.dev/self-host/door.
- Knocking needs a desktop Chromium browser. Firefox, Safari and phones can't knock.
- The nullifier is public in ENS and the same on every site, so sites can tell the same human visited each.
- A Wedgie has no PIN: whoever holds it can knock until its owner kills or revokes its name, which needs only their wallet.
- Only bindings on Knock's KnockBinding v3, production, count, unless the verifier is set to a network of its own. World ID Simulator bindings never do.

## More

- [reference/api.md](reference/api.md): door-sdk's exports, `@knock-dev/verify`, the verifier's routes and settings, and the Rust crate.
- [reference/refusals.md](reference/refusals.md): every code, and what to show.
- The full docs are at https://docs.getknock.dev, and all in one file at https://docs.getknock.dev/llms-full.txt.
