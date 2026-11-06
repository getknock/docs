# Every way a knock fails, and what to show

## Contents

- KnockError codes, from `knock()`
- Verifier refusals, from `POST /verify`, by check
- The verifier's own trouble

## KnockError codes

`knock()` rejects with a `KnockError` when there's no knock. Show its `message` unless the row says otherwise.

| `code` | From | Meaning | Show or do |
| --- | --- | --- | --- |
| `blocked` | door-sdk | The popup didn't open | Ask to allow popups. Make sure `knock()` runs in the click, before any `await`. |
| `closed` | door-sdk | The Door was closed first | Nothing |
| `timeout` | door-sdk | `timeoutMs` passed (3 minutes) | The message |
| `challenge` | door-sdk | The challenge's promise failed, or isn't `0x` and 64 hex digits | "Knock is unavailable right now", and log it: the verifier is down or busy |
| `refused` | door-sdk | The Door said no without a code | The message |
| `rejected` | Door | Red on the Wedgie | Nothing |
| `timeout` | Door | No press within 2 minutes | The message |
| `not_enrolled` | Door | No name, or not bound to a human | The message: it points to the Knock Console |
| `not_ready` | Door | The Door couldn't talk to the Wedgie | The message |
| `bad_origin` | Door | The page isn't `https://` (or `localhost`, `127.0.0.1`) | Fix the deployment |
| `bad_request` | Door, Wedgie | Wrong challenge or mode, or the Wedgie couldn't read the request | Pass the verifier's challenge as it is, and no `mode` |
| `bad_signature` | Door | The Wedgie's knock didn't hold, so nothing was sent | The message; let them retry |
| `no_key` | Wedgie | No Knock key yet | The message |

The Door also passes other Wedgie codes through. If another tab (like the Knock Console) has the Wedgie, the Door says so in its own window and the page hears nothing until `closed` or `timeout`.

## Verifier refusals

`{ ok: false, check, error, why }`. The first failing check answers; nothing is used up. Show `why`, except where the row says otherwise.

| Check | `error` | Meaning | Show or do |
| --- | --- | --- | --- |
| 1 | `bad_assertion` | Malformed body, assertion or action (status 400) | Log it; "Something went wrong. Try again." |
| 2 | `bad_challenge` | Unknown, used, or expired (over 120 s) challenge | "Knock again" |
| 2 | `wrong_origin` | The page isn't at `VERIFIER_ORIGIN` | Fix `VERIFIER_ORIGIN`: exact scheme, host and port |
| 2 | `busy` | 10,000 challenges outstanding (429) | Try again later |
| 3 | `no_name` | No Knock records: never named, killed or expired | `why` |
| 3 | `revoked` | Its owner revoked it, or this verifier saw the key revoked before | `why` |
| 3 | `not_knock` | `knock.v` isn't `1` | `why` |
| 3 | `records_changing` | Records changed in the last 3 blocks (~36 s) | `why`: knock again in a minute |
| 3 | `not_active` | `knock.status` isn't `active` | `why` |
| 3 | `bad_records` | A malformed `knock.key`, `knock.nullifier` or `knock.poh` | `why` |
| 3 | `unavailable` | Mainnet couldn't be read (503) | Try again |
| 4 | `bad_signature` | Not signed by the name's key, for this site and challenge | Treat as an attempt |
| 5 | `replayed` | The Wedgie's counter didn't rise | "Knock again" |
| 6 | `bad_assertion` | A non-zero `humanRef` in mode 1 | Log it |
| 6 | `wrong_human` | The knock's nullifier isn't the name's | `why` |
| 6 | `no_binding` | `knock.poh` isn't a v3 production binding for this key, human and name | `why`: set up again in the Knock Console |
| 6 | `binding_not_final` | Strict, and the binding is too new | `why`: it says how long to wait |
| 6 | `binding_expired` | The binding's proof is older than `VERIFIER_MAX_BINDING_DAYS` | `why`: bind again |
| 6 | `unavailable` | World Chain couldn't be read (503) | Try again |
| 7 | `mode_unsupported` | Mode 2 | Use mode 1 |
| 8 | `already_entered` | This human has done this action here | "You've already done this" |

## The verifier's own trouble

| Check | `error` | Meaning | Status |
| --- | --- | --- | --- |
| 0 | `busy` | Hourly limits: 600 challenges, 600 checks | 429 |
| 0 | `internal` | Its SQLite store failed | 500 |
