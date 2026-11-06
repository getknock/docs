---
title: Checks and refusals
description: The eight checks a verifier runs, in order, and every refusal each can give, with its status code and what to tell the person knocking.
---

A verifier runs eight checks, in order, and the first one that fails gives the answer. Every check before it passed, and none after it ran. A refused knock uses up nothing: its challenge, the Wedgie's counter and the entry stay as they were.

Each refusal has a `check`, an `error` code for your code, and a `why` for people. The `why`s below are exact, with the parts that vary in angle brackets.

## Check 1: well formed

The knock is whole and well formed, before anything is read from a chain.

| `error` | ``why`` | Means |
| --- | --- | --- |
| `bad_assertion` | `not a knock: <details>` | Missing or extra fields, or wrong types. |
| `bad_assertion` | `version <v>: this verifier reads 1` | A format this verifier doesn't read. |
| `bad_assertion` | `name: a-z, 0-9 and "-", with dots between` | Not a name a Wedgie can have. |
| `bad_assertion` | `deviceNode isn't the name's namehash` | The name and its node don't match. |
| `bad_assertion` | `origin: https://host[:port], or http://localhost` | Not an origin a Wedgie knocks for. |
| `bad_assertion` | `counter: from 1 up` | A counter of 0, or too large. |
| `bad_assertion` | `mode: 1 (Bound) or 2 (Fresh)` | No such mode. |
| `bad_assertion` | `signature: r and s, s low` | A zero, or a high `s`: every Wedgie signs with a low `s`. |
| `bad_assertion` | `the body is {assertion, action?}` | `knock-verifier` only: the request body isn't that, or is over 16 KiB. |
| `bad_assertion` | `action: a-z, 0-9 and "-", up to 32` | `knock-verifier` only: not an action name. |

Status 400. These come from your code, or from someone sending made-up knocks, never from a Wedgie and the Door. Log them, and show "Something went wrong. Try again."

## Check 2: for this site, just now

The challenge is one this verifier gave out, unused, under 120 seconds old, and for its origin. The knock is for its origin too.

| `error` | ``why`` | Means |
| --- | --- | --- |
| `bad_challenge` | `not a challenge this verifier gave out` | Made up, from another verifier, or the verifier's database was replaced. |
| `bad_challenge` | `that challenge was used already` | A knock with this challenge already got in. |
| `bad_challenge` | `that challenge expired: knock again` | More than 2 minutes passed between the challenge and the check. |
| `bad_challenge` | `that challenge was used or expired meanwhile` | Two checks of the same knock at once, and the other one won. |
| `wrong_origin` | `the knock is for <origin>, not <ours>` | The page that knocked isn't at `VERIFIER_ORIGIN`. |
| `wrong_origin` | `a challenge for another origin` | The challenge came from a verifier for another origin, sharing this database. |
| `busy` | `too many challenges out at once: try again in a minute` | From `POST /challenge`: 10,000 challenges are outstanding. Status 429. |

Status 403, except `busy`. Tell people to knock again. If it's `wrong_origin`, check `VERIFIER_ORIGIN` against the address bar, port included: `localhost` and `127.0.0.1` are different origins.

## Check 3: named, and switched on

The name has Knock's records in ENS on mainnet, with `knock.status` set to `active`, and they're the same 3 blocks deep as at the latest block. A revoke counts at the latest block.

| `error` | ``why`` | Means |
| --- | --- | --- |
| `no_name` | `<name> has no Knock records in ENS: never named, or killed` | No records, or the name expired. |
| `revoked` | `<name> is revoked: its owner turned it off` | `knock.status` is `revoked`. |
| `revoked` | `this Wedgie's key was seen revoked, and stays revoked` | This verifier saw the key revoked before. Turning it back on doesn't help here. |
| `not_knock` | `<name> isn't a Knock name (knock.v isn't 1)` | The name has records, but not Knock's. |
| `records_changing` | `<name>'s Knock records changed in the last few blocks: try again in a minute` | The name was set up or changed less than about 36 seconds ago. |
| `not_active` | `<name>'s knock.status isn't active` | Any status but `active` or `revoked`. |
| `bad_records` | `<name>'s knock.key isn't a compressed P-256 key` | |
| `bad_records` | `<name>'s knock.nullifier isn't a word` | Not `0x` and 64 hex digits. |
| `bad_records` | `<name>'s knock.poh isn't eip155:480:tx:<hash>` | |
| `unavailable` | `couldn't read the chain, try again: mainnet: <error>` | The mainnet RPC failed. Status 503. |

Status 403, except `unavailable`. Show the `why`: it names the name, and says what its owner can do.

## Check 4: signed by its Wedgie

