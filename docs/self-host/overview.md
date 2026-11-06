---
title: Host Knock yourself
description: Every part of Knock can run on your own machines. What each part is, what it needs, and the one thing that belongs to whoever runs a network.
---

Nothing in Knock has to run on Knock's servers. Every part is open source and builds from [`getknock/knock`](https://github.com/getknock/knock), and most of them are static files or a package.

## The parts

| Part | What it is | Who runs it | To host it |
| --- | --- | --- | --- |
| [The Door](door.md) | The popup that talks to the Wedgie over USB | Knock, or any site | Static files on HTTPS |
| [The Console](console.md) | Where a person names and binds their Wedgie | Knock, or anyone | Static files on HTTPS, and a knockd |
| [knockd](knockd.md) | Relays bindings to World Chain, answers lookups, and signs World ID requests | Knock, or anyone | A small Rust server, a World Chain RPC and a little ETH there |
| A verifier | Checks knocks for one site | Each site | [`@knock-dev/verify`](../guides/verify-in-your-server.md) in your server, or [`knock-verifier`](../guides/verifier.md) beside it |
| [The Human Club](human-club.md) | The demo site: petitions and fundraisers for humans | Knock, or anyone | Vercel and Turso, or any Node host |
| These docs | This site | Knock, or anyone | Static files: `bun run build` in [`getknock/docs`](https://github.com/getknock/docs), then serve `out/` |
| The Knock app | Runs on the Wedgie | Its owner | Installed from the [Console](console.md#the-knock-app-it-installs), which puts on that repo's latest commit; from a checkout of [`getknock/wedgie`](https://github.com/getknock/wedgie) with `wedgie.py install .`; or from wedgie.dev as an app from that repo |

## What doesn't need Knock at all

A Wedgie that's already set up never needs Knock's servers. Its records are in ENS on Ethereum mainnet, its binding is on World Chain, and its knocks go from the Door to your verifier, which reads both chains through RPCs of your choosing. If Knock's machines all went away tomorrow, every bound Wedgie would keep knocking, on every site that runs a verifier, through any copy of the Door, until its binding is older than a site allows (a year, by default).

What does go through a server is setting a Wedgie up: binding it to a human needs a World ID proof, and a World ID proof request has to be signed by the app that asks for it.

## One RP key per network

World ID only answers requests signed by an app's RP key, the key World's registry on World Chain holds for that app. For Knock's network, that's Knock's key, and only Knock's knockd holds it. So:

- **On Knock's network** you can run everything yourself, a knockd included, except the signature on World ID requests. Your Console gets those from Knock's knockd, as it does unless you set `NEXT_PUBLIC_KNOCKD_RP`, and does the rest with yours: [Run knockd](knockd.md) says how.
- **On a network of your own** you hold the RP key: your own World ID app, your own KnockBinding, your own knockd. [Run a network of your own](own-network.md) walks through it. Sites take your bindings only if they choose to, and your humans' nullifiers differ from their nullifiers on Knock's network.

## Choosing what to host

- **A site that takes knocks** runs a verifier. That's all it needs. It can also host its own copy of [the Door](door.md), if it wants nothing of Knock's in the knock's path.
- **A person who doesn't want to depend on Knock's Console** hosts [the Console](console.md) and, to relay their own bindings, [knockd](knockd.md).
- **A community that wants its own network** of humans, separate from Knock's, follows [Run a network of your own](own-network.md).
