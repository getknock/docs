---
title: Verifier HTTP API
description: knock-verifier's three routes, their requests and answers, status codes, CORS and limits.
---

`knock-verifier` listens on `VERIFIER_ADDR`, `127.0.0.1:8788` by default, and takes JSON. Every refusal has the same shape, whichever route gives it.

## POST /challenge

A challenge for one knock: 32 random bytes, for the verifier's origin, good once, for 120 seconds. It takes no body.

```bash
curl -s -X POST http://127.0.0.1:8788/challenge
```

```json
{
  "challenge": "0x6c1f…e2a9",
  "origin": "https://club.example",
  "expiresAt": 1793860320
}
```

| Field | What it is |
| --- | --- |
| `challenge` | 32 bytes in hex. Pass it to `knock()` as it is. |
| `origin` | The origin knocks must be for: `VERIFIER_ORIGIN`. |
| `expiresAt` | When it expires, in unix seconds. |

It can refuse with `busy` and status 429, at check 0 when the hour's limit is reached, or at check 2 when 10,000 challenges are outstanding.

## POST /verify

Checks a knock, V1 to V8 in order, and if all pass, uses up what it used in one transaction.

```json title="Request"
{
  "assertion": {
    "v": 1,
    "name": "wedgie.itzraj.eth",
    "challenge": "0x6c1f…e2a9",
    "origin": "https://club.example",
    "deviceNode": "0x…",
    "counter": 12,
    "mode": 1,
    "nullifier": "0x…",
    "humanRef": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "r": "0x…",
    "s": "0x…"
  },
  "action": "enter"
}
```

| Field | What it is |
| --- | --- |
| `assertion` | The knock from `knock()`, as it is. Unknown fields are refused. |
| `action` | Optional. Lets each human do this once: 1 to 32 characters of `a`–`z`, `0`–`9` and `-`. [One human, once](../guides/one-human-once.md). |

The body may have no other fields.

### When it passes

Status 200:

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

| Field | What it is |
| --- | --- |
| `name` | The ENS name it knocked as. |
| `key` | The Wedgie's public key, from ENS: compressed P-256, 33 bytes in hex. |
| `nullifier` | The human's nullifier, the same on every Knock site. Key your records by it. |
| `counter` | The Wedgie's counter for this knock. |
| `origin` | Your origin. |
| `binding.tx` | The binding's World Chain transaction, from `knock.poh`. |
| `binding.block` | The World Chain block it's in. |
| `binding.provedAt` | About when its World ID proof was made, in unix seconds. Bindings older than `VERIFIER_MAX_BINDING_DAYS` are refused. |

### When it's refused

```json
{
  "ok": false,
  "check": 3,
  "error": "revoked",
  "why": "wedgie.itzraj.eth is revoked: its owner turned it off"
}
```

| Field | What it is |
| --- | --- |
| `check` | The check that said no, 1 to 8, or 0 for the verifier's own trouble. Every check before it passed, and none after it ran. |
| `error` | A code your code can act on. [Checks and refusals](checks.md) lists them all. |
| `why` | The reason in words, for people. |

A refused knock uses up nothing: its challenge, the counter and the entry are all as they were.

## GET /health

What the verifier checks knocks for.

```json
{
  "binding": "0x7748d2787dcb6e6024968edc19fca13ccaba1699",
  "maxBindingDays": 365,
  "ok": true,
  "origin": "https://club.example",
  "strict": "off"
}
```

| Field | What it is |
| --- | --- |
| `binding` | The KnockBinding whose bindings count: Knock's v3, production, on World Chain, or the one `VERIFIER_KNOCK_BINDING` names. |
| `maxBindingDays` | `VERIFIER_MAX_BINDING_DAYS`. |
| `origin` | `VERIFIER_ORIGIN`. |
| `strict` | `off`, `safe` or `finalized`. [Strict mode](../guides/strict-mode.md). |

## Status codes

| Status | When |
| --- | --- |
| 200 | A challenge, a knock that passed, or health. |
| 400 | Check 1: the body or the knock isn't well formed. |
| 403 | Checks 2 to 8 said no. |
| 429 | `busy`: the verifier's limits. Try again later. |
| 500 | `internal`: the verifier's own store failed. |
| 503 | `unavailable`: a chain couldn't be read. Try again. |

## CORS

The verifier allows exactly one origin, `VERIFIER_ORIGIN`, with `GET`, `POST` and the `content-type` header. Browsers on any other origin can't read its answers. Requests from your server aren't affected, since CORS is between browsers and sites.

## Limits

| Limit | Value |
| --- | --- |
| Body | 16 KiB |
| `POST /challenge` | 600 an hour, per process |
| `POST /verify` | 600 an hour, per process |
| Outstanding challenges | 10,000 |
| A challenge's life | 120 seconds, single use |

## TypeScript types

```ts title="verifier.ts"
export type Challenge = { challenge: `0x${string}`; origin: string; expiresAt: number }

export type Knocked = {
  name: string
  key: `0x${string}`
  nullifier: `0x${string}`
  counter: number
  origin: string
  binding: { tx: `0x${string}`; block: number; provedAt: number }
}

export type Verdict = { ok: true; knock: Knocked } | { ok: false; check: number; error: string; why: string }
```
