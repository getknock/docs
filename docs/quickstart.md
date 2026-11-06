---
title: Quickstart
description: A Knock button on a page, a verifier beside it, and one human let in, in about fifteen minutes.
---

By the end, you'll have a page with a Knock button, a verifier that checks each knock, and a Wedgie that gets in once and is turned away the second time.

## Before you start

- **Bun** 1.4 or later, and **Rust** 1.88 or later (the crates use edition 2024 and its `let` chains).
- **A checkout of `getknock/knock`**. It's private for now, so you need access.
- **To knock:** a Wedgie that's set up in the Knock Console, meaning named and bound to a human, and Chrome or another Chromium browser on a desktop.

> [!NOTE]
> You can build all of this without a Wedgie. You need one only at step 5, to press green. [Test your integration](guides/testing.md) covers what you can check without one.

## 1. Run the Door

The Door is the popup that talks to the Wedgie. For now it runs on your machine, as part of the Knock Console.

```bash
cd knock
bun install
cd apps/door && bun run dev
```

The Console and its Door are now at `http://localhost:3000`. If your Wedgie isn't set up yet, open `http://localhost:3000/console` and follow it: it walks you through the Wedgie's key, its binding with World ID, then its name in ENS. Binding also needs knockd, Knock's own signer, running beside the Console with Knock's World ID keys; sites never talk to it.

## 2. Run a verifier for your page

Your verifier checks knocks for one origin: the scheme, host and port your page is served from. This page assumes `http://localhost:5173`, Vite's default. Use yours.

```bash
# from the root of the checkout
VERIFIER_ORIGIN=http://localhost:5173 cargo run --release -p knock-verifier
```

Before it takes a knock, it checks that its RPCs are Ethereum mainnet and World Chain, and that KnockBinding v3 is where it should be. Then it says what it checks and where it listens:

```text
INFO checked: mainnet, World Chain, KnockBinding v3 at 0x7748D2787DcB6E6024968edC19fcA13ccAbA1699; knocks for http://localhost:5173; strict: off (a binding counts once it's in a block)
INFO knock-verifier on http://127.0.0.1:8788
```

It reads both chains through public RPCs unless you give it your own, and it needs no keys. [Run a verifier](guides/verifier.md) has every setting.

## 3. Add door-sdk to your page

door-sdk is one TypeScript file with no dependencies. Until it's on npm, copy it into your project:

```bash
cp ../knock/packages/door-sdk/src/index.ts src/door-sdk.ts
```

If your site lives in the monorepo, as the Human Club does, add it as a workspace dependency instead, and import from `@knock-dev/door-sdk`:

```json title="package.json"
{
  "dependencies": {
    "@knock-dev/door-sdk": "workspace:*"
  }
}
```

With Next.js, also add `transpilePackages: ['@knock-dev/door-sdk']` to `next.config.ts`, since the package ships TypeScript.

## 4. Add the button

A knock is two requests to your verifier with one press in between: a challenge before, and the check after.

```html title="index.html"
<button id="knock" type="button">Knock</button>
<p id="said" role="status"></p>
<script type="module" src="/src/main.ts"></script>
```

```ts title="src/main.ts"
import { KnockError, knock } from './door-sdk'

const VERIFIER = 'http://localhost:8788'
const button = document.querySelector<HTMLButtonElement>('#knock')!
const said = document.querySelector<HTMLParagraphElement>('#said')!

/** A fresh challenge from your verifier: single use, good for 2 minutes. */
async function challenge(): Promise<`0x${string}`> {
  const r = await fetch(`${VERIFIER}/challenge`, { method: 'POST' })
  const j = await r.json()
  if (!r.ok) throw new Error(j.why)
  return j.challenge
}

button.addEventListener('click', async () => {
  button.disabled = true
  said.textContent = 'Waiting for your Wedgie…'
  try {
    // Call knock() in the click itself: browsers allow a popup only there.
    // It opens the Door at once and sends the challenge when it arrives.
    const assertion = await knock({ challenge: challenge() })

    said.textContent = 'Checking…'
    const r = await fetch(`${VERIFIER}/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assertion, action: 'enter' }),
    })
    const v = await r.json()
    said.textContent = v.ok ? `In: ${v.knock.name}` : `Bounced at check ${v.check}: ${v.why}`
  } catch (e) {
    said.textContent = e instanceof KnockError ? `No knock: ${e.message}` : String(e)
  } finally {
    button.disabled = false
  }
})
```

> [!WARNING]
> Here the page asks the verifier itself, which is fine for trying Knock out. When letting someone in changes something on your server, such as a session, a vote or a claim, have your server ask the verifier, and act only on its answer. [Run a verifier](guides/verifier.md#verify-from-your-server) shows how.

## 5. Knock

Run your page and press its button.

1. The Door opens as a popup. The first time, it asks you to connect the Wedgie, and the browser asks which serial device to use.
2. The Wedgie shows **KNOCK**: the name it knocks as, and `http://localhost:5173`, the origin the Door saw.
3. Press green. The Door closes, and your page says `In: wedgie.itzraj.eth`, or whichever name your Wedgie has.
4. Press the button again and press green again. This time the verifier turns the knock away at check 8: `this human has done enter here already`.

That second answer is `action: 'enter'` at work: the verifier keeps one entry per human for each action. Leave `action` out, and the same human can come in as often as they knock.

## What you have

- A challenge per knock, so a knock can't be replayed or used on another site.
- A verifier that read the name's records from ENS, the binding from World Chain, and checked the Wedgie's signature.
- One entry per human for `enter`.

## Next

- [Add a Knock button](guides/knock-button.md): the button for a real site, every error, and React.
- [Run a verifier](guides/verifier.md): settings, deployment, and verifying from your server.
- [Checks and refusals](reference/checks.md): what each check means, and what to tell people.
