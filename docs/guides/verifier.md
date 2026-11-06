---
title: Run a verifier
description: knock-verifier is the service that decides whether a knock gets in. Its settings, where to run it, and how your server asks it.
---

`knock-verifier` is a small Rust service you run beside your site. It gives out challenges and checks knocks for one origin, your site's, and keeps what it has seen in a SQLite file. It reads ENS on Ethereum mainnet and bindings on World Chain through RPCs, needs no keys, and never calls Knock.

If your server runs JavaScript or TypeScript, you don't need the service: [`@knock-dev/verify`](verify-in-your-server.md) runs the same checks inside your server.

## Install it

It's on [crates.io](https://crates.io/crates/knock-verifier):

```bash
cargo install knock-verifier
VERIFIER_ORIGIN=https://club.example knock-verifier
```

It's one binary, with SQLite built in. To build it from a checkout of `getknock/knock` instead, run `cargo build --release -p knock-verifier` at its root: the binary is `target/release/knock-verifier`.

## Settings

Everything is an environment variable, and only `VERIFIER_ORIGIN` usually needs setting.

| Variable | Default | What it is |
| --- | --- | --- |
| `VERIFIER_ORIGIN` | `http://localhost:3001` | Your site's origin, exactly as browsers send it: `https://host` or `https://host:port`, or `http://localhost` or `http://127.0.0.1`, with or without a port, for development. Knocks for any other origin fail check 2, and CORS allows only this one. |
| `VERIFIER_ADDR` | `127.0.0.1:8788` | Where it listens. |
| `VERIFIER_DB` | `knock-verifier.db` | Its SQLite file. |
| `VERIFIER_ETH_RPC` | `https://ethereum-rpc.publicnode.com` | An Ethereum mainnet RPC, for ENS. |
| `VERIFIER_WORLD_RPC` | `https://worldchain-mainnet.g.alchemy.com/public` | A World Chain RPC, for bindings. |
| `VERIFIER_MAX_BINDING_DAYS` | `365` | How old a binding's World ID proof may be, in days. Older bindings fail check 6 as `binding_expired`. |
| `VERIFIER_STRICT` | `off` | Whether a binding must be final on World Chain first: `off`, `on` (or `safe`), or `finalized`. [Strict mode](strict-mode.md) explains the choice. |
| `VERIFIER_KNOCK_BINDING` | `knock` | The KnockBinding whose bindings count: `knock` for Knock's, or the address of [a network of your own](../self-host/own-network.md)'s. |

The default origin is `http://localhost:3001`, for development, so set yours:

```bash
VERIFIER_ORIGIN=https://club.example \
VERIFIER_DB=/var/lib/knock/verifier.db \
VERIFIER_ETH_RPC=https://your-mainnet-rpc.example \
VERIFIER_WORLD_RPC=https://your-worldchain-rpc.example \
./target/release/knock-verifier
```

## What it checks before it starts

Before it takes a single knock, the verifier makes sure of where it reads from, and stops if anything is off:

- `VERIFIER_ORIGIN` is an origin it can check knocks for.
- `VERIFIER_ETH_RPC` is chain 1, Ethereum mainnet, and ENS's Universal Resolver is there.
- `VERIFIER_WORLD_RPC` is chain 480, World Chain, and the KnockBinding it accepts reports version 3.

The KnockBinding it accepts is Knock's production v3 on World Chain, `0x7748D2787DcB6E6024968edC19fcA13ccAbA1699`, built in from [`contracts/deployments/480.json`](https://github.com/getknock/knock/blob/main/contracts/deployments/480.json), unless `VERIFIER_KNOCK_BINDING` names [a network of your own](../self-host/own-network.md)'s. Bindings on any other KnockBinding, including staging's and older versions', never count.

## Verify from your server

Your page gets the knock, but your server should decide what it means. If the browser asks the verifier and then tells your server "they're in", your server is taking the browser's word for it. Instead, have the browser hand the knock to your server, and your server ask the verifier:

```text
browser -- the knock --> your server -- POST /verify --> verifier
browser <-- in, or why not -- your server <-- the answer --
```

