---
title: Host the Console
description: The Console is static files, built with the knockds it talks to. Its settings, and what it needs from the person using it.
---

The Knock Console is where a person sets up their Wedgie: they put the Knock app on it, choose its name, bind it to themselves with World ID, name it in ENS, and kill it if it's lost. It runs in the browser. Everything it writes, it writes through the person's own wallet or through a knockd. It holds no keys of its own.

## Build it

The Console and the [Door](door.md) are one app. Set the Console's settings as you build, from a checkout of `getknock/knock`:

```bash
bun install
cd apps/door
NEXT_PUBLIC_KNOCKD=https://knockd.example \
NEXT_PUBLIC_ETH_RPC=https://your-mainnet-rpc.example \
bun run build
```

Then serve `apps/door/out/` on HTTPS, as [Host the Door](door.md#serve-it) says. The Console is at `/`. On Vercel, set these settings in the project's environment variables, for Production, before it builds.

With no settings at all, it's a Console on Knock's network that uses Knock's knockd for everything. That example relays bindings through your own knockd and still gets its World ID requests signed by Knock's, which is the only one that can sign them.

## Settings

They're read when it's built, so build again to change one.

| Setting | Default | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_KNOCKD` | Knock's, `https://knockd.getknock.dev`; on localhost, `http://127.0.0.1:8787` | The knockd the Console relays bindings through and looks them up with: Knock's, or [your own](knockd.md). |
| `NEXT_PUBLIC_KNOCKD_RP` | Knock's, `https://knockd.getknock.dev`; on localhost, `http://127.0.0.1:8787` | The knockd that signs World ID requests. On Knock's network that's Knock's, the only one that holds Knock's World ID key. On [a network of your own](own-network.md), yours. |
| `NEXT_PUBLIC_ETH_RPC` | `https://ethereum-rpc.publicnode.com` | A mainnet RPC, for reading ENS when no wallet is connected, and for simulating transactions the wallet's own RPC won't. |
| `NEXT_PUBLIC_DOCS` | these docs | Where its links to the docs go. |
| `NEXT_PUBLIC_CLUB` | the Human Club | Where its link to the Human Club goes. |

Each knockd the Console calls has to let the Console's origin in: its `KNOCKD_ORIGINS` lists it, or is `*`, as Knock's is.

The KnockBindings it binds with, staging's and production's, come from `contracts/deployments/480.json` in the checkout it's built from. Knock's are there. A network of your own puts its own there before building.

## What the person needs

- **A desktop Chromium browser**, such as Chrome, Edge, Brave or Arc, for Web Serial.
- **Their Wedgie**, plugged in. If it runs another app, or an older Knock, the Console installs Knock on it first.
- **World App** on their phone, to prove they're a human. The Console's Simulator option is for testing, on staging.
- **A wallet in the browser** that holds, or can make, the ENS name: an extension that announces itself (EIP-6963). Naming is mainnet transactions, signed and paid for in their wallet.

## What it calls

| What | Why |
| --- | --- |
| The person's wallet | ENS reads and the naming and kill-switch transactions, on mainnet. |
| `NEXT_PUBLIC_ETH_RPC` | ENS reads with no wallet connected, and simulations. |
| `NEXT_PUBLIC_KNOCKD_RP` | `/rp-context`: World ID requests, signed. |
| `NEXT_PUBLIC_KNOCKD` | `/health`, `/bind`, `/bound`, `/binding` and `/human`. |
| World App, through World's relay | The World ID proof, after the person scans the QR on the Wedgie. |
| `api.github.com` | The commit `getknock/wedgie`'s `main` is at, when a Wedgie is connected. |
| `raw.githubusercontent.com` | Knock's `wedgie.json` and its files, from that commit. |
| `wedgie.dev/fw/manifest.json` | wedgie.dev's list of apps, for the name of the app a Wedgie runs and the files it takes off. |

Nothing else: no analytics, and nothing of Knock's beyond the knockds you name and the Knock app's repo.

## The Knock app it installs

When a Wedgie runs another app, or none, or a Knock older than the repo's, the Console offers to install Knock. It reads [`getknock/wedgie`](https://github.com/getknock/wedgie) each visit: the commit `main` is at, then `wedgie.json` and every file it lists, from that commit. It keeps no copy, so what's pushed to `main` is what it installs next. `wedgie.json` has to follow wedgie.dev's rules for an app from a repo, or it installs nothing. GitHub answers 60 of these lookups an hour for each visitor's address; past that, the Console reads `main` itself.

Knock isn't on wedgie.dev's list, so it goes on as any app from a repo does. The Wedgie asks FULL CONTROL? in red, and a green press gives the Console's page full control until the Wedgie restarts. The Console writes each file, checks it on the Wedgie by its SHA-256, and writes the Wedgie's `apps.json` the way wedgie.dev does, so wedgie.dev can put the old app back later. Then it restarts the Wedgie, which locks it again, and finds it once it's back. The old app's saves and the keys in the chip stay.

It turns a Wedgie away before asking anything when its firmware is older than the `fw` in `wedgie.json`, or its chip isn't an OPTIGA Trust M. The repo is `REPO` in `apps/door/lib/knock-app.ts`: a network with its own Knock app changes it there and builds again.
