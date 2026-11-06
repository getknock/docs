# Knock API, in brief

## Contents

- door-sdk: `knock()`, its options, the assertion, `KnockError`
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
  door?: string                 // default DOOR = 'http://localhost:3000'
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

Run: `VERIFIER_ORIGIN=… cargo run --release -p knock-verifier` from the root of a Knock checkout. For production, use RPCs you trust: the verifier believes them.

## Strict mode

By default a binding counts once its World Chain transaction is in a block. `VERIFIER_STRICT=on` waits until World Chain has posted that block to Ethereum, up to about 9 minutes after binding; `finalized` waits about 20 to 25 minutes. Until then, knocks fail check 6 as `binding_not_final`. Turn it on only when a knock pays out something that can't be taken back.

## knock-verify (Rust)

```toml
knock-verify = { git = "https://github.com/getknock/knock" } # private: needs git credentials
```

```rust
use knock_verify::{Store, Strict, Verifier, accepted_binding};

let verifier = Verifier::new(
    chain,                                         // impl knock_verify::Chain
    Store::open("knock.db")?,                      // ":memory:" for tests
    "https://club.example".to_string(),
    accepted_binding().map_err(anyhow::Error::msg)?,
    365 * 86_400,
)
.strict(Strict::Off);

let c = verifier.challenge(now)?;                                // Challenge { challenge, origin, expires_at }
let knocked = verifier.verify(&assertion_json, Some("enter"), now).await; // Result<Knocked, Refusal>
```

`Chain` has four async methods: `head()` (mainnet's latest block), `records(name, block)` (the five `knock.*` texts through ENS's Universal Resolver), `receipt(tx)` (a World Chain receipt), and `final_block(strict)` (World Chain's safe or finalized head; never called when not strict). Knock's `server/verifier/src/main.rs` implements it with alloy 2.5: copy its `Rpc`.
