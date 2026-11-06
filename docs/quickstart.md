---
title: Quickstart
description: A Knock button on a page, a server that checks each knock with @knock-dev/verify, and one human let in, in about fifteen minutes.
---

By the end, you'll have a page with a Knock button, a small server that checks each knock with `@knock-dev/verify`, and a Wedgie that gets in once and is turned away the second time.

## Before you start

- **Bun** 1.4 or later.
- **A checkout of [`getknock/knock`](https://github.com/getknock/knock)**, with `bun install` run in it. The packages aren't on npm yet, so you'll import them from the checkout, working in a folder beside it.
- **To knock:** a Wedgie that's set up in the [Knock Console](https://getknock.dev), meaning named and bound to a human, and Chrome or another Chromium browser on a desktop.

```bash
git clone https://github.com/getknock/knock
cd knock && bun install && cd ..
```

> [!NOTE]
> You can build all of this without a Wedgie. You need one only at step 3, to press green. [Test your integration](guides/testing.md) covers what you can check without one.

## 1. Check knocks in your server

Your server checks each knock with `@knock-dev/verify`, Knock's eight checks as a TypeScript package. It gives out a challenge before each knock, then checks what the Wedgie signed against ENS and World Chain.

Make a folder beside your checkout:

```bash
mkdir knock-quickstart && cd knock-quickstart
```

Then the server, in one file. It serves your page and answers two routes: one gives out challenges, the other checks knocks.

```ts title="server.ts"
import { Refusal, Verifier, memoryStore } from '../knock/packages/verify/src/index.ts'
import page from './index.html'

// Checks knocks for this page's origin. It keeps what it has seen in memory, which is fine for one process.
const verifier = new Verifier({ origin: 'http://localhost:5173', store: memoryStore() })

// A refusal as JSON, with the HTTP status knock-verifier would give it
function refused(e: unknown) {
  if (e instanceof Refusal) return Response.json(e, { status: e.status })
  throw e
}

Bun.serve({
  port: 5173,
  routes: {
    '/': page,
    '/api/challenge': {
      POST: async () => {
        try {
          const { challenge } = await verifier.challenge()
          return Response.json({ challenge })
        } catch (e) {
          return refused(e)
        }
      },
    },
    '/api/knock': {
      POST: async (req) => {
        const { assertion } = await req.json()
        try {
          // 'enter' lets each human in once. Leave the action out to let them in every time.
          const k = await verifier.verify(assertion, { action: 'enter' })
          return Response.json({ ok: true, name: k.name })
        } catch (e) {
          return refused(e)
        }
      },
    },
  },
})

console.log('Open http://localhost:5173')
```

The package isn't on npm yet, so the server imports it from your checkout.

The verifier checks knocks for one origin: the scheme, host and port your page is served from. Here that's `http://localhost:5173`, where this server serves the page. It reads both chains through public RPCs unless you give it your own, and it needs no keys.

`memoryStore()` keeps the challenges the verifier gave out, each Wedgie's counter and each human's entries in memory, and forgets them when the server stops. A real site keeps them in a database: [Check knocks in your server](guides/verify-in-your-server.md) shows how, with every setting.

If your server isn't JavaScript, run [`knock-verifier`](guides/verifier.md) beside it instead. It runs the same checks as a small Rust service, and your server asks it over HTTP.

## 2. Add the button

The page is two files beside `server.ts`. It imports door-sdk, the browser side of Knock, from your checkout too. door-sdk opens Knock's Door, at `https://door.getknock.dev`: the popup that talks to the Wedgie over USB. There's nothing to run for it.

```html title="index.html"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Knock</title>
  </head>
  <body>
    <button id="knock" type="button">Knock</button>
    <p id="said" role="status"></p>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

A knock is two requests to your server with one press in between: a challenge before, and the check after.

```ts title="main.ts"
import { KnockError, knock } from '../knock/packages/door-sdk/src/index.ts'

const button = document.querySelector<HTMLButtonElement>('#knock')!
const said = document.querySelector<HTMLParagraphElement>('#said')!

/** A fresh challenge from your server: single use, good for 2 minutes. */
async function challenge(): Promise<`0x${string}`> {
  const r = await fetch('/api/challenge', { method: 'POST' })
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
    const r = await fetch('/api/knock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assertion }),
    })
    const v = await r.json()
    said.textContent = v.ok ? `In: ${v.name}` : `Bounced at check ${v.check}: ${v.why}`
  } catch (e) {
    said.textContent = e instanceof KnockError ? `No knock: ${e.message}` : String(e)
  } finally {
    button.disabled = false
  }
})
```

The page only shows what the server decided. Your server is what lets someone in, counts a vote or starts a session, so it never takes the page's word for who got in.

## 3. Knock

Start the server:

```bash
bun server.ts
```

Open `http://localhost:5173` and press the button.

1. The Door opens as a popup, from `door.getknock.dev`. The first time, it asks you to connect the Wedgie, and the browser asks which serial device to use.
2. The Wedgie shows **KNOCK**: the name it knocks as, and `http://localhost:5173`, the origin the Door saw.
3. Press green. The Door closes, and your page says `In: wedgie.itzraj.eth`, or whichever name your Wedgie has.
4. Press the button again and press green again. This time your server turns the knock away at check 8: `this human has done enter here already`.

That second answer is `action: 'enter'` at work: the verifier keeps one entry per human for each action. Leave `action` out, and the same human can come in as often as they knock.

## What you have

- A challenge per knock, so a knock can't be replayed or used on another site.
- A server that read the name's records from ENS and the binding from World Chain, and checked the Wedgie's signature, before letting anyone in.
- One entry per human for `enter`.

## Next

- [Add a Knock button](guides/knock-button.md): the button for a real site, every error, and React.
- [Check knocks in your server](guides/verify-in-your-server.md): a database for what the verifier remembers, serverless functions, and every setting.
- [Run a verifier](guides/verifier.md): the same checks as a service, for a server in another language.
- [Checks and refusals](reference/checks.md): what each check means, and what to tell people.
