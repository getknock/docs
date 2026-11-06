---
title: Security model
description: What a knock proves and what it doesn't, what's public, and how Knock handles replays, revocation and chain trouble.
---

## What a knock proves

When your verifier lets a knock in, it has checked that:

- the Wedgie whose key is in ENS under the knock's name signed it, which its firmware does only after a green press;
- it signed your challenge, for your origin, less than 2 minutes after your verifier made the challenge;
- the name is active at the latest mainnet block, and its records have held for 3 blocks;
- the key is bound to a human on KnockBinding v3, production, for this name, by a World ID proof no older than you allow;
- the Wedgie's counter rose, so this knock is new;
- if you named an action, this human hasn't done it on your site before.

## What it doesn't prove

- **Who pressed.** The Wedgie has no PIN, so anyone holding it can knock as its owner. If it's lost or stolen, its owner kills its name with the Knock Console's kill switch, which needs only the wallet that holds the name, not the Wedgie. Or they revoke the name in the [ENS app](https://app.ens.domains), by setting its `knock.status` record to `revoked`. Until then, it knocks for whoever has it.
- **That one human is one person at a keyboard.** World ID proves the binding was made by a unique human. It can't stop a human from binding a Wedgie and handing it to someone else, or being paid to.
- **That the origin on screen is right.** The Wedgie shows the origin the Door read from the browser, labelled *unverified: the Door says so*, since the Wedgie can't see the browser itself. On a computer that's been compromised, the Door could be made to ask for a knock for another site. The screen still shows that site, so people should read it before pressing.
- **That nothing else on the Wedgie can use its key.** When a Wedgie's `knock.sc` record is `S1`, any app installed on the Wedgie can use its chip. Install apps you trust.
- **That the Wedgie is a hardware wallet.** It's a small hackable device, and its Knock app hasn't been audited.

## What's public

Knock trades privacy between sites for a binding anyone can check:

- **In ENS**, anyone can read each name's key, status, nullifier, binding transaction and owner's wallet.
- **The nullifier is one per human.** It's the same on every Wedgie a human binds and on every site they knock on. Sites that compare their records can tell the same human visited each, and anyone can look up which names carry a nullifier.
- **The counter rises with every knock, on any site.** A site can see roughly how many times a Wedgie knocked elsewhere since it last knocked there.
- **On World Chain**, each binding's `Bound` log shows the nullifier, the key's hash and the name's node.

No one can see where a Wedgie knocks, apart from the sites it knocks on. Mode 2, Fresh, a new World ID proof with each knock and a nullifier for each site, would make humans unlinkable between sites. It isn't offered yet.

## Replays and relays

- **Challenges** are 32 random bytes from your verifier, for your origin, used once and good for 120 seconds. A knock can't be used twice, or saved for later.
- **The origin is signed.** The Door reads it from the browser, and the Wedgie signs it. A site that gets a knock for itself can't use it on yours: your verifier refuses it at check 2, or at check 4 if its `origin` was changed.
- **A site can't borrow your challenge.** If another site gets a challenge from your verifier and asks for a knock with it, the knock is signed for that site's origin, and your verifier refuses it.
- **Counters** must rise with each knock from a key, so a knock sent again fails check 5.
- **All or nothing.** A knock that passes uses up its challenge, its counter and its entry in one SQLite transaction. Two checks of one knock at the same time can't both pass.

## Revocation

- **Revoked:** when a name's `knock.status` is `revoked`, every verifier refuses its knocks at once, since check 3 reads the status at the latest block. A verifier that has seen a key revoked keeps refusing it, even if the name is switched back on. The owner sets the record in the [ENS app](https://app.ens.domains); the Console has no revoke.
- **Killed:** the Console's kill switch unregisters the name and unlinks its records, from the owner's wallet, with or without the Wedgie. Knocks then fail check 3 as `no_name`.
- **Expired:** an ENS name that expires reads as empty, so it fails the same way.
- **Old bindings:** a binding whose World ID proof is older than `VERIFIER_MAX_BINDING_DAYS`, 365 by default, fails check 6.

## Failing closed

- **A chain that can't be read** means a refusal, `unavailable` with status 503, never a guess.
- **Records that are changing** mean a refusal until they've held for 3 blocks.
- **Only one KnockBinding counts**: v3, production. Staging's takes proofs from World ID's Simulator, so its bindings never count, nor do older versions'.
- **Finality is your choice.** By default a binding counts once it's in a World Chain block. [Strict mode](guides/strict-mode.md) waits for Ethereum.

## What your verifier trusts

Your verifier believes its RPCs. One that lies could show records or a binding that aren't on chain. Use providers you trust, or run your own nodes. It never calls Knock: no Knock server takes part in a knock.

## Your verifier's data

- **`entries`** links humans' nullifiers to the actions they took on your site, with names and times. Treat it as personal data.
- **Logs** say who got in and which check refused. They hold no IP addresses, and no RPC URLs, which often carry keys.

## The Door

- It holds no key, so it can't make a knock, only carry one. A knock it made up fails check 4.
- It reads your origin from the browser, never from your page.
- It answers only the window that opened it, at that window's origin, and only once.
- It refuses to work inside a frame, where another page could cover what it says.
- Knock's is at `https://door.getknock.dev`. A site can [serve its own](self-host/door.md) instead.

## Reporting a problem

If you find a way past a check, report it to the maintainers privately, not in a public issue.
