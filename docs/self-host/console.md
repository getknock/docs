---
title: Host the Console
description: The Console is static files, built with the knockds it talks to. Its settings, and what it needs from the person using it.
---

The Knock Console is where a person sets up their Wedgie: they choose its name, bind it to themselves with World ID, name it in ENS, and kill it if it's lost. It runs in the browser. Everything it writes, it writes through the person's own wallet or through a knockd. It holds no keys of its own.

## Build it

The Console and the [Door](door.md) are one app. Set the Console's settings as you build, from a checkout of `getknock/knock`:

```bash
bun install
cd apps/door
NEXT_PUBLIC_KNOCKD=https://knockd.example \
NEXT_PUBLIC_KNOCKD_RP=https://signer.example \
NEXT_PUBLIC_ETH_RPC=https://your-mainnet-rpc.example \
bun run build
```

Then serve `apps/door/out/` on HTTPS, as [Host the Door](door.md#serve-it) says. The Console is at `/`.

## Settings

They're read when it's built, so build again to change one.

| Setting | Default | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_KNOCKD` | `http://127.0.0.1:8787` | The knockd the Console relays bindings through and looks them up with: Knock's, or [your own](knockd.md). |
| `NEXT_PUBLIC_KNOCKD_RP` | `NEXT_PUBLIC_KNOCKD` | The knockd that signs World ID requests. On Knock's network that's Knock's knockd, the only one that holds Knock's World ID key; it isn't public yet. On [a network of your own](own-network.md), yours. |
| `NEXT_PUBLIC_ETH_RPC` | `https://ethereum-rpc.publicnode.com` | A mainnet RPC, for reading ENS when no wallet is connected, and for simulating transactions the wallet's own RPC won't. |
| `NEXT_PUBLIC_DOCS` | these docs | Where its links to the docs go. |
| `NEXT_PUBLIC_CLUB` | the Human Club | Where its link to the Human Club goes. |

Each knockd the Console calls has to let the Console's origin in: its `KNOCKD_ORIGINS` lists it, or is `*`.

The KnockBindings it binds with, staging's and production's, come from `contracts/deployments/480.json` in the checkout it's built from. Knock's are there. A network of your own puts its own there before building.

## What the person needs

- **A desktop Chromium browser**, such as Chrome, Edge, Brave or Arc, for Web Serial.
- **Their Wedgie**, running the Knock app, plugged in.
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

Nothing else: no analytics, and nothing of Knock's beyond the knockds you name.
