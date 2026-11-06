---
title: Knock docs
description: Let one real human in, once. Add a Knock button to your site with door-sdk, and check each knock with a verifier you run.
---

Knock lets a site let in a real person, once, with no account, form or captcha. The person owns a **Wedgie**: a small USB device with a screen and two buttons, whose key is bound to their World ID on World Chain and named in ENS. When they knock on your site, the Wedgie shows your site's address, they press green, and your verifier checks what the Wedgie signed against ENS and World Chain.

You add two things to your site:

- **A Knock button**, with [`@knock-dev/door-sdk`](reference/door-sdk.md). Its one function, `knock()`, opens Knock's Door and hands back what the Wedgie signed.
- **A verifier**, [`knock-verifier`](guides/verifier.md): a small Rust service beside your site. It gives out challenges and checks each knock, eight checks in order. If your server is in Rust, you can embed the same checks with the [`knock-verify`](reference/knock-verify.md) crate instead.

## What a knock tells you

A knock that passes your verifier tells you that, just now, on your site:

- someone pressed green on a Wedgie whose key is in ENS under a name, such as `wedgie.itzraj.eth`;
- the Wedgie signed your challenge, for your origin, with a counter higher than in any knock of its you've seen;
- the name is switched on, so its owner hasn't revoked it or killed it;
- that key is bound on World Chain to one human, proven with World ID;
- if you asked, this human hasn't done this action on your site before.

It doesn't tell you who the person is. You get the Wedgie's name and the human's **nullifier**: a number that is the same for one human everywhere Knock is used, and that says nothing else about them. [How a knock works](how-it-works.md) goes through each step.

## The parts

| Part | What it does | In the repo |
| --- | --- | --- |
| `@knock-dev/door-sdk` | The browser side. `knock()` opens the Door and resolves with the knock. One TypeScript file, no dependencies. | [`packages/door-sdk`](https://github.com/getknock/knock/blob/main/packages/door-sdk/src/index.ts) |
| `knock-verifier` | Your verifier: `POST /challenge`, `POST /verify` and `GET /health`, with SQLite for what's been used. | [`server/verifier`](https://github.com/getknock/knock/blob/main/server/verifier/src/main.rs) |
| `knock-verify` | The checks themselves, as a Rust library, for your own server. | [`crates/knock-verify`](https://github.com/getknock/knock/blob/main/crates/knock-verify/src/lib.rs) |
| The Door | Knock's popup at `/knock`. It talks to the Wedgie over USB, from the browser. | [`apps/door`](https://github.com/getknock/knock/blob/main/apps/door/app/knock/Door.tsx) |
| The Knock Console | Where a person sets up their Wedgie: its name, its binding, and its records in ENS; and the kill switch. Sites never call it. | [`apps/door`](https://github.com/getknock/knock/blob/main/apps/door/app/console/Console.tsx) |
| `@knock-dev/protocol` | The messages a Wedgie signs (EIP-712), key helpers, and test vectors. | [`packages/protocol`](https://github.com/getknock/knock/blob/main/packages/protocol/src/index.ts) |
| The Human Club | A demo site: a Knock button, a verifier, one entry per human. | [`apps/bouncer`](https://github.com/getknock/knock/blob/main/apps/bouncer/app/Club.tsx) |

## Where Knock is today

Knock is new. Read this before you plan around it:

- **Nothing is published yet.** The repo, `getknock/knock`, is private, every package is at 0.1.0, door-sdk isn't on npm and knock-verify isn't on crates.io. The [quickstart](quickstart.md) uses a checkout.
- **The Door runs locally**, at `http://localhost:3000`, and door-sdk opens it there unless you pass `door`. A hosted Door comes later.
- **Knocking needs a desktop Chromium browser**, such as Chrome, Edge, Brave or Arc. The Door reaches the Wedgie over Web Serial, which Firefox, Safari and phones don't have.
- **Only one kind of binding counts**: those made on KnockBinding v3's production deployment on World Chain. Bindings from World ID's Simulator (staging) never count.
- **One mode.** Mode 1, Bound, takes the human from the Wedgie's binding. Mode 2, Fresh, a new World ID proof with each knock, isn't offered.
- **The nullifier is public.** It sits in the name's ENS records, so two sites can tell that the same human knocked on both. [Security](security.md) says what follows from that.

## Start here

- New to Knock? The [quickstart](quickstart.md) gets a button and a verifier working in about fifteen minutes.
- Adding Knock to a real site? Read [Add a Knock button](guides/knock-button.md), then [Run a verifier](guides/verifier.md).
- Want each human in once? [One human, once](guides/one-human-once.md).
- A knock bounced? [Troubleshooting](troubleshooting.md) and [Checks and refusals](reference/checks.md).
- Using a coding agent? Point it at [`SKILL.md`](agents.md).
