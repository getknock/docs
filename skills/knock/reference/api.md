# Knock API, in brief

## Contents

- door-sdk: `knock()`, its options, the assertion, `KnockError`
- @knock-dev/verify (TypeScript): `Verifier`, `Refusal`, stores, `check()`
- The verifier's HTTP API: `POST /challenge`, `POST /verify`, `GET /health`
- The verifier's settings
- Strict mode
- knock-verify (Rust)

## door-sdk

```ts
import { DOOR, type Assertion, type Hex, KnockError, type KnockOptions, knock } from '@knock-dev/door-sdk'

function knock(o: KnockOptions): Promise<Assertion>

type KnockOptions = {
  challenge: Hex | Promise<Hex> // the verifier's challenge, or a promise of it
  mode?: 1                      // Bound; mode 2 isn't offered
  door?: string                 // default DOOR = 'https://door.getknock.dev'
  timeoutMs?: number            // default 180_000, presses included
}

type Assertion = {
  v: 1
  name: string        // ENS name, e.g. wedgie.itzraj.eth
  challenge: Hex
  origin: string      // the page's origin, as the Door read it from the browser
  deviceNode: Hex     // namehash(name)
  counter: number     // rises with every knock, on any site
  mode: 1
  nullifier: Hex      // the human
  humanRef: Hex       // 32 zero bytes in mode 1
  r: Hex
  s: Hex              // P-256, low s
}

class KnockError extends Error {
  readonly code: string // see refusals.md; message is for people
}

type Hex = `0x${string}`
```

`knock()` opens `<door>/knock` as a popup named `knock-door` (420 by 680), waits for the Door's `knock/ready` and the challenge, checks the challenge is `0x` and 64 hex digits, posts `{ type: 'knock/request', challenge, mode }` to the Door's origin only, and settles on the Door's `knock/result`. It listens only to the popup it opened, at the Door's origin.

## @knock-dev/verify (TypeScript)

The eight checks inside a JavaScript server: Node 20 or later, Bun, Deno, serverless and edge functions. Never in the browser. One file, `packages/verify/src/index.ts`, needing `@knock-dev/protocol` and `viem`.

```ts
import { Refusal, Verifier, check, libsqlStore, memoryStore, parse, rpcChain, strictFrom } from '@knock-dev/verify'

new Verifier({
  origin: string,                         // the page's origin, exactly
  store: Store,                           // libsqlStore(client): @libsql/client, file: or libsql:// (Turso); memoryStore() for tests
  chain?: Chain,                          // rpcChain({ eth, world }): RPC URLs or viem clients; public RPCs by default
  maxBindingDays?: number,                // 365
  strict?: 'off' | 'safe' | 'finalized',  // strictFrom(text) reads on, true, finalized…
  contract?: Hex,                         // a network of one's own's KnockBinding; Knock's by default
})

verifier.challenge(): Promise<{ challenge: Hex; origin: string; expiresAt: number }>  // ms
verifier.verify(assertion: unknown, o?: { action?: string }): Promise<Knocked>        // or rejects with a Refusal
function check(site: Site, a: Assertion, now?: number): Promise<Knocked>  // V3 to V7 with site.memory, for a site's own records
```

- `Knocked`: `{ name, key, keyHash, nullifier, counter, origin, binding: { tx, block, provedAt } }`, `provedAt` in unix seconds.
- `Refusal`: `{ check, error, why, status }`, with the service's codes and words. `Response.json(e, { status: e.status })` answers as the service does.
- `verify()` writes what a knock used up (its challenge, the Wedgie's counter, the action's entry) in one transaction, all or none.
- Every instance of the server must share the store. On serverless, use `libsqlStore` with Turso, never `memoryStore()`.

## The verifier's HTTP API

`knock-verifier` listens on `VERIFIER_ADDR`, `127.0.0.1:8788` by default.

### POST /challenge

No body. Answers:

```json
{ "challenge": "0x…64 hex…", "origin": "https://club.example", "expiresAt": 1793860320 }
```

`expiresAt` is unix seconds, 120 after now. Refuses with `busy` (429) at its limits.

