---
title: door-sdk
description: Every export of @knock-dev/door-sdk, the knock it returns field by field, and the messages it and the Door send each other.
---

`@knock-dev/door-sdk` is the browser side of Knock: one TypeScript file with no dependencies, in [`packages/door-sdk/src/index.ts`](https://github.com/getknock/knock/blob/main/packages/door-sdk/src/index.ts). It needs a browser, since it opens a window.

```ts
import { DOOR, type Assertion, type Hex, KnockError, type KnockOptions, knock } from '@knock-dev/door-sdk'
```

## knock()

```ts
function knock(options: KnockOptions): Promise<Assertion>
```

Opens the Door and resolves with the knock the Wedgie signed, or rejects with a `KnockError`. Call it from a click: it opens the Door straight away, and browsers allow that only while they're handling a click.

In order, `knock()`:

1. opens `<door>/knock` in a popup window named `knock-door`, 420 by 680 pixels, or rejects with `blocked`;
2. waits for the Door's `knock/ready`, and for your challenge, whichever comes last;
3. checks the challenge is `0x` and 64 hex digits, or rejects with `challenge`;
4. posts `knock/request` to the Door, addressed to the Door's origin only;
5. resolves with the `knock/result`'s assertion, or rejects with its error.

It rejects with `closed` if the popup is closed first, and with `timeout`, closing the popup, if `timeoutMs` passes. It takes messages only from the popup it opened, at the Door's origin.

## KnockOptions

```ts
type KnockOptions = {
  challenge: Hex | Promise<Hex>
  mode?: 1
  door?: string
  timeoutMs?: number
}
```

| Field | Default | What it is |
| --- | --- | --- |
| `challenge` | Required | Your verifier's challenge from `POST /challenge`, or a promise of it. With a promise, the Door opens at once and gets the challenge when it arrives. |
| `mode` | `1` | Bound: the human comes from the Wedgie's binding. Mode 2, Fresh, isn't offered. |
| `door` | `DOOR` | The Door's URL. Only its origin is used: the popup opens at `/knock` there. |
| `timeoutMs` | `180000` | How long the whole knock may take, presses included. The Wedgie itself gives up after 2 minutes without a press. |

## Assertion

The knock, as the Wedgie signed it and the Door handed it over. Send it to your verifier as it is, and trust none of it until the verifier says `ok`.

```ts
type Assertion = {
  v: 1
  name: string
  challenge: Hex
  origin: string
  deviceNode: Hex
  counter: number
  mode: 1
  nullifier: Hex
  humanRef: Hex
  r: Hex
  s: Hex
}
```

| Field | What it is |
| --- | --- |
| `v` | The format's version: `1`. |
| `name` | The ENS name the Wedgie knocks as, such as `wedgie.itzraj.eth`. |
| `challenge` | Your verifier's challenge, 32 bytes. |
| `origin` | Your page's origin, as the Door read it from the browser. |
| `deviceNode` | The name's ENS namehash. |
| `counter` | The Wedgie's knock counter. It rises with each knock, on any site. |
| `mode` | `1`, Bound. |
| `nullifier` | The human's nullifier, 32 bytes, as the Wedgie holds it. Check 6 compares it with the name's ENS records. |
| `humanRef` | 32 zero bytes in mode 1. |
| `r`, `s` | The Wedgie's P-256 signature over the knock's `KnockPass` digest, `s` low. |

The [protocol](protocol.md#knockpass) page says how the digest is made.

## KnockError

```ts
class KnockError extends Error {
  readonly code: string
}
```

Why there was no knock. `code` is for your code, and `message` is a sentence you can show people.

| `code` | From | Meaning |
| --- | --- | --- |
| `blocked` | door-sdk | The browser didn't open the popup. |
| `closed` | door-sdk | The popup was closed before a knock. |
| `timeout` | door-sdk | `timeoutMs` passed. |
| `challenge` | door-sdk | The challenge's promise rejected, or it isn't `0x` and 64 hex digits. |
| `refused` | door-sdk | The Door said no without a code. |
| `rejected` | The Door | Red on the Wedgie. |
| `timeout` | The Door | Nobody pressed on the Wedgie within 2 minutes. |
| `not_enrolled` | The Door | The Wedgie has no name, or isn't bound to a human. |
| `not_ready` | The Door | The Door couldn't talk to the Wedgie. |
| `bad_origin` | The Door | The page isn't on `https://`, or `localhost` or `127.0.0.1` for development. |
| `bad_request` | The Door | The challenge or mode was wrong, or the Wedgie couldn't read the request. |
| `bad_signature` | The Door | The Wedgie's knock didn't hold for this site and challenge, so nothing was sent. |
| `no_key` | The Wedgie, through the Door | The Wedgie has no Knock key yet. |

The Door passes the Wedgie's other codes on as they are. [Add a Knock button](../guides/knock-button.md#when-theres-no-knock) says what to show for each.

## DOOR

```ts
const DOOR = 'http://localhost:3000'
```

The Door that door-sdk opens unless you pass `door`: Knock's own, which runs locally for now, as part of the Knock Console.

## Hex

```ts
type Hex = `0x${string}`
```

## The messages

door-sdk and the Door talk with `postMessage`. You only need these if you write your own client.

| Message | From, to | Sent to | Body |
| --- | --- | --- | --- |
| `knock/ready` | Door to your page | Any origin | `{ type: 'knock/ready' }`. It says only that the Door is up. |
| `knock/request` | Your page to the Door | The Door's origin | `{ type: 'knock/request', challenge, mode: 1 }` |
| `knock/result` | Door to your page | Your page's origin | `{ type: 'knock/result', ok: true, assertion }`, or `{ type: 'knock/result', ok: false, error, why }` |

The Door:

- takes a request only from the window that opened it, and reads that window's origin from the browser, as the message's `origin`;
- answers once, and only to that origin;
- takes one request, and closes itself a moment after a knock;
- refuses to work inside a frame.
