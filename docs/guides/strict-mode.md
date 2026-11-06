---
title: Strict mode
description: Whether a binding must be final on World Chain before its knocks count. Off by default; what it costs to turn on, and when it's worth it.
---

A knock stands on its Wedgie's binding: a transaction on World Chain. By default, a verifier counts the binding as soon as that transaction is in a block. A **strict** verifier waits until World Chain has posted the block to Ethereum, or until that post is final there. Strict mode only affects people who knock within minutes of binding their Wedgie. After that, every binding is final anyway.

## How World Chain settles a block

World Chain is an OP Stack chain:

1. **In a block.** Its sequencer puts the binding in a block within a few seconds: World Chain makes one every 2 seconds. This is its latest head.
2. **Safe.** Its batcher posts the block's data to Ethereum. Once that post is in an Ethereum block, the block is at or below World Chain's safe head. The batcher posts every few minutes.
3. **Finalized.** Once the Ethereum block holding that post is finalized, about two epochs or 13 minutes later, the World Chain block is at or below the finalized head.

Measured on 2026-11-06: World Chain's batcher posted to Ethereum 40 times in four hours, every 4.6 to 7.4 minutes, 6.2 minutes apart in the middle. Between posts the safe head stands still, so it falls up to 8.5 minutes behind the latest block before it jumps. One binding mined at 05:14:39 UTC became safe at 05:21:12, 6.5 minutes later. The finalized head runs about 20 to 25 minutes behind.

## The three settings

| `VERIFIER_STRICT` | A binding counts once | Someone who just bound waits |
| --- | --- | --- |
| `off` (default) | Its transaction is in a block | Nothing |
| `on`, or `safe` | World Chain has posted its block to Ethereum | Up to ~9 minutes, ~6 typically |
| `finalized` | That post is final on Ethereum | About 20 to 25 minutes |

`on`, `true`, `1`, `yes` and `safe` all mean safe. `off`, `false`, `0`, `no` and an empty value all mean off. Anything else stops the verifier at start. `GET /health` reports the setting as `off`, `safe` or `finalized`.

## What a strict verifier says

A knock whose binding isn't final yet fails check 6, as `binding_not_final`, with the wait in words:

| Setting | `why` |
| --- | --- |
| Safe | this site is strict: it takes a binding once World Chain has posted it to Ethereum, which it does every ~6 minutes. Try again in a few minutes |
| Finalized | this site is strict: it takes a binding once World Chain's post of it to Ethereum is final, ~20–25 minutes after binding. Try again later |

Nothing is used up, so the same person can knock again a few minutes later and get in. Show them the `why`.

## What a verifier that isn't strict risks

The risk is a binding that World Chain drops, or replaces, before its batch reaches Ethereum. A human could then knock on a binding that, in the end, never happened. For that to happen, World Chain's sequencer would have to misbehave, or its batches would have to stop reaching Ethereum for hours. Even then, the knock is still signed by the Wedgie after a press, and its name is still checked in ENS. Only the World ID proof behind the binding would be in doubt.

## Which to choose

- **Off**, for most sites. People can knock as soon as they've set up their Wedgie, and the risk above is remote.
- **Safe**, when a knock is worth something that can't be taken back, such as a payout or a one-time claim, and a few minutes' wait for new Wedgies is fine.
- **Finalized**, rarely: when you want only what Ethereum itself has settled, and a new Wedgie can wait half an hour.

## Setting it

For `knock-verifier`:

```bash
VERIFIER_STRICT=on ./target/release/knock-verifier
```

With the `knock-verify` crate:

```rust
use knock_verify::{Strict, Verifier};

let verifier = Verifier::new(chain, store, origin, contract, 365 * 86_400).strict(Strict::Safe);
```

A verifier that isn't strict never asks World Chain for its safe or finalized head, so it makes one call fewer for each knock.
