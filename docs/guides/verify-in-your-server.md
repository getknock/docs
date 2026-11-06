---
title: Check knocks in your server
description: "@knock-dev/verify runs the eight checks inside your own server: Node, Bun, Deno, or serverless and edge functions. No service beside your site."
---

`@knock-dev/verify` is the verifier as a package. It runs the same eight checks as [`knock-verifier`](verifier.md), in the same order, with the same codes and words, but inside your own server, so there's no second service to run. It works wherever modern JavaScript runs on a server: Node 20 or later, Bun, Deno, and serverless or edge functions.

> [!IMPORTANT]
> Run it on your server, never in the visitor's browser. A check that runs in the browser is one the person being checked can skip, and what makes a knock count once (used challenges, counters, entries) would be theirs to clear.

## Add it

It isn't on npm yet. Use it from a checkout of `getknock/knock`, in one of two ways.

In a workspace with Knock's packages, as the Human Club does:

```json title="package.json"
{
  "dependencies": {
    "@knock-dev/verify": "workspace:*",
    "@libsql/client": "^0.18.0"
  }
}
```

Anywhere else, copy its file and the protocol's into your project, point one at the other, and add their two dependencies:

```bash
mkdir -p src/knock
cp ../knock/packages/protocol/src/index.ts src/knock/protocol.ts
cp ../knock/packages/verify/src/index.ts src/knock/verify.ts
sed -i.bak "s#'@knock-dev/protocol'#'./protocol'#" src/knock/verify.ts && rm src/knock/verify.ts.bak
bun add viem @noble/curves @libsql/client
```

Then import from `./knock/verify` instead of `@knock-dev/verify`.

## Make your verifier

One verifier checks knocks for one origin, your site's, and keeps what it has seen in a store.

```ts title="knock.ts"
import { createClient } from '@libsql/client'
import { Verifier, libsqlStore, rpcChain } from '@knock-dev/verify'

export const verifier = new Verifier({
  // Your site's origin, exactly as browsers send it
  origin: 'https://club.example',
  // What it remembers between knocks: a SQLite file here, or Turso
  store: libsqlStore(
    createClient({ url: process.env.KNOCK_DB_URL ?? 'file:knock.db', authToken: process.env.KNOCK_DB_TOKEN }),
  ),
  // Your own RPCs. Public ones are used if you leave these out.
  chain: rpcChain({ eth: process.env.ETH_RPC, world: process.env.WORLD_RPC }),
})
```

## Give out challenges

Your page asks your server for a challenge just before it knocks. Each one is good for one knock, for two minutes.

```ts title="challenge.ts"
import { Refusal } from '@knock-dev/verify'
import { verifier } from './knock'

export async function POST() {
  try {
    const { challenge } = await verifier.challenge()
    return Response.json({ challenge })
  } catch (e) {
    if (e instanceof Refusal) return Response.json(e, { status: e.status })
    throw e
  }
}
```

A `Refusal` turns into `{ ok: false, check, error, why }` as JSON, the same shape `knock-verifier` answers with, and its `status` is the HTTP status the service would give.

## Check a knock

The page hands you what door-sdk's `knock()` resolved with. `verify()` runs V1 to V8, then writes what the knock used up, all of it or none:

```ts title="verify.ts"
import { Refusal } from '@knock-dev/verify'
import { verifier } from './knock'

export async function POST(req: Request) {
  const { assertion } = await req.json()
  try {
    // `action` lets each human do it once (V8). Leave it out to let them in every time.
    const k = await verifier.verify(assertion, { action: 'enter' })
    // In: one human, bound on World Chain. Their nullifier is the same on every Knock site.
    await letIn({ human: k.nullifier, name: k.name })
    return Response.json({ ok: true, name: k.name })
  } catch (e) {
    if (e instanceof Refusal) return Response.json(e, { status: e.status })
    throw e
  }
}
```

These are web-standard handlers, so they fit Next.js route handlers, Bun, Deno, Hono and the like as they are. Express and Fastify take the same calls with their own request and response.

The page side doesn't change: [Add a Knock button](knock-button.md) shows `knock()` with a challenge from your server, then sending the assertion back.

## Settings

Everything is an option to `new Verifier()`. Only `origin` and `store` are needed.

