# vibebook plugin

Claude Code plugin that turns your past AI coding sessions into a
searchable book of decisions, dead ends, and fixes — so future-you
doesn't re-derive what past-you already figured out.

Want to know what you tried last time you debugged a particular crash?
Why you picked one library over another? Whether you've already explored
some idea? Run `/vibebook` once a week to digest your sessions; run
`/vibebook-recall` before any non-trivial task to surface what's
relevant.

Self-contained — no extra CLI, no cloud service, your data stays local.

## Install

```text
/plugin marketplace add june9593/vibebook-plugin
/plugin install vibebook
```

That's it. Open any Claude Code session and run `/vibebook` to digest
your local sessions, or `/vibebook-recall` to surface past notes.

## What it does

- **`/vibebook`** — Walks `~/.claude/projects/...jsonl` and your VS Code
  Copilot Chat history, then digests each session into per-project
  artifacts under `~/.vibebook/session-repo/book/<project>/`:
  - **chronicles** — one per work thread, AI-first frontmatter
    (`files_touched`, `commits`, `decisions`, `blockers`, `next_steps`,
    `status`) plus a 4-section body (Context / What worked / Dead ends
    / Open questions).
  - **topics** — one per subsystem, cross-references the chronicles
    that contributed.

  Auto-detects project from cwd; in non-project dirs it asks before
  doing a full sweep. When [memex](https://github.com/iamtouchskyer/memex)
  is installed, atomic insight cards are delegated to `/memex-retro`.

- **`/vibebook-recall`** — Three-stage progressive recall before new
  work. Stage 1 returns a topic list (~5 KB). Stage 2 (drill into a
  topic) returns chronicle frontmatter without bodies. Stage 3 reads
  the bodies you actually need. Cheap to invoke, fast to navigate,
  designed for AI agents to consume before exploring code.

- **Static-site rendering** (optional) — Run
  `${CLAUDE_PLUGIN_ROOT}/bin/vibebook-plugin.js site serve` to browse
  your book locally as HTML, or `... site build` to produce a
  deployable static site. Uses the bundled Astro template under
  `site-template/`.

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
your devices. Plugin and CLI share the same spool path with
sessionId-keyed entries — install one, both, or neither.

See https://github.com/june9593/vibebook for the npm CLI.

## Files written

- `~/.vibebook/session-repo/raw_sessions/<tool>/<project>/<date>/*.{md,raw.json}` — rendered copies of your sessions
- `~/.vibebook/session-repo/book/<project>/{chronicle,topics}/*.md` — digested book
- `~/.vibebook/session-repo/.vibebook/index.json` — per-session entry index
- `~/.vibebook/session-repo/.vibebook/index.book.json` — chronicle/topic catalog
- `~/.vibebook/.plugin-state.json` — plugin's onboarding state (one-time tip flag)

The plugin **does not** create or modify `.git/` or any of the npm
CLI's config files (`config.json`, `passphrase`, `repo-salt.json`,
`.gitattributes`) — those are owned by the optional npm CLI when
present.

## Repo layout

- `skills/` — `/vibebook` and `/vibebook-recall` skill files (the
  in-session prompts that drive the LLM through digest + recall)
- `commands/` — slash command thin wrappers
- `hooks/` — `Stop` hook that nudges the user to run `/vibebook` at
  end of session
- `bin/vibebook-plugin.js` — bundled CLI invoked by the skills
  (single esbuild output, all deps inlined; not on user PATH)
- `src/` — TypeScript source for the bundled CLI
- `site-template/` — Astro template for the optional local site
- `tests/` — vitest suite covering the bundled CLI; run
  `npm install && npx vitest run` if you're contributing

## Contributing

PRs welcome. Open an issue first for anything beyond a typo or a
small bug fix — design changes touch a written spec and benefit from
discussion before implementation.

## License

MIT
