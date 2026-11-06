---
title: Troubleshooting
description: What to do when the Door won't open, the Wedgie won't answer, the Console can't install Knock, or your verifier turns a knock away. By symptom, and by refusal.
---

Find what you see, below. For the full list of refusals, see [Checks and refusals](reference/checks.md).

## The Door

### The Door doesn't open

`knock()` rejected with `blocked`: the browser stopped the popup.

- Call `knock()` in the click handler itself, before any `await`. Pass the challenge as a promise. [Add a Knock button](guides/knock-button.md#call-knock-from-the-click) shows how.
- If it still happens, the person has blocked popups for your site. Ask them to allow them.

### The Door says to connect the Wedgie

The browser hasn't been given the Wedgie for the Door's origin yet. Press the Door's button, and choose the Wedgie from the browser's list of serial devices. The browser remembers it after that.

If the list is empty, check the cable: some USB cables carry power only.

### "Another tab has the Wedgie"

Only one tab can talk to a Wedgie at a time. The Knock Console or another Door has it. Disconnect it there, or close that tab, then knock again. Your page hears nothing until the Door is closed (`closed`) or the knock times out (`timeout`).

### Knocking doesn't work in Firefox, Safari or on a phone

The Door reaches the Wedgie over Web Serial, which only desktop Chromium browsers have: Chrome, Edge, Brave, Arc and others. Check for it with `'serial' in navigator` and show another way in where it's missing.

### The Door says it can't be used in a frame

The Door never works inside another page. Let door-sdk open it as a popup.

### `bad_origin`

Your page is on `http://` at a host other than `localhost` or `127.0.0.1`. Serve it over https.

## The Wedgie

### `not_enrolled`

The Wedgie has no name, or isn't bound to a human. Its owner sets it up in the Knock Console: the binding, then the name.

### `no_key`

The Wedgie has no Knock key yet. Its owner makes one in the Knock Console.

### `timeout`

Nobody pressed on the Wedgie within 2 minutes, or the whole knock took longer than `timeoutMs`. Knock again.

### `rejected`

Red on the Wedgie: its owner said no. Show nothing, and let them knock again.

### `not_ready`

The Door couldn't talk to the Wedgie: it was unplugged, or went away during the knock. Plug it in, and knock again.

## Installing Knock

### "No green press on the Wedgie"

Red was pressed on FULL CONTROL?, or nothing was pressed for a minute. Nothing changed on the Wedgie. Press Install in the Console again, then green.

### "Your Wedgie said no to this computer before"

After a red press, the Wedgie doesn't ask again until it's unplugged. Unplug it, plug it back in, and install again.

### "The install stopped"

A file didn't copy, or the Wedgie stopped answering. The Wedgie restarts with the app it had, the Console finds it again, and you can install again. If the old app's files had come off first, to make room, the Wedgie has no app until Knock is on it. If the message says to unplug the Wedgie, do that first.

### "The Console couldn't read Knock from getknock/wedgie"

GitHub didn't answer, or the repo's `wedgie.json` breaks wedgie.dev's rules for an app. Try again in a minute.

## Your verifier

### The verifier won't start

It stops with a reason when something it depends on isn't right:

| It says | Do this |
| --- | --- |
| `VERIFIER_ORIGIN: https://host[:port], or http://localhost[:port]` | Set the origin as the browser shows it, with no path and no trailing `/`. |
| `VERIFIER_ETH_RPC is chain <id>, not mainnet` | Point it at an Ethereum mainnet RPC. |
| `VERIFIER_WORLD_RPC is chain <id>, not World Chain` | Point it at a World Chain mainnet RPC, chain 480. |
| `the accepted KnockBinding says it's v<n>, not v3` | Your World Chain RPC is wrong, or out of date. |
| `VERIFIER_STRICT: strict: off, on (safe) or finalized, not <x>` | Use `off`, `on` or `finalized`. |

### The browser says CORS blocked the request

The verifier only answers pages at `VERIFIER_ORIGIN`, exactly. `http://localhost:5173` and `http://127.0.0.1:5173` are different origins, and so are different ports. Set `VERIFIER_ORIGIN` to what's in the address bar, or ask the verifier from your server instead.

### `challenge`

door-sdk couldn't get a challenge: your verifier didn't answer, refused, or answered with something else. Check that it's running, that the page can reach it, and that it isn't `busy`.

## Refusals, by check

### Check 2: `that challenge expired: knock again`

More than 2 minutes passed between your verifier making the challenge and checking the knock. This happens when someone waits on the KNOCK screen, or connects the Wedgie for the first time. Knock again.

### Check 2: `wrong_origin`

The page that knocked isn't at `VERIFIER_ORIGIN`. Compare it with the address bar, port and all. Each origin needs its own verifier.

### Check 3: `records_changing`

The name was set up or changed less than a minute ago. The verifier waits until its records have held for 3 mainnet blocks, about 36 seconds. Knock again in a minute.

### Check 3: `no_name`

The name has no Knock records: it was never named, its owner killed it, or it expired. Its owner sets it up again in the Knock Console.

### Check 3: `revoked`

Its owner revoked it. If this verifier ever saw the key revoked, it refuses that key for good, even after the name is switched back on. That's on purpose: a revoke is meant to stick.

### Check 4: `bad_signature`

The knock wasn't signed by the name's key for your site and challenge. Knocks from a Wedgie through the Door don't do this, so it's someone sending made-up knocks, or a knock changed on the way.

### Check 5: `replayed`

A knock this verifier has seen, or an older one, was sent again. Knock again: a new knock has a higher counter.

### Check 6: `binding_not_final`

Your verifier is strict, and the Wedgie was bound minutes ago. Wait a few minutes, or 20 to 25 for `finalized`, then knock again. Or turn strict mode off: [Strict mode](guides/strict-mode.md) explains the trade.

### Check 6: `no_binding`, `wrong_human`

The binding in `knock.poh` isn't a v3, production binding of this key, for this human and this name. This happens when the binding was made with World ID's Simulator, on an older KnockBinding, or for another name. Its owner binds the Wedgie again in the Knock Console, then names it.

### Check 6: `binding_expired`

The binding's World ID proof is older than `VERIFIER_MAX_BINDING_DAYS`. Its owner binds the Wedgie again.

### Check 8: `already_entered`

This human has done this action on your site. That's the action working. To let them do something again, use a new action name.

### `unavailable`

The verifier couldn't read mainnet (check 3) or World Chain (check 6). Public RPCs limit how often you can call them, so use your own. Knock again.

### `busy`

The verifier's limits: 600 challenges and 600 checks an hour per process, and 10,000 challenges outstanding at once. They're fixed for now, so wait and knock again. Don't spread one origin over several verifiers with their own databases: a challenge from one fails at another, and each would count entries on its own.
