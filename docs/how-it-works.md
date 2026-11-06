---
title: How a knock works
description: Who does what in a knock, from the click to the verifier's answer, and why your verifier needn't trust the browser, the Door or Knock.
---

## Who takes part

- **The person and their Wedgie.** The Wedgie makes its key inside its secure chip, an OPTIGA Trust M, and the key never leaves it. The Wedgie shows each request on its own screen and signs only after a press of its green button.
- **Your page**, with door-sdk.
- **The Door**: Knock's popup. It talks to the Wedgie over USB, through the browser's Web Serial, and hands the knock to the page that opened it. It holds no key, so it can carry a knock but never make one.
- **Your verifier**: your own service. It reads two public chains and trusts nothing it's handed.
- **ENS, on Ethereum mainnet**: the Wedgie's name, and the Knock records on it.
- **World Chain**: the binding. It's a transaction on Knock's KnockBinding contract, which checked a World ID proof and then tied the Wedgie's key to one human and to the name.

## Once: setting up a Wedgie

Before a Wedgie can knock, its owner sets it up in the Knock Console, in this order:

1. **The key.** The Wedgie makes it on the chip, after a green press.
2. **The binding.** The person proves with World ID that they're a human, and the Wedgie signs a request to bind its key. KnockBinding checks the proof on World Chain and logs `Bound(nullifier, keyHash, node, expiresAtMin)`: this key, this human, this name. The nullifier is the human's number for Knock's World ID action: the same for every Wedgie they bind.
3. **The name.** The owner's wallet sets the name's Knock records in ENS. `knock.poh` points at the binding's transaction, so the binding comes first.

| Record | Holds |
| --- | --- |
| `knock.v` | `1`, the version of these records |
| `knock.key` | The Wedgie's public key: compressed P-256, 33 bytes in hex |
| `knock.status` | `active`, or `revoked` when its owner turns it off |
| `knock.nullifier` | The human's nullifier, as a 32-byte word in hex |
| `knock.poh` | The binding: `eip155:480:tx:` and its transaction hash |

The owner can kill the name with the Console's kill switch, from the wallet that holds it: the name leaves ENS, and its knocks bounce at once. The Wedgie needn't be there, so a lost or stolen one can be stopped too. If it is there, it forgets the name and its binding, and can be set up again from scratch. The owner can also revoke the name in the [ENS app](https://app.ens.domains), by setting `knock.status` to `revoked`. One human can bind several Wedgies, each under its own name.

## A knock, step by step

```text
your page        the Door          the Wedgie       your verifier     ENS, World Chain
    | challenge, please ------------------------------>|
    | open ------->|                                   |
    | challenge -->| request ------->|                 |
    |              |           KNOCK, green            |
    |              |<------- signed  |                 |
    |<-- the knock |                                   |
    | check it ---------------------------------------->| records, binding ->|
    |<------------------------------------- in, or why not                 |
```

1. **A challenge.** On the click, your page asks your verifier for a challenge: 32 random bytes for your origin, good once, for 120 seconds.
2. **The Door opens.** In the same click, `knock()` opens the Door as a popup. The Door says it's ready, and door-sdk sends it the challenge, addressed to the Door's origin only.
3. **Your origin, from the browser.** The Door reads your page's origin from the browser, as the origin of the message that carried the challenge. Your page never states it, so it can't claim to be another site. The Door takes `https://` origins only, and `http://localhost` or `http://127.0.0.1` for development.
4. **The Wedgie asks its owner.** Its KNOCK page shows the name it knocks as, and your origin, with *unverified: the Door says so* beneath. The Wedgie can't see the browser, so it shows whose word the origin is.
5. **The press.** On green, the Wedgie raises its counter and signs a `KnockPass` (EIP-712) over the challenge, the origin, its name's node, the counter, the mode and the human's nullifier. Red means no knock.
6. **The Door hands it over.** The Door checks the signature against the Wedgie's key, then posts the knock to your page's origin only, and closes.
7. **Your verifier checks it.** The knock goes to your verifier's `POST /verify`. It runs eight checks in order, and the first that fails gives the answer. If all pass, it uses up the challenge, records the counter and, if you named an action, the entry, all in one transaction. Then it answers `{ok: true, knock}`.

## The eight checks

| | Check | It reads |
| --- | --- | --- |
| 1 | The knock is whole and well formed | The knock |
| 2 | Its challenge is one this verifier gave, unused, under 2 minutes old, for this origin | Its own store |
| 3 | The name has Knock's records, switched on, and unchanged for the last 3 blocks | ENS on mainnet |
| 4 | The Wedgie whose key ENS holds signed it, for this site and challenge | ENS's key, and the knock |
| 5 | Its counter is higher than in any knock of this Wedgie's seen before | Its own store |
| 6 | The binding names this key, this human and this name, on KnockBinding v3, and isn't too old | World Chain |
| 7 | Its mode is one this verifier offers: mode 1 | The knock |
| 8 | This human hasn't done this action here before, when there is one | Its own store |

Check 7 runs just before check 6, and keeps its number. [Checks and refusals](reference/checks.md) has every answer each check can give.

## What your verifier trusts

It trusts four things:

- **Ethereum mainnet**, for ENS, through the RPC you give it.
- **World Chain**, for the binding, through the RPC you give it.
- **KnockBinding v3**, whose code checks a World ID proof before it logs a `Bound`.
- **The Wedgie**: its chip keeps the key in, and its firmware signs only after a green press.

It trusts nothing else:

- **Not the browser, and not your page.** The signature covers the challenge and the origin. The key, the human and the binding come from ENS and World Chain, never from the knock.
- **Not the Door.** It holds no key, so a knock it made up fails check 4.
- **Not Knock.** No Knock server takes part in a knock. Your verifier reads public chains only, so it keeps working as long as ENS and World Chain do.

## What each side learns

- **Your site** learns the name, the Wedgie's key, the human's nullifier, the Wedgie's counter and the binding's transaction. It doesn't learn who the person is.
- **Knock's servers** learn nothing about knocks. knockd, Knock's signer, takes part only when a Wedgie is bound.
- **Anyone** can read each name's records in ENS, including its key and nullifier. Only the sites a Wedgie knocks on see its knocks.

Because the nullifier is the same for one human on every site, sites that compare notes can tell it's the same human. [Security](security.md) covers this and the rest of the model.