| Option | Default | What it does |
| --- | --- | --- |
| `origin` | none | Your site's origin, exactly as browsers send it: `https://host` or `https://host:port`, or `http://localhost` or `http://127.0.0.1`, with or without a port, for development. Knocks for any other origin fail check 2. |
| `store` | none | Where it keeps challenges, counters, revoked keys and entries. See below. |
| `chain` | public RPCs | Where it reads ENS on mainnet and bindings on World Chain: `rpcChain({ eth, world })`, each a URL or a viem client. |
| `maxBindingDays` | `365` | How old a binding's World ID proof may be, in days. Older bindings fail check 6 as `binding_expired`. |
| `strict` | `'off'` | Whether a binding must be final on World Chain first: `'off'`, `'safe'` or `'finalized'`. [Strict mode](strict-mode.md) explains the choice. `strictFrom()` reads `on`, `true` and the like from an environment variable. |
| `contract` | Knock's KnockBinding | The KnockBinding whose bindings count. Leave it alone unless you take knocks from [a network of your own](../self-host/own-network.md). |

The defaults are the service's. The public RPCs are fine for trying Knock out, but rate-limited, and they're what the checks believe: [Its RPCs](verifier.md#its-rpcs) says why your own matter on a real site.

## Where it remembers

A verifier remembers four things between knocks: the challenges it gave out, the highest counter it has seen from each Wedgie, the keys it has seen revoked, and who has done each action. Every instance of your server has to reach the same store, or a challenge given by one instance won't be found by the next, and a knock could be replayed against another.

- **`libsqlStore(client)`** keeps them in a libSQL database: a SQLite file (`file:knock.db`), [Turso](https://turso.tech) (`libsql://…` with its token), or memory. It makes its four tables on first use, each named `knock_…`, so they can sit beside your own. On edge runtimes, make the client with `@libsql/client/web`.
- **`memoryStore()`** keeps them in the process. It's for tests, and for a site that's one long-lived process. Serverless functions don't share memory, so don't use it there.
- **Your own**: anything that implements [`Store`](../reference/verify.md#store). Its `commit()` must check and write the challenge, the counter and the entry in one transaction.

The tables mean what the service's do, and losing them costs the same: [Its database](verifier.md#its-database).

## Serverless and edge functions

- Use `libsqlStore` with Turso, or your own store over a database the functions share.
- Set `origin` from your configuration, never from the request's `Host` header: the origin is what the Wedgie signed for, and a proxy can change the header.
- A check makes three to five RPC calls. Allow your function at least ten seconds.
- Each instance keeps a name's records for a minute, as the service does. A new instance reads them again, which costs a call and nothing else.

## Writing what a knock uses up yourself

`verify()` keeps its own tables. If your site needs to write what a knock uses up in its own transaction, together with what the knock was for, use the checks on their own: `parse()` for V1, then `check()` for V3 to V7. The Human Club does this: a signature, the human and the Wedgie's counter go in one transaction, so a knock that's turned away writes nothing.

```ts title="own-records.ts"
import { type Memory, check, parse } from '@knock-dev/verify'

declare const memory: Memory
declare function takeChallenge(challenge: string): Promise<boolean>

export async function knocked(body: { assertion: unknown }) {
  const a = parse(body.assertion) // V1
  if (!(await takeChallenge(a.challenge))) throw new Error('not our challenge') // V2: yours, used once
  const k = await check({ origin: 'https://club.example', memory }, a) // V3–V7, writing nothing but a revoked key
  // Then, in one transaction: the counter, only if it rose (V5 again, for two knocks racing), your V8, your act
  return k
}
```

`memory` answers the counter for a key and remembers revoked keys. [`apps/bouncer/lib/club.ts`](https://github.com/getknock/knock/blob/main/apps/bouncer/lib/club.ts) is a whole example, with libSQL.

## The package, the service or the crate

All three run the same checks, held to the same test vectors.

- **`@knock-dev/verify`**, when your server runs JavaScript or TypeScript: nothing extra to run.
- **[`knock-verifier`](verifier.md)**, the Rust service, when your server is in another language: it answers over HTTP.
- **[`knock-verify`](../reference/knock-verify.md)**, the Rust crate, when your server is in Rust.

The package measures time in milliseconds, as JavaScript does; the service and the crate count seconds.
