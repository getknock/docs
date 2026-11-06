---
title: For AI agents
description: These docs as Markdown for assistants and coding agents, and a SKILL.md that teaches an agent to add Knock to a site.
---

Every page here is a Markdown file, and the site serves each one as it is, for assistants and coding agents to read.

## The Knock skill

[`SKILL.md`](../skills/knock/SKILL.md) is an [Agent Skill](https://agentskills.io): instructions a coding agent loads when it's asked to add Knock to a site. It covers the button, a verifier, checking knocks from the server, actions, and tests, and it points the agent at the right reference when it needs one.

| File | What's in it |
| --- | --- |
| [`skills/knock/SKILL.md`](../skills/knock/SKILL.md) | The steps, the rules that matter, and what to check when done. |
| [`skills/knock/reference/api.md`](../skills/knock/reference/api.md) | door-sdk and the verifier's HTTP API, in brief. |
| [`skills/knock/reference/refusals.md`](../skills/knock/reference/refusals.md) | Every `KnockError` code and refusal, and what to show for each. |

### Install it

For Claude Code, put the folder in your project's `.claude/skills/`, and the agent finds it when a task calls for it:

```bash
for f in SKILL.md reference/api.md reference/refusals.md; do
  curl -fsS --create-dirs -o ".claude/skills/knock/$f" "https://docs.getknock.dev/skills/knock/$f"
done
```

Put it in `~/.claude/skills/knock` instead to have it in every project, or copy `skills/knock` from a checkout of `getknock/docs`. Then ask for what you want, such as "Add a Knock button to the sign-up page, and let each human sign up once."

Other agents that read skills take the same folder. For one that doesn't, give it the skill's address, `https://docs.getknock.dev/SKILL.md`, or paste the file in.

## The docs, for reading

| Address | What it is |
| --- | --- |
| [`docs.getknock.dev/llms.txt`](https://docs.getknock.dev/llms.txt) | What Knock is, and a link to every page as Markdown, in reading order. |
| [`docs.getknock.dev/llms-full.txt`](https://docs.getknock.dev/llms-full.txt) | Every page in one file. |
| `docs.getknock.dev/raw/<page>.md` | One page as Markdown, such as [`/raw/quickstart.md`](https://docs.getknock.dev/raw/quickstart.md). The home page is [`/raw/index.md`](https://docs.getknock.dev/raw/index.md). |
| [`docs.getknock.dev/SKILL.md`](https://docs.getknock.dev/SKILL.md) | The skill's `SKILL.md`. Its reference files are under `docs.getknock.dev/skills/knock/`. |

Each page also has **Copy page** at the top, which copies it as Markdown, ready to paste into a chat. The same files are in the `getknock/docs` repo, under `docs/` and `skills/`.
