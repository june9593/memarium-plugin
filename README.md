# vibebook plugin

Claude Code plugin that digests your AI coding sessions into per-project
**chronicles** + **topics**, then helps you **recall** them before new
work. Standalone — no extra CLI required.

## Install

```text
/plugin marketplace add june9593/vibebook-plugin
/plugin install vibebook
```

That's it. The next time you open a Claude Code session, you can run
`/vibebook` to digest your local sessions and `/vibebook-recall` to
surface past notes.

## What it does

- **`/vibebook`** — Digest your synced sessions into chronicle + topic
  artifacts under `~/.vibebook/session-repo/book/<project>/`. Auto-detects
  project from cwd (project mode) vs full sweep (global mode, asks
  before doing). When [memex](https://github.com/iamtouchskyer/memex)
  is installed, atomic cards are delegated to `/memex-retro`.
- **`/vibebook-recall`** — Three-stage progressive recall before new
  work: list topics → drill into one → read matching chronicle bodies.

The plugin reads `~/.claude/projects/...jsonl` directly. No external
service, no separate sync needed.

## Cross-device sync (optional)

To carry your sessions across multiple machines, install the optional
**vibebook** npm CLI:

```sh
npm i -g vibebook
vibebook init
```

It syncs `~/.vibebook/session-repo/` to a private GitHub repo across
your devices. Plugin and CLI share the same spool path under a
documented protocol — install one, both, or neither.

See https://github.com/june9593/vibebook for the npm CLI.

## Files written

- `~/.vibebook/session-repo/raw_sessions/<project>/<sessionId>.jsonl` — copies of your sessions
- `~/.vibebook/session-repo/book/<project>/{chronicle,topics}/*.md` — digested book
- `~/.vibebook/.plugin-state.json` — plugin's own onboarding state (one-time tip flag)

The plugin **does not** create or modify `.git/` or `.vibebook/index.*`
— those are owned by the optional npm CLI when present.

## Spec & roadmap

Design spec: `docs/superpowers/specs/2026-05-12-vibebook-split-design.md` in the
companion `vibebook` repo.

## License

MIT
