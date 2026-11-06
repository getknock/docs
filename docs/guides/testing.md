---
title: Test your integration
description: What to test without a Wedgie, the knocks to try with one, and the Human Club and its bot as a working reference.
---

Most of a Knock integration can be tested without a Wedgie: what your page does with each answer, and what your server does with each verdict. You need a Wedgie, and a person to press it, only for the knocks that get in.

## Without a Wedgie

### Your page's answers

Keep the code that calls `knock()` apart from the code that shows the result, so a test can hand it any answer. Here `enter` takes `knock` and `fetch` as arguments:

```ts title="enter.ts"
import { type Assertion, KnockError, type KnockOptions, knock as realKnock } from '@knock-dev/door-sdk'

export type Said = { in: string } | { out: string } | { quiet: true }
type Post = (url: string, init: RequestInit) => Promise<Response>

export async function enter(
  challenge: () => Promise<`0x${string}`>,
  knock: (o: KnockOptions) => Promise<Assertion> = realKnock,
  post: Post = fetch,
): Promise<Said> {
  try {
    const assertion = await knock({ challenge: challenge() })
    const v = await (await post('/api/knock', { method: 'POST', body: JSON.stringify({ assertion }) })).json()
    return v.ok ? { in: v.name } : { out: v.why }
  } catch (e) {
    if (e instanceof KnockError && (e.code === 'rejected' || e.code === 'closed')) return { quiet: true }
    return { out: e instanceof Error ? e.message : String(e) }
  }
}
```

```ts title="enter.test.ts"
import { expect, test } from 'bun:test'
import { type Assertion, KnockError } from '@knock-dev/door-sdk'
import { enter } from './enter'

const challenge = async () => `0x${'ab'.repeat(32)}` as const

test('red on the Wedgie says nothing', async () => {
  const red = () => Promise.reject(new KnockError('rejected', 'Red on the Wedgie: no knock.'))
  expect(await enter(challenge, red)).toEqual({ quiet: true })
})

test('a bounce shows the verifier’s why', async () => {
  const knocked = async () => ({}) as Assertion
  const bounced = async () =>
    Response.json({ ok: false, check: 3, error: 'revoked', why: 'wedgie.itzraj.eth is revoked: its owner turned it off' })
  expect(await enter(challenge, knocked, bounced)).toEqual({
    out: 'wedgie.itzraj.eth is revoked: its owner turned it off',
  })
})
```

Cover each code in [Add a Knock button](knock-button.md#when-theres-no-knock), and a verifier that can't be reached.

### Your server's verdicts

Your server route acts on the verifier's answer, so test it against each kind: `{ok: true}`, a refusal from each check, `busy` with status 429 and `unavailable` with status 503. Stub the verifier's HTTP answers, or run a real verifier and send it knocks that bounce.

The Human Club's bot sends a real verifier the knocks a bot would try, for the club's origin, `http://localhost:3001`. It signs them with a key of its own, so none should get in, and it says where each one bounced:

```bash
cd apps/bouncer
bun run bot wedgie.itzraj.eth http://localhost:8788
```

```text
The Human Club's bot tries to get in as wedgie.itzraj.eth, without its Wedgie (verifier http://localhost:8788):
  its own key, a fresh challenge           bounced at check 4: not signed by wedgie.itzraj.eth's key, for this site and challenge
  a knock signed for another site          bounced at check 2: the knock is for https://evil.example, not http://localhost:3001
  …
Nothing got in.
```

It exits with 1 if anything got in. Each try bounces at the first check that catches it, so what it prints depends on the name you give it, and on the verifier: a name with no Knock records bounces at check 3, and a verifier for another origin turns most tries away at check 2. [`apps/bouncer/scripts/bot.ts`](https://github.com/getknock/knock/blob/main/apps/bouncer/scripts/bot.ts) is a starting point for a bot of your own.

### The protocol

[`spec/vectors/v1.json`](https://github.com/getknock/knock/blob/main/spec/vectors/v1.json) holds test vectors: a published test key, and the digests and signatures of each message Knock signs. Don't use that key for anything real. `@knock-dev/protocol`'s tests check the TypeScript side against them, and `knock-verify`'s tests take the vectors' signed knock through all eight checks with a stand-in chain:

```bash
bun run --filter @knock-dev/protocol test
cargo test -p knock-verify
```

## With a Wedgie

Run the Door on `http://localhost:3000`, your page, and a verifier for your page's origin, then try each of these. Each row is one knock.

| Do this | Expect |
| --- | --- |
| Press green | In |
| Knock again, with the same action | Check 8: `already_entered` |
| Knock again, with no action | In |
| Press red | `KnockError` `rejected` |
| Close the Door before pressing | `KnockError` `closed` |
| Leave the KNOCK screen for 2 minutes | `KnockError` `timeout`, from the Wedgie |
| Stop your verifier, then knock | `KnockError` `challenge` |
| Keep the Wedgie connected in the Console's tab, then knock | The Door asks you to disconnect it there |
| Set the name's `knock.status` to `revoked` in the ENS app, then knock | Check 3: `revoked` |
| Kill the name in the Console, then knock | Check 3: `no_name` |
| Name a Wedgie, then knock within a minute | Check 3: `records_changing`, then in a minute later |
| With `VERIFIER_STRICT=on`, knock within minutes of binding | Check 6: `binding_not_final` |
| Run a verifier for another origin, then knock from your page | Check 2: `wrong_origin` |

Revoking and killing change the name for every site, so use a Wedgie set up for testing.

## The Human Club

The Human Club is a whole Knock site: petitions and fundraisers where each human signs once, with the checks ticked off as they pass. It checks knocks in its own functions with `@knock-dev/verify`, so it needs no verifier beside it. It's in [`apps/bouncer`](https://github.com/getknock/knock/blob/main/apps/bouncer/lib/club.ts), and runs on port 3001:

```bash
# two terminals, from the root of the checkout
cd apps/door && bun run dev        # the Door, on 3000
cd apps/bouncer && bun run dev     # the club, on 3001
```

Its records go in `apps/bouncer/human-club.db`. Delete the file to start again. [Host the Human Club](../self-host/human-club.md) has its settings.
