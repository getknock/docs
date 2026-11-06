---
title: Add a Knock button
description: The browser side of Knock. Call knock() from a click, hand it a challenge, and turn every answer into words people can act on.
---

The button does three things: it gets a challenge from your verifier, calls `knock()`, and sends the knock it gets back to be checked.

## Call knock() from the click

`knock()` opens the Door as a popup. Browsers allow a popup only while they're handling a click, and that permission doesn't last long. So call `knock()` straight away in the click handler, before any `await`, and hand it the challenge as a promise:

```ts
button.addEventListener('click', () => {
  // The Door opens now, and the challenge goes to it when your verifier answers
  const knocked = knock({ challenge: challenge() })
})
```

Don't wait for the challenge first. If your verifier is slow, the click's permission can run out, and the browser blocks the Door:

```ts
button.addEventListener('click', async () => {
  const c = await challenge() // the click's permission to open a popup may be gone by now
  await knock({ challenge: c }) // may reject with KnockError('blocked')
})
```

The challenge must be the one your verifier gave, as `0x` and 64 hex digits. A challenge you make up yourself fails check 2.

## Check what comes back

`knock()` resolves with an `Assertion`: the knock as the Wedgie signed it. It isn't a decision yet. Nothing in it can be trusted until your verifier has checked it, so send it on:

```ts
const assertion = await knocked
const r = await fetch('/api/knock', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ assertion }),
})
```

Here `/api/knock` is your server, which asks your verifier and acts on its answer. [Run a verifier](verifier.md#verify-from-your-server) shows that side.

## When there's no knock

When no knock happens, `knock()` rejects with a `KnockError`. Its `code` says what happened, and its `message` says it in words you can show people as they are.

```ts
try {
  const assertion = await knock({ challenge: challenge() })
  // …
} catch (e) {
  if (!(e instanceof KnockError)) throw e
  if (e.code === 'rejected' || e.code === 'closed') return // they said no, or changed their mind
  show(e.message)
}
```

### door-sdk's own codes

| Code | What happened | What to show or do |
| --- | --- | --- |
| `blocked` | The browser didn't open the Door. | Ask them to allow popups for your site. Check that `knock()` runs in the click itself. |
| `closed` | The Door was closed before the Wedgie knocked. | Nothing. Let them knock again. |
| `timeout` | No knock within `timeoutMs`, 3 minutes by default. The Door is closed. | "No knock in time. Try again." |
| `challenge` | Your challenge failed: the promise rejected, or it isn't `0x` and 64 hex digits. | Your verifier is down or busy. Say Knock is unavailable for now, and log it. |
| `refused` | The Door said no without a code. | Show the message. |

### The Door's codes

The Door answers with these, and door-sdk passes them on as they are.

| Code | What happened | What to show or do |
| --- | --- | --- |
| `rejected` | Red on the Wedgie. | Nothing: they said no. |
| `timeout` | Nobody pressed on the Wedgie within 2 minutes. | "No press on your Wedgie. Try again." |
| `not_enrolled` | The Wedgie has no name yet, or isn't bound to a human. | The message: it says to set the Wedgie up in the Knock Console. |
| `not_ready` | The Door couldn't talk to the Wedgie: unplugged, or gone mid-knock. | Ask them to check the Wedgie is plugged in, then knock again. |
| `bad_origin` | Your page isn't on `https://`, or on `localhost` or `127.0.0.1` for development. | Serve your page over https. |
| `bad_request` | The challenge or mode was wrong, or the Wedgie couldn't read the request. | Pass your verifier's challenge as it is, and leave `mode` out. |
| `bad_signature` | The Wedgie's knock didn't hold for your site and challenge, so the Door sent nothing. | Rare. Let them knock again. |

The Wedgie's own codes also come through the Door as they are, such as `no_key` when the Wedgie has no Knock key yet. Show the message.

### When the Door waits instead

Some trouble stays in the Door's window, and your page hears nothing until the person closes it (`closed`) or the time runs out (`timeout`):

- **Another tab has the Wedgie**, such as the Knock Console. Only one tab can talk to it at a time, so the Door asks them to disconnect it there.
- **The Wedgie hasn't been connected to the Door before.** The Door shows a button, and the browser asks which serial device to use.
- **The Door is framed.** It never works inside another page, since a frame could cover what it says.

## Keep it to one knock at a time

Disable the button while a knock is going, and say what's happening. Each `knock()` opens the popup window named `knock-door`, so a second knock while the first is open takes over its window.

| While | Say |
| --- | --- |
| The Door is open | "Waiting for your Wedgie…" |
| Your verifier is checking | "Checking…" |
| It passed | Who's in, by name |
| It bounced | The verifier's `why`, such as "wedgie.itzraj.eth is revoked: its owner turned it off" |

## Show it only where knocking works

The Door reaches the Wedgie over Web Serial, which only desktop Chromium browsers have. The Door runs in the same browser as your page, so your page can tell:

```ts
const canKnock = typeof navigator !== 'undefined' && 'serial' in navigator
```

Where `canKnock` is false, show your usual way in, or a line saying Knock needs Chrome, Edge or another Chromium browser on a computer.

## A React component

This one asks your server for the challenge and the check, so the browser never decides who's in.

```tsx title="KnockButton.tsx"
'use client'
import { KnockError, knock } from '@knock-dev/door-sdk'
import { useState } from 'react'

type Said = { busy: boolean; text: string | null }

async function challenge(): Promise<`0x${string}`> {
  const r = await fetch('/api/knock/challenge', { method: 'POST' })
  const j = await r.json()
  if (!r.ok) throw new Error(j.why ?? 'Knock is unavailable right now')
  return j.challenge
}

export function KnockButton({ onIn }: { onIn: (name: string) => void }) {
  const [said, setSaid] = useState<Said>({ busy: false, text: null })

  function enter() {
    setSaid({ busy: true, text: 'Waiting for your Wedgie…' })
    knock({ challenge: challenge() })
      .then(async (assertion) => {
        setSaid({ busy: true, text: 'Checking…' })
        const r = await fetch('/api/knock', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ assertion }),
        })
        const v = await r.json()
        if (v.ok) {
          setSaid({ busy: false, text: null })
          onIn(v.name)
        } else setSaid({ busy: false, text: v.why })
      })
      .catch((e) => {
        const quiet = e instanceof KnockError && (e.code === 'rejected' || e.code === 'closed')
        setSaid({ busy: false, text: quiet ? null : e instanceof Error ? e.message : String(e) })
      })
  }

  return (
    <div>
      <button type="button" onClick={enter} disabled={said.busy}>
        Knock
      </button>
      <p role="status">{said.text}</p>
    </div>
  )
}
```

The Human Club does the same in [`apps/bouncer/app/Knock.tsx`](https://github.com/getknock/knock/blob/main/apps/bouncer/app/Knock.tsx), and ticks off the checks as they pass.

## Options

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `challenge` | `` `0x${string}` `` or a promise of one | Required | Your verifier's challenge. A promise lets the Door open at once. |
| `mode` | `1` | `1` | Bound: the human comes from the Wedgie's binding. Mode 2 isn't offered. |
| `door` | `string` | `DOOR`, `https://door.getknock.dev` | Where the Door is. |
| `timeoutMs` | `number` | `180000` | How long the whole knock may take, presses included. |

The [door-sdk reference](../reference/door-sdk.md) has every type, and the messages door-sdk and the Door send each other.
