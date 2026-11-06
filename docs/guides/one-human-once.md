---
title: One human, once
description: Actions let each human do something on your site once, such as enter, vote or claim, however many Wedgies they own.
---

A knock that passes tells you a real human is there. An **action** tells you whether that human has done something on your site before. Name an action when you send a knock to be checked, and check 8 lets each human do it once.

```json
{ "assertion": { "…": "the knock" }, "action": "enter" }
```

## How check 8 counts

The verifier counts humans by the human's **nullifier**, not by Wedgie or by name. One human gets one nullifier from Knock's World ID action, and every Wedgie they bind carries it. So a human who owns three Wedgies, under three names, still does each action once.

When every other check has passed, the verifier records the action and nullifier in the same transaction that uses up the challenge. A knock that's refused at any check uses up nothing, and doesn't count as the human's turn.

The second time the same human knocks for the same action, check 8 refuses it:

```json
{ "ok": false, "check": 8, "error": "already_entered", "why": "this human has done enter here already" }
```

## Naming actions

An action is 1 to 32 characters of `a`–`z`, `0`–`9` and `-`. Anything else is refused at check 1. Pick names for what people do, and keep them stable:

| Action | Once means |
| --- | --- |
| `enter` | One entry per human, ever |
| `vote-2026-budget` | One vote per human in this poll |
| `claim-launch-drop` | One claim per human for this drop |
| `signup` | One account per human |

Actions are counted per verifier, so per origin. `enter` on your site and `enter` on someone else's are separate.

To start an action over, say for a new poll, use a new name. There's no way to clear an action through the API.

## Without an action

Leave `action` out, and check 8 doesn't run. The same human can come in as often as they knock. Each knock still needs its own challenge and a higher counter, so none can be replayed. Use this when you want to know that a human is here now, and not whether they've been here before. For example:

- before posting a comment, or sending a message;
- to slow down sign-ups, alongside your own limits;
- to step up an existing session before something sensitive.

## Keeping track yourself

The verifier answers with the knock that got in, including `nullifier`:

```json
{
  "ok": true,
  "knock": {
    "name": "wedgie.itzraj.eth",
    "key": "0x02…",
    "nullifier": "0x1f…",
    "counter": 12,
    "origin": "https://club.example",
    "binding": { "tx": "0x…", "block": 37301500, "provedAt": 1793860000 }
  }
}
```

To tie your own records to a human, such as an account or an allowance, key them by `nullifier`. Don't key them by `name` or `key`: one human can have several Wedgies, and can kill a name and set up the Wedgie again under another.

> [!IMPORTANT]
> The nullifier is public. It's in the name's ENS records, and it's the same on every site that uses Knock. Treat it as an identifier for a human that others can see, and don't show it next to anything you'd keep private. [Security](../security.md) says more.

## What once doesn't stop

- **A human who lends their Wedgie.** Knock knows a Wedgie is bound to a human, and that someone pressed it. It can't know who pressed.
- **Your other verifiers.** Each one keeps its own entries, so staging and production, or two origins, count separately.
- **A lost database.** Entries live in the verifier's SQLite file. [Run a verifier](verifier.md#its-database) says what to back up.
