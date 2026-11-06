---
title: "@knock-dev/verify"
description: Every export of the verifier package, the eight checks for a site's own server, and what each takes and gives back.
---

`@knock-dev/verify` is one TypeScript file, [`packages/verify/src/index.ts`](https://github.com/getknock/knock/blob/main/packages/verify/src/index.ts), with two dependencies: `@knock-dev/protocol` and `viem`. [Check knocks in your server](../guides/verify-in-your-server.md) shows it in use. Times are in milliseconds unless a name says otherwise.

## Verifier

```ts
new Verifier(site: Site & { store: Store })
```

A verifier for one origin. It throws if `origin` isn't one browsers write.

- **`challenge(now?)`** gives out a challenge and keeps it in the store: `Promise<Challenge>`. It refuses with `busy` at check 2 when 10,000 are outstanding.
- **`verify(assertion, { action?, now? })`** runs V1 to V8 on what door-sdk's `knock()` resolved with, then commits what the knock used up: its challenge, its Wedgie's counter, and, with an `action`, the human's entry for it. All of it is written, or none. It resolves with `Knocked`, or rejects with a `Refusal`.
- **`site`** is the options it was made with.

### Site

What the checks need to know about your site. `Verifier` takes it with a `store`, and `check()` with a `memory`.

| Field | Default | |
| --- | --- | --- |
| `origin` | none | Your site's origin: `https://host[:port]`, or `http://localhost[:port]` or `http://127.0.0.1[:port]` for development. |
| `chain` | `rpcChain()`, public RPCs | A `Chain`. |
| `contract` | `KNOCK_BINDING` | The KnockBinding whose `Bound` logs count. |
| `maxBindingDays` | `MAX_BINDING_DAYS`, 365 | How old a binding's proof may be. |
| `strict` | `'off'` | A `Strict`: how final a binding must be. |

### Challenge

`{ challenge, origin, expiresAt }`: the challenge for door-sdk's `knock()`, as `0x` and 64 hex digits, your origin, and when it expires.

### Knocked

A knock that got in:

| Field | |
| --- | --- |
| `name` | The Wedgie's ENS name. |
| `key` | Its compressed P-256 key, as `knock.key` holds it, in lowercase. |
| `keyHash` | `keccak256(x ‖ y)` of that key, as `Bound` names it. |
| `nullifier` | The human: a 32-byte word in lowercase hex, the same on every site that takes Knock. |
| `counter` | The Wedgie's counter in this knock. |
| `origin` | Your origin. |
| `binding` | A `Binding`: `{ tx, block, provedAt }`, the World Chain transaction and block, and about when its World ID proof was made, in unix seconds. |

## Refusal

```ts
class Refusal extends Error { check: number; error: string; why: string; status: number }
```

A no: the check that said it, 1 to 8 (0 for the verifier's own trouble), its code, and why, in words a person can read. Its codes and words are the service's: [Checks and refusals](checks.md) lists them. `toJSON()` gives `{ ok: false, check, error, why }`, and `status` the HTTP status `knock-verifier` answers with: 400 for check 1, 403 for checks 2 to 8, 429 for `busy`, 503 for `unavailable`, 500 for check 0.

## The checks

- **`parse(x)`**, V1: `x` as an `Assertion`, whole and well formed, its `s` low. Anything else is refused at check 1 with `bad_assertion`.
- **`check(site, assertion, now?)`**, V3 to V7, for a knock that passed V1 and whose challenge you've checked yourself. It needs `site.memory`, a `Memory`, and writes nothing but a key seen revoked. Store the counter and anything V8 asks in your own transaction. It resolves with `Knocked`.
- **`checkRecords(name, deep, latest)`**, V3: the name's `Records` at the latest block and 3 blocks deep. It gives back a `Valid`: `{ key, keyHash, nullifier, poh }`.
- **`checkBinding(receipt, wanted)`**, V6: a `Receipt` and what's `Wanted` of it, `{ tx, contract, nullifier, keyHash, node, final?, now, maxAge }`, with `now` in unix seconds and `maxAge` in seconds. It gives back a `Binding`.
- **`okName(name)`** and **`okOrigin(origin)`**: whether Knock takes this name and this origin.
- **`parseKey(text)`**: a `knock.key` record as `{ key, keyHash }`, or `null` if it isn't a compressed P-256 key.

### Assertion

What door-sdk's `knock()` resolves with: `{ v, name, challenge, origin, deviceNode, counter, mode, nullifier, humanRef, r, s }`. [The protocol](protocol.md#knockpass) says what each field is.

### Strict

`'off' | 'safe' | 'finalized'`. **`strictFrom(text)`** reads it as people write it: `off` (or nothing, `false`, `0`, `no`), `on` (`true`, `1`, `yes`, `safe`) or `finalized`. Anything else throws.

## Chain

Where the checks read the chains:

```ts
interface Chain {
  head(): Promise<bigint>                                    // mainnet's latest block
  records(name: string, block: bigint): Promise<Records>     // the name's Knock records at a block
  receipt(tx: Hex): Promise<Receipt | null>                  // a World Chain receipt
  finalBlock(strict: 'safe' | 'finalized'): Promise<number>  // World Chain's safe or finalized head
}
```

**`rpcChain({ eth?, world? })`** makes one over JSON-RPC with viem. Give each an RPC URL or a viem client, a mainnet one made with `chain: mainnet`. Left out, they're `ETH_RPC` and `WORLD_RPC`, public endpoints. ENS is read through its Universal Resolver, at the block asked for.

- **`Records`**: `{ v, key, status, nullifier, poh }`, the five `knock.*` text records, each `null` when empty. **`recordsOf(texts)`** makes one from the texts in `RECORDS`' order.
- **`Receipt`**: `{ ok, block, logs }`, where each log is `{ address, topics, data }`.

A chain that throws is a chain that couldn't be read: the knock is refused as `unavailable`, and the error's URLs are left out of `why`.

## Store

What a verifier remembers between knocks. Every instance of your server must reach the same one.

```ts
interface Store extends Memory {
  issue(challenge: Hex, origin: string, now: number): Promise<boolean>   // false: too many out
  challenge(challenge: Hex): Promise<Issued | null>                     // { origin, issuedAt, used }
  entered(action: string, nullifier: Hex): Promise<boolean>
  commit(c: Commit): Promise<'challenge' | 'counter' | 'entry' | null>
}
```

**`commit()`** takes a `Commit`, `{ challenge, origin, key, counter, entry, now }`, where `entry` is `{ action, nullifier, name }` or `null`. In one transaction it marks the challenge used (if it's this origin's, unused and unexpired), raises the key's counter (only upward), and makes the entry (if it's new). Each is checked again as it's written, so of two knocks racing for one challenge, counter or entry, one gets it. It answers with what the other lost, or `null`, and writes nothing when it loses.

### Memory

What `check()` needs from a store:

```ts
interface Memory {
  counter(key: Hex): Promise<number | null>  // the key's highest counter taken
  revoke(key: Hex, now: number): Promise<void>
  isRevoked(key: Hex): Promise<boolean>      // a key seen revoked stays revoked
}
```

### The stores here

- **`memoryStore()`**: in the process, for tests and a site that's one long-lived process.
- **`libsqlStore(client)`**: in a libSQL database, from `@libsql/client` (or `@libsql/client/web` on edge runtimes): a SQLite file, Turso, or memory. Any client with `execute`, `executeMultiple` and `transaction('write')` will do: that's `SqlClient`. It runs `SCHEMA` on first use: four tables, `knock_challenges`, `knock_counters`, `knock_revoked` and `knock_entries`.

## Constants

| Constant | Value | |
| --- | --- | --- |
| `WORLD_CHAIN` | `480` | World Chain's chain id. |
| `CHALLENGE_MS` | `120_000` | How long a challenge lasts. |
| `DEPTH` | `3n` | How many blocks deep `knock.status=active` must be. |
| `CACHE_MS` | `60_000` | How long a name's deep records are kept. |
| `MAX_BINDING_DAYS` | `365` | The oldest binding that counts, by default. |
| `RECORDS` | | `knock.v`, `knock.key`, `knock.status`, `knock.nullifier`, `knock.poh`. |
| `KNOCK_BINDING` | `0x7748D2787DcB6E6024968edC19fcA13ccAbA1699` | KnockBinding v3, production, on World Chain. |
| `ETH_RPC` | `https://ethereum-rpc.publicnode.com` | The public mainnet RPC used by default. |
| `WORLD_RPC` | `https://worldchain-mainnet.g.alchemy.com/public` | The public World Chain RPC used by default. |
