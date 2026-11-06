---
title: Host the Human Club
description: The Human Club is a Next.js app with a libSQL database. Run it on Vercel with Turso, or on any server that runs Node.
---

The Human Club is Knock's demo site: petitions and fundraisers where every name is a human's, each signing once. It's [`apps/bouncer`](https://github.com/getknock/knock/tree/main/apps/bouncer) in `getknock/knock`, a Next.js app that checks knocks in its own functions with [`@knock-dev/verify`](../guides/verify-in-your-server.md) and keeps its records in a libSQL database. A copy of your own is a whole club of its own, with its own petitions, fundraisers and members.

## What you need

- A checkout of [`getknock/knock`](https://github.com/getknock/knock) and [Bun](https://bun.sh).
- **A database**: a [Turso](https://turso.tech) database for Vercel or any host that runs more than one copy of the club, or a SQLite file on a server that runs one.
- **An origin** for it, such as `https://club.example`, served on HTTPS.

## Try it on your machine

```bash
bun install
cd apps/bouncer
bun run dev
```

The club is at `http://localhost:3001` and keeps its records in `human-club.db` beside it. Knocks go through the Door at `http://localhost:3000`: run the Console and Door's dev server too (`bun run dev` in `apps/door`), or set `NEXT_PUBLIC_DOOR` to a Door that's up.

## On Vercel, with Turso

1. **Make the database.** With the [Turso CLI](https://docs.turso.tech/cli/installation), signed in:

   ```bash
   turso db create human-club
   turso db show human-club --url      # libsql://…
   turso db tokens create human-club   # its token
   ```

   The club makes its tables itself, the first time it opens the database.

2. **Make the project.** In Vercel, import your copy of `getknock/knock`, then set:

   | Field | Value |
   | --- | --- |
   | Root Directory | `apps/bouncer` |
   | Framework | Next.js |
   | Install Command | `cd ../.. && bun install` |
   | Build Command | `bun run build` |

   The install runs at the repo's root because the club uses Knock's packages from the same workspace.

3. **Set its environment variables**, for Production: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from step 1, `CLUB_ORIGIN` set to the club's address, and `NEXT_PUBLIC_DOOR` to the Door's. The rest are in [Settings](#settings).

4. **Deploy**, then add your domain to the project. If the domain changes, change `CLUB_ORIGIN` with it and deploy again.

Preview deployments have addresses of their own, and the club takes knocks only for `CLUB_ORIGIN`. To try one, give previews a domain in Vercel, set `CLUB_ORIGIN` to it for the Preview environment, and give them a database of their own, so tests stay out of the real club.

## On your own server

```bash
bun install
cd apps/bouncer
NEXT_PUBLIC_DOOR=https://door.example bun run build
CLUB_ORIGIN=https://club.example \
TURSO_DATABASE_URL=file:/var/lib/human-club/club.db \
PORT=3001 \
bun run start
```

Put it behind a proxy that serves HTTPS, as for [knockd](knockd.md#put-it-behind-https), and keep it running with systemd or the like. A SQLite file works for one copy of the club. If you run more than one, they must share a database: use Turso, with `libsql://…` and its token.

## Settings

`NEXT_PUBLIC_` settings are read when the club is built. The rest are read when it runs.

| Setting | Default | What it does |
| --- | --- | --- |
| `CLUB_ORIGIN` | none: needed in production | The club's origin, exactly as browsers send it, such as `https://club.example`. Wedgies sign for it, and the club takes no knock signed for another. In development, the address the request came to. |
| `TURSO_DATABASE_URL` | `file:human-club.db` | The database: `libsql://…` for Turso, or `file:…` for a SQLite file. Needed on Vercel. |
| `TURSO_AUTH_TOKEN` | none | Turso's token for that database. |
| `NEXT_PUBLIC_DOOR` | `http://localhost:3000` | The Door knocks go through: Knock's, or [your own](door.md). |
| `CLUB_ETH_RPC` | `https://ethereum-rpc.publicnode.com` | A mainnet RPC: for ENS, and to check gifts. |
| `CLUB_WORLD_RPC` | `https://worldchain-mainnet.g.alchemy.com/public` | A World Chain RPC: for bindings. |
| `CLUB_STRICT` | `off` | Whether a binding must be final first: `off`, `on` (safe) or `finalized`. [Strict mode](../guides/strict-mode.md) explains. |
| `CLUB_MAX_BINDING_DAYS` | `365` | How old a binding's World ID proof may be, in days. |
| `CLUB_KNOCK_BINDING` | Knock's | The KnockBinding whose bindings count. Only for [a network of your own](own-network.md). |

Use your own RPCs for a club people use: the public ones are rate-limited, and the checks believe what they say. [Its RPCs](../guides/verifier.md#its-rpcs) says more.

## What it keeps

For each human who has knocked: their nullifier, their Wedgie's name, and when they came. Then what they started, signed and gave, with their name beside it only where they chose to show it, and the gifts' transactions. A session is a random token in a cookie, which the club keeps only as a hash, for two weeks.

Nothing else: no email addresses, no IP addresses, no analytics. Whoever holds the database can see which nullifier did what, so keep its token as you'd keep a password.
