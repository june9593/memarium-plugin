# Changelog

## 0.1.2 — 2026-05-13

True plugin autonomy. v0.1.0/v0.1.1 shipped with two ship-blocking gaps:

1. The bundled CLI (`bin/vibebook-plugin.js`) was gitignored as a build
   artifact, but Claude Code marketplace install is `git clone` only
   (no `npm install`, no `npm run build`) — so users got an empty
   `bin/` directory and could not run any subcommand.
2. `scan-and-import` only copied raw jsonl into the spool. It did NOT
   render `.md` + `.raw.json` and did NOT write `.vibebook/index.json`
   entries. Downstream `prepare` reads `index.json` and per-session
   files, so it always returned empty for plugin-only users.

### Fixed

- **`bin/vibebook-plugin.js` is now committed to git** as a single
  esbuild-bundled file (~370 KB, all deps inlined including commander,
  zod, simple-git, chalk). Marketplace clone ships a runnable binary
  out of the box. `dist/` stays gitignored.
- **`scan-and-import` rewritten** to mirror npm sync's writer chain:
  `discover → load → hasUnchanged → writeSession → upsertEntry →
  saveIndex`. New `src/spool/writer.ts` is a sync-marked fork of
  npm `src/writer.ts`. Spec §4 ownership table updated: `index.json`
  and `raw_sessions/` are now co-owned by plugin AND npm sync (safe
  because both upsert by `tool:sessionId`).
- **Integration test gates autonomy.** New
  `tests/integration/plugin-autonomy.test.ts` runs orchestrate →
  list-projects → prepare on a fresh machine with no `~/.vibebook/`
  and no npm CLI on PATH. If it ever fails, autonomy is broken.

### Spec changes

- New: `docs/superpowers/specs/2026-05-13-vibebook-split-design-patch1.md`
  (supersedes specific paragraphs of the original design spec).

## 0.1.1 — 2026-05-13

Plugin autonomy patch. v0.1.0 inherited a hard `readConfig()` requirement
from `_shared/config.ts` — every plugin command threw "vibebook not
initialized" if `~/.vibebook/config.json` was missing. That contradicted
spec §4 ("plugin works on a plain spool directory, no config needed").

### Fixed

- New `src/spool/plugin-config.ts` exports `readPluginConfig()`, a
  tolerant wrapper that returns a sensible default Config (repoPath =
  `~/.vibebook/session-repo`) when no config file is present.
- All 6 plugin commands (`prepare`, `publish`, `recall`, `catalog-regen`,
  `list-projects`, `site`) switched from `readConfig` → `readPluginConfig`.
- Plugin still does NOT write `~/.vibebook/config.json` — that stays a
  npm `vibebook init` job. If you later install npm vibebook and run
  `vibebook init`, your config will be created cleanly without prompts.
- Tests: `tests/spool/plugin-config.test.ts` (3 cases). Suite now 19/19.

## 0.1.0 — 2026-05-12

Initial release. Spun out from `vibebook` npm package
([june9593/vibebook](https://github.com/june9593/vibebook)) so the
plugin is independently installable from the Claude Code marketplace.

### What's in this release

- `/vibebook` skill — project & global mode digest with memex hand-off
- `/vibebook-recall` skill — three-stage progressive recall
- Self-contained: scans `~/.claude/projects/` directly, no external CLI required
- One-time first-run nudge mentions the optional `vibebook` npm CLI for cross-device sync
- Stop hook reminder to run `/vibebook` after each session

### Compatibility

- `~/.vibebook/session-repo/` schema unchanged from `vibebook` 0.4.x
- Both this plugin and `vibebook` npm 0.4.x can coexist on one machine; they read/write disjoint subpaths
- When `vibebook` npm 0.5.0 ships (Phase 2), it will drop the digest/recall commands; users will use this plugin instead

### Notes for `vibebook` 0.4.x users

If you have the npm `vibebook` CLI installed, your existing data
keeps working. You can install this plugin alongside it. Once `vibebook`
0.5.0 ships, the plugin will be your only path to digest + recall;
the npm CLI will be sync-only.
