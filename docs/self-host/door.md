---
title: Host the Door
description: The Door is static files. Build it, serve it on HTTPS, and point door-sdk at it with one option.
---

The Door is the popup door-sdk opens when someone knocks. It talks to the Wedgie over Web Serial, hands it your challenge and your origin, and hands back what the Wedgie signed. It calls no server and holds no keys, so any static host can serve it.

Knock's is at `https://door.getknock.dev`, and door-sdk opens it unless told otherwise. You might host your own to keep Knock's machines out of the path of your knocks, or to serve it from your own domain.

## Build it

From a checkout of `getknock/knock`:

```bash
bun install
cd apps/door
bun run build
```

`apps/door/out/` is now the whole site: the Door at `/knock`, and the [Console](console.md) at `/`, from one build. Serve both or only the Door: the Door doesn't need the Console.

## Serve it

Put `out/` on any static host that serves HTTPS:

- **Vercel**: import your copy of `getknock/knock` and set the project's Root Directory to `apps/door`. [`apps/door/vercel.json`](https://github.com/getknock/knock/blob/main/apps/door/vercel.json) sets the rest: the install at the repo's root, then `bun run build`.
- **Netlify or Cloudflare Pages**: set the project's root to `apps/door`, the build command to `bun run build`, and the output folder to `out`.
- Each of them serves `/knock` from `knock.html` as it is.
- **Your own server**: copy `out/` there and have `/knock` serve `knock.html`. With nginx, `try_files $uri $uri.html $uri/ =404;` in the site's `location /`.

It must be HTTPS, because browsers only offer Web Serial to secure pages. `http://localhost` counts as secure, for development.

Knock serves its Door and its Console from one Vercel project with two domains, `door.getknock.dev` and `getknock.dev`. `vercel.json` sends `door.getknock.dev/` to the Console, so each address shows one thing.

## Point door-sdk at it

door-sdk opens `/knock` at the address you give it as `door`:

```ts title="knock-button.ts"
import { knock } from '@knock-dev/door-sdk'

declare const challenge: `0x${string}`

export const assertion = await knock({ challenge, door: 'https://door.club.example' })
```

That's the only change. door-sdk sends its request to that origin only, and listens to the popup it opened, at that origin, and to nothing else.

## What changes for people who knock

- **Their browser asks again for the Wedgie's port.** Web Serial permission is per site, so the first knock through a new Door asks them to pick the Wedgie, as the first knock through any Door does.
- **Their knocks are the same.** The Wedgie signs your origin, not the Door's, and your verifier never learns which Door was used.

## Serve the Door as it's built

The Door tells the Wedgie which site is asking. Knock's Door takes that from the browser, the origin of the page that opened it, never from anything the page says. A Door changed to lie could ask a Wedgie to knock for another site, and the only thing that would stop it is the person reading the Wedgie's screen before pressing green.

So serve the Door built from Knock's code, unchanged, and say whose Door it is: people should know whose page they're giving the Wedgie's port to. The [security](../security.md) page has more on what the Wedgie's screen is for.
