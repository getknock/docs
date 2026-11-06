---
title: Run knockd
description: knockd relays bindings to World Chain and answers the Console's lookups. Build it, give it a World Chain RPC and a funded key, and point a Console at it.
---

knockd is the small server the [Console](console.md) needs while a person sets up a Wedgie. It does three things:

- **It relays bindings.** When a Wedgie says yes to being bound to a human, knockd checks the Wedgie's signature and the human's World ID proof, then sends the binding to KnockBinding on World Chain and pays its gas.
- **It answers lookups.** It reads a binding back from its transaction, finds a Wedgie's latest binding by its key, and finds a returning human's World ID session.
- **It signs World ID requests**, if it holds its network's RP key. Only one knockd per network does, as [Host Knock yourself](overview.md#the-one-thing-that-belongs-to-a-network) explains.

It never sees a knock. Knocks go from the Door to a site's verifier, and knockd isn't in that path.

## What you need

- **Rust**, stable, and a checkout of [`getknock/knock`](https://github.com/getknock/knock).
- **A World Chain RPC URL.** A public one works for trying it out. A provider's is better for anything people use: knockd reads every binding so far when it starts, in many requests at once, and public RPCs limit those.
- **A gas key**: a private key whose address holds a little ETH on World Chain (chain 480). It pays for every binding knockd sends. Make a new key for this and use it for nothing else.
- **HTTPS in front of it.** Browsers won't let a Console on HTTPS call a knockd on plain HTTP, except on localhost.

## Build it

From the repo's root:

```bash
cargo build --release -p knockd
```

The binary is `target/release/knockd`. It reads its settings from the environment and from a `.env` file in the folder it runs in, so run it from the folder that holds that file.

## Set it up

Make a `.env` beside where it runs:

```bash title=".env"
WORLD_RPC=https://worldchain-mainnet.g.alchemy.com/public
RELAYER_WALLET_PRIV_KEY=0x…
WORLD_RP_KEY_FILE=none
KNOCKD_ORIGINS=https://console.example
KNOCKD_ADDR=127.0.0.1:8787
```

`WORLD_RP_KEY_FILE=none` makes a knockd that relays and looks up, and signs nothing: the right one for Knock's network, whose RP key is Knock's. Keep `.env` out of git, and readable only by the user knockd runs as (`chmod 600 .env`).

Then start it:

```bash
./target/release/knockd
```

Before it serves anything, it checks World Chain: that `WORLD_RPC` is chain 480, and that each KnockBinding it will send to is version 3, proves the action its deployments say, and answers to World ID's verifier. If anything's off, it says what and stops. When it's up, it logs `knockd on http://127.0.0.1:8787` and reads World Chain's bindings so far in the background.

Check it from another terminal:

```bash
curl -s http://127.0.0.1:8787/health
```

```json
{"KnockBinding":{"production":"0x…","staging":"0x…"},"action":{"production":"knock-human","staging":"knock-human"},"chainId":480,"ok":true,"signs":false}
```

`signs` is `false` for a knockd without an RP key.

## Fund the gas key

knockd pays for each binding it sends: about 415,500 gas, sent only after a simulation shows it will succeed, so a binding that would fail costs nothing. Gas on World Chain is cheap. When this was written, a binding cost under a millionth of an ETH, so a little ETH lasts a long time.

To fund it, send ETH on World Chain to the gas key's address, from an exchange that withdraws to World Chain or over a bridge. Check the balance now and then. When it runs out, bindings fail as `chain`, "sending failed", and knockd's log says why.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `WORLD_RPC` | none, needed | A World Chain RPC URL. It's never logged, and knockd leaves URLs out of the errors it sends back, since a provider's URL often carries its key. |
| `RELAYER_WALLET_PRIV_KEY` | none, needed | The gas key, `0x` and 64 hex digits. It pays for the bindings knockd sends. |
| `WORLD_RP_KEY_FILE` | `knock-worldchain-key.json` | The World ID RP key's file, or `none`. If the default file isn't there, knockd starts without signing, and says so. If a file you named isn't there, it stops. |
| `WORLD_APP_ID` | none | The World ID app's id, `app_…`. Needed only with an RP key. |
| `WORLD_RP_ID` | none | The app's RP id, `rp_` and 16 hex digits. Needed only with an RP key. |
| `KNOCKD_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | The Consoles that may call it from a browser, separated by commas, each exactly as browsers send it. `*` lets any Console call it. |
| `KNOCKD_ADDR` | `127.0.0.1:8787` | Where it listens. |
| `KNOCKD_ENV` | `.env` | The file it reads settings from. If it isn't there, knockd uses the environment alone. |
| `KNOCK_DEPLOYMENTS` | the one built in | A deployments file: the KnockBindings it sends to and looks up in. Only [a network of your own](own-network.md) needs it. |
| `KNOCKD_SKIP_CHECKS` | not set | Set to anything to skip the checks on World Chain at start. For development only. |

The RP key file is JSON with one field, `{"privateKey": "0x…"}`. Keep it beside `.env`, never in git, readable only by knockd's user.

## Put it behind HTTPS

knockd speaks plain HTTP on the address it listens on. Keep that address on `127.0.0.1` and put a proxy that serves HTTPS in front of it. With Caddy, which gets the certificate itself:

```text title="Caddyfile"
knockd.example {
  reverse_proxy 127.0.0.1:8787
}
```

With nginx, use your certificate and `proxy_pass http://127.0.0.1:8787;` in the site's `location /`.

knockd answers CORS itself, for the origins in `KNOCKD_ORIGINS`. Don't add CORS headers in the proxy.

## Keep it running

knockd is one process with nothing on disk: what it knows about bindings, it reads again from World Chain when it starts. Run it with whatever keeps your services up. With systemd:

```ini title="/etc/systemd/system/knockd.service"
[Unit]
Description=knockd
After=network-online.target
Wants=network-online.target

[Service]
User=knockd
WorkingDirectory=/opt/knockd
ExecStart=/opt/knockd/knockd
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Put the binary, `.env` and, if it has one, the RP key file in `/opt/knockd`, owned by the `knockd` user. Then `systemctl enable --now knockd`.

## Point a Console at it

Build the [Console](console.md) with `NEXT_PUBLIC_KNOCKD` set to your knockd's address, and `NEXT_PUBLIC_KNOCKD_RP` set to the knockd that signs for your network. Add the Console's origin to `KNOCKD_ORIGINS`.

## What it answers

Every answer is JSON. A no is `{"error", "why"}` with an HTTP status, `why` in words a person can read.

| Route | What it does |
| --- | --- |
| `GET /health` | Whether it's up, whether it `signs`, and the KnockBindings and actions it uses. |
| `POST /rp-context` | A signed World ID request: `{ environment, session }` in, `{ app_id, action, rp_context }` out. Without an RP key it answers 501, `no_rp_key`. |
| `POST /bind` | Checks a binding and sends it: the Wedgie's signature, then the human's proof in a simulation, then the transaction. |
| `POST /bound` | A binding as World Chain has it, from its transaction. |
| `POST /binding` | A Wedgie's latest binding, by its key. |
| `POST /human` | A human's World ID session, found by their nullifier, a session, a Wedgie's key or a name. |

`environment` is `production` (World App) or `staging` (World's Simulator, for testing).

### Its limits

So a busy or hostile caller can't spend its gas or its RPC, knockd allows, across everyone, in any hour:

| What | How many |
| --- | --- |
| Signed requests | 120 |
| Bindings simulated | 120 |
| Bindings sent | 12 |
| Lookups | 600 |

Past a limit it answers 429, `busy`, until the hour's oldest has aged out. Requests can be at most 16 KiB.

## What it keeps

Nothing about who asked: it logs no IP addresses, and keeps no records on disk. It logs what it did, such as a request signed or a binding sent with its transaction, and errors with their URLs left out. The gas key, the RP key and the RPC URL are never logged or sent back.