Keep the verifier on `127.0.0.1`, where only your server can reach it, and give the browser two routes on your own origin. In Next.js:

```ts title="app/api/knock/challenge/route.ts"
const VERIFIER = process.env.KNOCK_VERIFIER ?? 'http://127.0.0.1:8788'

// A challenge for the page, passed through as it is
export async function POST() {
  const r = await fetch(`${VERIFIER}/challenge`, { method: 'POST' })
  return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json' } })
}
```

```ts title="app/api/knock/route.ts"
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

  // In: one human, bound on World Chain. Their nullifier is the same on every Knock site.
  const { name, nullifier } = v.knock
  await letIn({ human: nullifier, name }) // your session, vote, claim…
  return Response.json({ ok: true, name })
}
```

Check 2 compares the origin inside the knock, the one the Door saw, with `VERIFIER_ORIGIN`. Where the request to `/verify` comes from doesn't matter, so your server can make it.

### From the browser, for trying things out

A page can ask the verifier itself, because the verifier allows CORS from `VERIFIER_ORIGIN`. It's fine for a demo, or when nothing on your server depends on the answer. Then the verifier must be reachable from the browser, behind your TLS proxy, at an address such as `https://knock.club.example`.

## One verifier per origin

A verifier checks knocks for one origin, because the origin is part of what the Wedgie signs. Run one for each:

- `https://club.example` and `https://www.club.example` are two origins, so two verifiers, or one canonical host.
- Staging at `https://staging.club.example` gets its own verifier and its own database.
- For development, run one with `VERIFIER_ORIGIN=http://localhost:5173` or wherever your dev server is.

## Its database

The SQLite file at `VERIFIER_DB` holds four tables:

| Table | Holds | If you lose it |
| --- | --- | --- |
| `challenges` | Each challenge, its origin, when it was given out and whether it's been used. Expired ones are cleared as new ones are given out. | Knocks under way fail check 2. People knock again. |
| `counters` | The highest counter seen for each Wedgie's key. | No harm: old knocks still fail check 2, since their challenges are gone. |
| `revoked` | Keys it has seen revoked in ENS, which stay refused even if their records come back. | A revoked key could get in again if its owner turned it back on. |
| `entries` | For each action, the humans who've done it, with the name they knocked as and when. | Every human can do every action once more. |

Back it up if `entries` matter to you. It's one SQLite file, so one verifier process uses it at a time.

## Its RPCs

The default RPCs are free public endpoints. They're good for trying Knock out, but they limit how often you can call them, and the verifier makes several calls for each knock: the mainnet head, the name's five Knock records at the latest block and again 3 blocks deep (unless it read the same ones in the last minute), and the binding's receipt on World Chain. For a real site, use your own endpoints or a paid provider.

Your RPCs are also what the verifier believes. An RPC that lies could show records or a binding that aren't on chain. Use providers you trust, or your own nodes. The verifier never logs an RPC's URL, since URLs often carry keys.

When an RPC can't be reached, the verifier refuses the knock as `unavailable`, with status 503. It never lets a knock in on a guess.

## Limits

| Limit | Value | When it's hit |
| --- | --- | --- |
| Request body | 16 KiB | Refused at check 1, status 400. A knock is under 1 KiB. |
| Challenges | 600 an hour, per process | `busy`, status 429 |
| Checks | 600 an hour, per process | `busy`, status 429 |
| Challenges outstanding | 10,000 at once | `busy` at check 2, status 429 |

## Health and logs

`GET /health` says what the verifier checks for:

```json
{
  "binding": "0x7748d2787dcb6e6024968edc19fca13ccaba1699",
  "maxBindingDays": 365,
  "ok": true,
  "origin": "https://club.example",
  "strict": "off"
}
```

It logs each answer, who got in or which check said no, and nothing about who asked:

```text
INFO let in wedgie.itzraj.eth (counter 12)
INFO refused at V8: already_entered
```

## In your own Rust server

`knock-verifier` is a thin HTTP layer over the [`knock-verify`](../reference/knock-verify.md) crate. If your server is in Rust, you can call the checks directly and skip the extra service.
