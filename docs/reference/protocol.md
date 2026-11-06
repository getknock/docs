---
title: Protocol
description: What a Wedgie signs, how a knock's digest is made, the ENS records and the World Chain binding a verifier reads, and the test vectors.
---

You don't need this page to add Knock to a site. It's for writing a verifier of your own, checking one, or knowing exactly what a knock commits to.

## Signed messages

Every signature a Wedgie makes is over an EIP-712 digest it builds itself, from fields it shows or holds. It never signs bytes a computer hands it.

The domain is the same for every message, with no chain and no contract:

```ts
const DOMAIN = { name: 'Knock', version: '1' }
```

The digest is EIP-712's: `keccak256(0x1901 ‖ domainSeparator ‖ hashStruct(message))`.

| Message | Signed when | Fields |
| --- | --- | --- |
| `KnockHello` | The Console checks a Wedgie's key | `bytes32 challenge` |
| `KnockEnroll` | A Wedgie is named | `bytes32 nonce`, `string name`, `bytes key` |
| `KnockBind` | A Wedgie asks to be bound to a human | `uint256 chainId`, `address registry`, `uint256 nullifier`, `uint64 expiresAtMin`, `bytes key` |
| `KnockPass` | A knock | See below |

### KnockPass

```solidity
struct KnockPass {
    bytes32 challenge;
    string origin;
    bytes32 deviceNode;
    uint64 counter;
    uint8 mode;
    uint256 nullifier;
    bytes32 humanRef;
}
```

| Field | What the Wedgie puts in it |
| --- | --- |
| `challenge` | The site's challenge, from the Door. |
| `origin` | The site's origin, from the Door, as the browser gave it. The Wedgie shows it on screen first. |
| `deviceNode` | The ENS namehash of the name it knocks as, after ENSIP-15 normalization. |
| `counter` | Its knock counter, raised for this knock. It starts at 1 and rises with every knock, on any site. |
| `mode` | `1`, Bound. `2`, Fresh, is defined but not offered. |
| `nullifier` | The human's nullifier, from its binding. |
| `humanRef` | 32 zero bytes in mode 1. |

A verifier rebuilds the digest from its own origin and challenge, and the knock's other fields. It never takes the digest from the knock.

## Signatures and keys

- **Curve:** P-256 (secp256r1), ECDSA over the 32-byte digest as it is, with no second hash.
- **Signatures:** `r` and `s`, 32 bytes each, with `s` at most half the curve order. A high `s` is refused.
- **Keys:** `knock.key` is the 33-byte compressed point, `0x02` or `0x03` and then X, in lowercase hex.
- **Key hash:** `keccak256(X ‖ Y)` over the 64-byte uncompressed coordinates. This is how a `Bound` log names a key.

The key is made on the Wedgie's OPTIGA Trust M chip, and stays there.

## ENS records

A Wedgie's name, such as `wedgie.itzraj.eth`, holds these records on Ethereum mainnet. Verifiers read the first five, through ENS's Universal Resolver.

| Record | Value | Read by verifiers |
| --- | --- | --- |
| `knock.v` | `1` | Yes |
| `knock.key` | The compressed P-256 key, `0x` and 66 hex digits | Yes |
| `knock.status` | `active` or `revoked` | Yes |
| `knock.nullifier` | The human's nullifier, `0x` and 64 hex digits | Yes |
| `knock.poh` | The binding: `eip155:480:tx:0x` and the transaction hash | Yes |
| `knock.sc` | The Wedgie's security class: `S1` when any app installed on the Wedgie can use its chip | No |
| `addr` | The owner's wallet | No |

`knock.att`, the chip maker's attestation of the key, is reserved and not written yet.

A verifier takes records that are `active` and the same 3 blocks deep as at the latest block, and reads `revoked` at the latest block. An expired name has no resolver, so its records read as empty.

## The binding

A binding is a successful transaction on KnockBinding v3 on World Chain (chain 480). The contract checks a World ID proof whose signal commits to the Wedgie's key and its name's node, and then logs:

```solidity
event Bound(uint256 indexed nullifier, bytes32 indexed keyHash, bytes32 indexed node, uint64 expiresAtMin);
```

| | Production | Staging |
| --- | --- | --- |
| KnockBinding v3 | `0x7748D2787DcB6E6024968edC19fcA13ccAbA1699` | `0x5248D9EE577311D8f0e87bF3Ca2EE990a7ce46E7` |
| Takes proofs from | World App | World ID's Simulator |
| Counts for verifiers | Yes | No |

A verifier takes a binding when the transaction succeeded, and a log from the production address has `Bound`'s signature and exactly this nullifier, key hash and node as its topics. `expiresAtMin` tells it roughly when the proof was made, which it holds to `VERIFIER_MAX_BINDING_DAYS`. Bindings from KnockBinding v1 and v2 never count. [`contracts/deployments/480.json`](https://github.com/getknock/knock/blob/main/contracts/deployments/480.json) lists every deployment.

## Names and origins

| | Taken | Refused |
| --- | --- | --- |
| Names | Two or more labels of `a`–`z`, `0`–`9` and `-`, up to 63 characters each, 255 in all | Capitals, `_`, empty labels, `--` in the third and fourth characters |
| Origins | `https://host` or `https://host:port`, lowercase. `http://localhost` and `http://127.0.0.1`, with or without a port. | Paths, `user@`, other `http://` hosts, capitals |

## Test vectors

[`spec/vectors/v1.json`](https://github.com/getknock/knock/blob/main/spec/vectors/v1.json) has a published test key, and every message above with its type string, struct hash, digest and signature, including a whole knock. Both the TypeScript and Rust sides are tested against it. The key is public, so never use it for anything real.

## @knock-dev/protocol

The TypeScript side of all this, in [`packages/protocol`](https://github.com/getknock/knock/blob/main/packages/protocol/src/index.ts):

| Export | What it is |
| --- | --- |
| `DOMAIN`, `TYPES`, `KINDS`, `DOMAIN_SEPARATOR` | The EIP-712 domain and types. |
| `digest(kind, message)`, `structHash(kind, message)`, `typeString(kind)` | A message's digest, struct hash and type string. |
| `deviceNode(name)` | The namehash of a name, after normalization. |
| `compressKey(x, y)`, `uncompressKey(key)`, `keyHash(x, y)` | Key formats, and the key hash `Bound` uses. |
| `verifySignature(digest, r, s, key)` | A Wedgie's signature over a digest, `s` low. |
| `signDigest(digest, secretKey)`, `publicKeyOf(secretKey)` | Signing in software, for tests and vectors. Wedgies sign in their chip. |
| `hashToField(bytes)`, `signalHash(signal)`, `bindSignal(key, node)` | World ID's hashing, and a binding's signal. |
| `MODE`, `NO_HUMAN_REF`, `P256_N` | `{ bound: 1, fresh: 2 }`, 32 zero bytes, and P-256's order. |
| `ACTION`, `ACTION_HASH` | The World ID action in the test vectors, `knock-bind`, and its hash. Each KnockBinding names its own action in the deployments. |
