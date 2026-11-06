# Knock docs

The docs for [Knock](https://github.com/getknock/knock), served at getknock.dev: adding a Knock button to a site, running a verifier beside it, and what each check means; references for door-sdk, the verifier's HTTP API, knock-verify and the protocol; and a skill that teaches coding agents to do the same.

- `docs/`: the pages, in Markdown. They read as they are on GitHub.
- `skills/knock/`: the Agent Skill, `SKILL.md` and its two references.
- `app/`, `components/`, `lib/`: the site, a Next.js static export.

## Run it

```bash
bun install
bun run dev        # http://localhost:3002
```

## Test it

The tests hold the docs to Knock's code: the verifier's settings and refusals, door-sdk's and the Door's codes, knock-verify's public items, and every link. They read a checkout of `getknock/knock` beside this one (`../knock`), or wherever `KNOCK_DIR` points.

```bash
bun test
bun run typecheck
```

## Build it

```bash
bun run build      # the whole site, as files, in out/
```

`out/` is plain files, for any static host.