### POST /verify

```json
{ "assertion": { "…": "exactly as knock() resolved" }, "action": "enter" }
```

`action` is optional: 1 to 32 characters of `a-z`, `0-9` and `-`. With it, each human passes once per action. No other fields are allowed, in the body or the assertion.

Passed, status 200:

```json
{
  "ok": true,
  "knock": {
    "name": "wedgie.itzraj.eth",
    "key": "0x02…",
    "nullifier": "0x…",
    "counter": 12,
    "origin": "https://club.example",
    "binding": { "tx": "0x…", "block": 37301500, "provedAt": 1793860000 }
  }
}
```

Refused:

```json
{ "ok": false, "check": 3, "error": "revoked", "why": "wedgie.itzraj.eth is revoked: its owner turned it off" }
```

| Status | When |
| --- | --- |
| 400 | Check 1: the body or the assertion isn't well formed |
| 403 | Checks 2 to 8 said no |
| 429 | `busy` |
| 500 | `internal` |
| 503 | `unavailable`: a chain couldn't be read |

A refused knock uses up nothing.

### GET /health

```json
{ "binding": "0x7748d2787dcb6e6024968edc19fca13ccaba1699", "maxBindingDays": 365, "ok": true, "origin": "https://club.example", "strict": "off" }
```

### CORS and limits

CORS allows only `VERIFIER_ORIGIN`, for `GET` and `POST` with `content-type`. Server-to-server calls aren't affected. Body up to 16 KiB; 600 challenges and 600 checks an hour per process; at most 10,000 challenges outstanding.

## The verifier's settings

| Variable | Default | |
| --- | --- | --- |
| `VERIFIER_ORIGIN` | `http://localhost:3001` | The page's origin, exactly |
| `VERIFIER_ADDR` | `127.0.0.1:8788` | Where it listens |
| `VERIFIER_DB` | `knock-verifier.db` | SQLite: challenges, counters, revoked keys, entries. Back it up if entries matter. |
| `VERIFIER_ETH_RPC` | `https://ethereum-rpc.publicnode.com` | Ethereum mainnet, for ENS |
| `VERIFIER_WORLD_RPC` | `https://worldchain-mainnet.g.alchemy.com/public` | World Chain, for bindings |
| `VERIFIER_MAX_BINDING_DAYS` | `365` | Oldest binding it takes |
| `VERIFIER_STRICT` | `off` | `off`, `on` (same as `safe`), or `finalized` |
| `VERIFIER_KNOCK_BINDING` | `knock` | Knock's KnockBinding, or the address of a network of one's own's |

Run: `cargo install knock-verifier`, then `VERIFIER_ORIGIN=… knock-verifier`. For production, use RPCs you trust: the verifier believes them.

## Strict mode

By default a binding counts once its World Chain transaction is in a block. `VERIFIER_STRICT=on` waits until World Chain has posted that block to Ethereum, up to about 9 minutes after binding; `finalized` waits about 20 to 25 minutes. Until then, knocks fail check 6 as `binding_not_final`. Turn it on only when a knock pays out something that can't be taken back.

## knock-verify (Rust)

```toml
knock-verify = "0.1"
```

```rust
use knock_verify::{Store, Strict, Verifier, accepted_binding};

let verifier = Verifier::new(
    chain,                                         // impl knock_verify::Chain
    Store::open("knock.db")?,                      // ":memory:" for tests
    "https://club.example".to_string(),
    accepted_binding(),                            // KnockBinding v3, production
    365 * 86_400,
)
.strict(Strict::Off);

let c = verifier.challenge(now)?;                                // Challenge { challenge, origin, expires_at }
let knocked = verifier.verify(&assertion_json, Some("enter"), now).await; // Result<Knocked, Refusal>
```

`Chain` has four async methods: `head()` (mainnet's latest block), `records(name, block)` (the five `knock.*` texts through ENS's Universal Resolver), `receipt(tx)` (a World Chain receipt), and `final_block(strict)` (World Chain's safe or finalized head; never called when not strict). Knock's `server/verifier/src/main.rs` implements it with alloy 2.5: copy its `Rpc`.