The Wedgie whose key is in `knock.key` signed this knock, for this verifier's origin, this challenge and this name. The verifier makes the digest from its own origin and the knock's fields, so a knock signed for another site fails here even if its `origin` field was changed.

| `error` | ``why`` | Means |
| --- | --- | --- |
| `bad_signature` | `not signed by <name>'s key, for this site and challenge` | Made up, changed on the way, or signed by another key. |

Status 403. A real Wedgie and the Door never give this, since the Door checks the signature before it sends a knock. Treat it as an attempt, and show "This knock didn't come from that Wedgie."

## Check 5: not seen before

The Wedgie's counter is higher than in any knock of this key's that this verifier has let in.

| `error` | ``why`` | Means |
| --- | --- | --- |
| `replayed` | `the Wedgie's counter didn't rise: a knock seen before` | A knock sent again, or an older one. |

Status 403. Tell people to knock again: a new knock has a higher counter.

## Check 6: one human, bound

The knock's human is the name's, and the binding `knock.poh` names is a successful transaction on KnockBinding v3, production, with a `Bound` log for this key, this human and this name. Its World ID proof is no older than `VERIFIER_MAX_BINDING_DAYS`, and for a strict verifier, its block is final enough.

| `error` | ``why`` | Means |
| --- | --- | --- |
| `bad_assertion` | `humanRef: zero in mode 1` | A mode 1 knock with a `humanRef` that isn't zero. |
| `wrong_human` | `the knock's human isn't <name>'s` | The knock's nullifier isn't the one in `knock.nullifier`. |
| `no_binding` | `World Chain has no transaction <tx>` | `knock.poh` names a transaction World Chain doesn't have. |
| `no_binding` | `the binding's transaction <tx> failed` | It reverted. |
| `no_binding` | `transaction <tx> holds no Bound from Knock's KnockBinding for this key, human and name` | Another contract, an older KnockBinding, staging's, or a binding for another key, human or name. |
| `binding_not_final` | `this site is strict: it takes a binding once World Chain has posted it to Ethereum, which it does every ~6 minutes. Try again in a few minutes` | Strict, safe: the binding is newer than World Chain's safe head. |
| `binding_not_final` | `this site is strict: it takes a binding once World Chain's post of it to Ethereum is final, ~20–25 minutes after binding. Try again later` | Strict, finalized. |
| `binding_expired` | `the binding is more than <days> days old: bind the Wedgie again` | Its World ID proof is older than the verifier allows. |
| `unavailable` | `couldn't read the chain, try again: World Chain: <error>` | The World Chain RPC failed. Status 503. |

Status 403, except `unavailable`. For `binding_not_final` and `binding_expired`, show the `why`. For the others, the Wedgie's owner should set it up again in the Knock Console.

## Check 7: a mode it offers

| `error` | ``why`` | Means |
| --- | --- | --- |
| `mode_unsupported` | `Fresh (mode 2) isn't offered yet` | A mode 2 knock. |

Status 403. Check 7 runs just before check 6, so a mode 2 knock gets this answer whatever its binding.

## Check 8: first time

Only when the request names an `action`: this human hasn't done it here before.

| `error` | ``why`` | Means |
| --- | --- | --- |
| `already_entered` | `this human has done <action> here already` | The human's nullifier is in this action's entries, from any of their Wedgies. |

Status 403. Tell them they've already done it. [One human, once](../guides/one-human-once.md) covers actions.

## The verifier's own trouble

| `check` | `error` | `why` | Status |
| --- | --- | --- | --- |
| 0 | `busy` | `the verifier's limit for now: try again later` | 429 |
| 0 | `internal` | `the verifier's store: <error>` | 500 |

`busy` comes from the verifier's hourly limits, 600 challenges and 600 checks per process. `internal` means its SQLite store failed. Neither says anything about the knock.

## Every code

| `error` | Checks | Status |
| --- | --- | --- |
| `bad_assertion` | 1, 6 | 400 at check 1, 403 at check 6 |
| `bad_challenge` | 2 | 403 |
| `wrong_origin` | 2 | 403 |
| `busy` | 0, 2 | 429 |
| `no_name` | 3 | 403 |
| `revoked` | 3 | 403 |
| `not_knock` | 3 | 403 |
| `records_changing` | 3 | 403 |
| `not_active` | 3 | 403 |
| `bad_records` | 3 | 403 |
| `bad_signature` | 4 | 403 |
| `replayed` | 5 | 403 |
| `wrong_human` | 6 | 403 |
| `no_binding` | 6 | 403 |
| `binding_not_final` | 6 | 403 |
| `binding_expired` | 6 | 403 |
| `mode_unsupported` | 7 | 403 |
| `already_entered` | 8 | 403 |
| `unavailable` | 3, 6 | 503 |
| `internal` | 0 | 500 |
