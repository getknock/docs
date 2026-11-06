---
title: Run a network of your own
description: Your own World ID app, your own KnockBinding on World Chain, and your own knockd, for humans who bind on your network instead of Knock's.
---

On Knock's network, Knock's World ID app proves who's human, and only Knock's knockd can sign its requests. A network of your own replaces that part with your own World ID app, KnockBinding and knockd, which holds your app's key. Everything else is the same code, and the Wedgie needs nothing new.

Most people don't need this. To keep Knock's servers out of the path, [host the parts](overview.md) on Knock's network. Run a network when you want humans to be proved by an app you control, for example a community that won't depend on Knock for setting up a Wedgie.

## What changes, and what it costs

- **Sites choose to take it.** A verifier takes Knock's KnockBinding unless it's told to take yours. A Wedgie bound on your network is refused at check 6 by sites that haven't opted in.
- **A human has a different nullifier there.** World ID gives each app and action its own nullifier for a person, so nobody can link a human on your network to the same human on Knock's. A site that takes both networks could let one human in once on each.
- **A Wedgie knocks on one network at a time.** Its name's records point at one binding, so it's on Knock's network or on yours, not both.
- **You run the signing knockd**, keep its RP key safe, and pay for bindings in ETH on World Chain.

## What you need

- A checkout of [`getknock/knock`](https://github.com/getknock/knock), with [Rust](https://rustup.rs), [Bun](https://bun.sh) and [Foundry](https://getfoundry.sh).
- A World Chain RPC URL, and a key with a little ETH on World Chain to deploy with and to pay for bindings, as in [Run knockd](knockd.md#fund-the-gas-key).
- An account in [World's Developer Portal](https://developer.world.org).

## 1. Make a World ID app

In the Developer Portal:

1. **Create an app.** Note its id, `app_…`.
2. **Set up World ID 4.0 for it with a managed RP.** The portal registers your app's RP on World Chain, in World's production registry and its staging registry, and gives you the RP's signing key once. Note the RP's id, `rp_` and 16 hex digits, and save the key in a file of its own:

   ```json title="our-rp-key.json"
   { "privateKey": "0x…" }
   ```

   Keep this file out of git and readable only by you (`chmod 600 our-rp-key.json`). It's the key World ID trusts for your app: whoever holds it can ask World App for proofs in your app's name.

3. **Create the action first bindings prove**, in production, and in staging too to test with World's Simulator. Give it a name of its own, such as `our-human`. A human proves it once, when their first Wedgie is bound. After that, their Wedgies are bound with the World ID session that proof started.

## 2. Deploy your KnockBinding

KnockBinding is the contract on World Chain that holds your network's bindings. It has no owner and can't be upgraded: once deployed, nobody can change it, you included. Each one names your RP and your action, and answers to one of World's verifiers, production's or staging's, so you deploy two.

Put your settings in `.env` at the repo's root:

```bash title=".env"
WORLD_RPC=https://worldchain-mainnet.g.alchemy.com/public
RELAYER_WALLET_PRIV_KEY=0x…
WORLD_APP_ID=app_…
WORLD_RP_ID=rp_…
```

Then, from `contracts/`:

```bash
cd contracts
forge soldeer install
set -a; . ../.env; set +a
KNOCK_ACTION=our-human forge script script/DeployKnockBinding.s.sol --rpc-url "$WORLD_RPC"
```

Without `--broadcast` that only simulates: it checks your settings and shows what it would deploy. When it looks right, deploy production and then staging:

```bash
KNOCK_ACTION=our-human forge script script/DeployKnockBinding.s.sol --rpc-url "$WORLD_RPC" --broadcast
KNOCK_ACTION=our-human KNOCK_STAGING=true forge script script/DeployKnockBinding.s.sol --rpc-url "$WORLD_RPC" --broadcast
```

Each costs about 843,500 gas, paid by `RELAYER_WALLET_PRIV_KEY`. forge prints each contract's address and the block it went into. Note both, for each.

## 3. Write your deployments

Your network's parts find your KnockBindings in a deployments file. Copy Knock's, `contracts/deployments/480.json`, to `our-deployments.json`, and in both `production` and `staging` change three fields:

| Field | Set it to |
| --- | --- |
| `KnockBinding` | Your KnockBinding's address there. |
| `block` | The block it went into. knockd reads bindings from there on. |
| `action` | Your action, `our-human`. |

Leave `WorldIDVerifier`, `RpRegistry` and `version` as they are: they're World's contracts, and KnockBinding's version. Set `retired` to `[]`: it lists Knock's old KnockBindings.

The Console reads `contracts/deployments/480.json` when it's built, so for a checkout that builds your Console, put your file in its place.

## 4. Run your knockd

[Run knockd](knockd.md) as that guide says, with the RP key: in its `.env`, besides the settings above,

```bash title=".env"
WORLD_RP_KEY_FILE=our-rp-key.json
KNOCK_DEPLOYMENTS=our-deployments.json
KNOCKD_ORIGINS=https://console.example
```

As it starts, it checks World Chain: each KnockBinding is version 3, proves your action and carries your RP, and World's registries have your RP key as your RP's signer. If the portal hasn't finished registering your RP, the last check fails: wait a few minutes and start it again. `/health` then says `"signs": true`.

## 5. Build your Console

Build [the Console](console.md) from the checkout with your deployments file, pointing both of its knockd settings at yours:

```bash
cd apps/door
NEXT_PUBLIC_KNOCKD=https://knockd.example \
NEXT_PUBLIC_KNOCKD_RP=https://knockd.example \
bun run build
```

Serve it, and try a binding on staging first, with the Console's Simulator option. Then one with World App, on production.

## 6. Have sites take it

Tell sites your production KnockBinding's address. Each verifier takes it in its own way:

| Verifier | Setting |
| --- | --- |
| [`@knock-dev/verify`](../guides/verify-in-your-server.md) | `contract: '0x…'` in `new Verifier()` or `check()` |
| [`knock-verifier`](../guides/verifier.md) | `VERIFIER_KNOCK_BINDING=0x…` |
| [`knock-verify`](../reference/knock-verify.md) | the `contract` it's made with |
| The Human Club | `CLUB_KNOCK_BINDING=0x…` |

A verifier takes one network. A site that takes both runs a verifier for each, and should remember that the same human can come in once through each.

Never give sites your staging KnockBinding. Staging takes World's Simulator, whose humans anyone can make.
