---
title: knock-verify (Rust)
description: The verifier's checks as a Rust library, for a server that checks knocks itself. Verifier, the Chain trait, Store, and every public item.
---

`knock-verify` is what `knock-verifier` runs: V1 to V8 in order, failing closed, and a SQLite store for what's been used. Use it when your server is in Rust and you'd rather not run a second service. Its source is [`crates/knock-verify/src/lib.rs`](https://github.com/getknock/knock/blob/main/crates/knock-verify/src/lib.rs).

## Add it

It isn't on crates.io, so depend on the repo:

```toml title="Cargo.toml"
[dependencies]
knock-verify = { git = "https://github.com/getknock/knock" }
alloy = { version = "2.5", default-features = false, features = ["std"] }
```

Its types are alloy's (`Address`, `B256`, `U256`), so use the same alloy, 2.5. Its Rust is edition 2024: Rust 1.88 or later.

## Use it

```rust title="src/knock.rs"
use knock_verify::{Store, Strict, Verifier, accepted_binding};

fn now() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
}

pub async fn example(chain: MyChain, assertion: serde_json::Value) -> anyhow::Result<()> {
    let verifier = Verifier::new(
        chain,                                     // your Chain: mainnet and World Chain
        Store::open("knock.db")?,                  // or ":memory:" for tests
        "https://club.example".to_string(),        // the origin knocks must be for
        accepted_binding().map_err(anyhow::Error::msg)?, // KnockBinding v3, production
        365 * 86_400,                              // the oldest binding it takes, in seconds
    )
    .strict(Strict::Off);

    // For the page: pass challenge.challenge to knock()
    let challenge = verifier.challenge(now()).map_err(|r| anyhow::anyhow!(r.why))?;

    // The knock the page sent back
    match verifier.verify(&assertion, Some("enter"), now()).await {
        Ok(knocked) => println!("in: {} (human {})", knocked.name, knocked.nullifier),
        Err(no) => println!("refused at check {}: {} ({})", no.check, no.why, no.error),
    }
    Ok(())
}
```

Share one `Verifier` across requests, in an `Arc`. It's `Send` and `Sync` when your `Chain` is.

## Verifier

```rust
pub struct Verifier<C> {
    pub chain: C,
    pub store: Store,
    pub origin: String,
    pub contract: Address,
    pub max_binding_age: u64,
    pub strict: Strict,
    /* a cache of deep ENS reads */
}
```

| Method | What it does |
| --- | --- |
| `Verifier::new(chain, store, origin, contract, max_binding_age)` | A verifier for one origin. Not strict. |
| `.strict(strict)` | The same verifier, strict: it takes a binding only once World Chain's safe or finalized head has reached it. |
| `.challenge(now)` | A new `Challenge` for the page, good once, for `CHALLENGE_TTL` seconds. Refuses with `busy` at check 2 when 10,000 are outstanding. |
| `.verify(&assertion, action, now).await` | V1 to V8, then one commit. `assertion` is the knock's JSON as a `serde_json::Value`. `action` is the site's action for V8, or `None`. Returns `Knocked`, or the first `Refusal`. |

`now` is unix seconds. The store's commit happens only after every check has passed, so a refused knock uses up nothing.

## The Chain trait

How the verifier reads the chains. You implement it over your RPCs:

```rust
pub trait Chain: Sync {
    fn head(&self) -> impl Future<Output = Result<u64, Unavailable>> + Send;
    fn records(&self, name: &str, block: u64) -> impl Future<Output = Result<Records, Unavailable>> + Send;
    fn receipt(&self, tx: B256) -> impl Future<Output = Result<Option<Receipt>, Unavailable>> + Send;
    fn final_block(&self, strict: Strict) -> impl Future<Output = Result<u64, Unavailable>> + Send;
}
```

| Method | Returns |
| --- | --- |
| `head` | Ethereum mainnet's latest block number. |
| `records` | The name's five `RECORDS` texts at a mainnet block, through ENS's Universal Resolver. An empty text is `None`, and so is a name with no resolver. |
| `receipt` | A World Chain transaction's receipt, or `None` if there's none. |
| `final_block` | World Chain's safe head for `Strict::Safe`, or its finalized head for `Strict::Finalized`. Never called when the verifier isn't strict. |

Return `Unavailable` when a chain can't be read. The verifier then refuses the knock as `unavailable`, at the check that was reading, and never guesses. `async fn` in your `impl` is fine:

```rust
impl Chain for MyChain {
    async fn head(&self) -> Result<u64, Unavailable> {
        self.eth.get_block_number().await.map_err(|e| Unavailable(format!("mainnet: {e}")))
    }
    // records, receipt, final_block …
}
```

`knock-verifier`'s `Rpc`, in [`server/verifier/src/main.rs`](https://github.com/getknock/knock/blob/main/server/verifier/src/main.rs), is a complete implementation with alloy, Universal Resolver calls included. Copy it.

## Store

The SQLite store: challenges, counters, keys seen revoked, and entries. `Verifier` calls it for you.

| Method | What it does |
| --- | --- |
| `Store::open(path)` | Opens or creates the database. `":memory:"` lasts as long as the process. |
| `issue(origin, now)` | A new challenge, after clearing expired ones. |
| `fresh(challenge, ours, knocked_for, now)` | V2: ours, unused, unexpired, and for our origin. |
| `counter(key)` | The highest counter seen for a key. |
| `revoke(key, now)`, `is_revoked(key)` | Keys seen revoked, for good. |
| `entered(action, nullifier)` | Whether a human has done an action. |
| `commit(challenge, origin, key, counter, entry, now)` | Uses the challenge, raises the counter and records the entry, all or none. |

## Types

| Type | What it is |
| --- | --- |
| `Assertion` | A knock as the Door hands it over (door-sdk's `Assertion`), from `parse`. |
| `Challenge` | `{ challenge, origin, expires_at }`, serialized in camelCase. |
| `Knocked` | A knock that passed: `{ name, key, nullifier, counter, origin, binding }`. |
| `Binding` | `{ tx, block, proved_at }`: the binding a knock stands on. |
| `Refusal` | `{ check, error, why }`: the first check that said no, a code, and words. |
| `Unavailable` | A chain couldn't be read: `Unavailable(String)`. |
| `Strict` | `Off` (the default), `Safe` or `Finalized`. Parses from `off`, `on`, `safe`, `finalized` and the like; `as_str()` gives `off`, `safe` or `finalized`. |
| `Records` | A name's Knock records at one block. `Records::from_texts` builds one from the texts of `RECORDS`, in order. |
| `Valid` | Records that passed V3: the key, its `VerifyingKey`, its `key_hash`, the nullifier and the binding's transaction. |
| `Receipt`, `Log` | A World Chain receipt, as `Chain::receipt` returns it. |
| `Wanted` | What V6 asks of a binding: transaction, contract, nullifier, key hash, name's node, final block, now, oldest age. |

## Constants

| Constant | Value | What it is |
| --- | --- | --- |
| `WORLD_CHAIN` | `480` | World Chain's chain id. |
| `CHALLENGE_TTL` | `120` | A challenge's life, in seconds. |
| `DEPTH` | `3` | How many blocks deep V3 reads a name's records. |
| `CACHE_TTL` | `60` | How long a deep read is kept, in seconds. Revocation is always read from the latest block. |
| `RECORDS` | `knock.v`, `knock.key`, `knock.status`, `knock.nullifier`, `knock.poh` | The records V3 reads. |

## Functions

Each check is a function you can call on its own, for tests or for a verifier of your own design.

| Function | What it does |
| --- | --- |
| `parse(&Value)` | V1: a knock, whole and well formed, `s` low. |
| `ok_name(&str)` | A name V1 takes: lowercase labels of `a`–`z`, `0`–`9` and `-`, at least two. |
| `ok_origin(&str)` | An origin V1 takes: `https://host[:port]`, or `http://localhost` or `http://127.0.0.1`, with or without a port. |
| `pass_digest(challenge, origin, node, counter, mode, nullifier, human_ref)` | The `KnockPass` digest, as the Wedgie makes it. |
| `signed_by(&VerifyingKey, digest, r, s)` | V4: the signature is the key's, over the digest, `s` low. |
| `parse_key(&str)` | A `knock.key`: 33 bytes, compressed P-256, as hex. Returns the bytes, the key and its hash. |
| `check_records(name, &deep, &latest)` | V3, given the records 3 blocks deep and at the latest block. |
| `check_binding(Option<&Receipt>, &Wanted)` | V6, given the binding's receipt. |
| `accepted_binding()` | The KnockBinding whose bindings count: v3, production, from the repo's deployments. |

## Testing with a stand-in chain

The crate's own tests run every check against a `Chain` that answers from memory, in [`crates/knock-verify/src/tests.rs`](https://github.com/getknock/knock/blob/main/crates/knock-verify/src/tests.rs). Do the same in yours: return fixed `Records` and a `Receipt`, open the store with `":memory:"`, and feed it the signed knock from [`spec/vectors/v1.json`](https://github.com/getknock/knock/blob/main/spec/vectors/v1.json).
