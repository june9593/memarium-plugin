# Changelog

## 0.1.4 — 2026-05-13

`scanAndImport` only walked Claude Code's `~/.claude/projects/`, silently
ignoring VS Code Copilot Chat. The README and the npm sync CLI both
support both sources; the plugin's autonomy refactor in 0.1.2 dropped
Copilot by accident (single-adapter loop).

### Fixed

- `src/spool/scan-and-import.ts` now scans both `ClaudeCodeAdapter` and
  `VSCodeCopilotAdapter` in sequence, mirroring npm `sync.ts:75-78`.
- Users on machines with mostly Copilot session history (and few /no
  Claude Code sessions) will now see those sessions imported into the
  spool and digestible by `/vibebook`.

### Note for plan/spec

The original 0.1.2 plan T5 only mentioned `ClaudeCodeAdapter`; the spec
patch correctly listed `vscode-copilot.ts` under shared infra (T3) but
didn't enforce that scan-and-import use it. The autonomy integration
test (T7) only planted Claude Code jsonl, so the gap wasn't caught.
0.1.5+ should add a Copilot fixture to the autonomy test.

## 0.1.3 — 2026-05-13

Marketplace name change to avoid collision with the npm `vibebook` repo
(`june9593/vibebook`), which historically also registered itself as a
Claude Code marketplace named `vibebook`.

### Changed

- `marketplace.json` top-level `name`: `vibebook` → `vibebook-plugin`.
- `plugin.json` `name` stays `vibebook` (so users still type `/vibebook`
  and `/vibebook-recall`; no command-name change).

### Migration (if you already installed v0.1.0–v0.1.2 from this repo)

The marketplace name change means Claude Code will treat this as a new
marketplace registration. Cleanest path:

```text
/plugin marketplace remove vibebook
/plugin marketplace add june9593/vibebook-plugin
/plugin install vibebook
```

If you ALSO have the legacy `june9593/vibebook` (npm CLI's plugin
descriptor) registered, remove that too:

```sh
rm -rf ~/.claude/plugins/marketplaces/vibebook ~/.claude/plugins/cache/vibebook
```

Then re-add only the new repo.

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
