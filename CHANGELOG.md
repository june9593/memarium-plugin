# Changelog

## 0.1.8 — 2026-05-13

Three quality-of-life fixes targeting AI dogfood friction:

### `${CLAUDE_PLUGIN_ROOT}` is not in in-session Bash

In-session Bash never has `${CLAUDE_PLUGIN_ROOT}` set — it's only
populated for hook subprocesses. AI was tripping on zsh quoting like
`CLAUDE_PLUGIN_ROOT=... $CLAUDE_PLUGIN_ROOT/bin/...` (zsh expands
the var BEFORE the assignment, so it resolves to empty + `/bin/...`).

**Fixed:** SKILL.md now starts with "Step −1": discover plugin path via
`VBP=$(ls -td ~/.claude/plugins/cache/vibebook/vibebook/*/bin/vibebook-plugin.js | head -1)`
and use `"$VBP" <subcommand>` everywhere. All 30+ `${CLAUDE_PLUGIN_ROOT}/bin/...`
occurrences in skills/ replaced with `"$VBP"`.

### Memex detection moved into `orchestrate` JSON

SKILL.md had `command -v memex` lines that AI generalized into
also checking `command -v vibebook` (a binary that doesn't and
shouldn't exist for plugin-only users — it's the npm-CLI sibling
product). Each false-positive PATH check produced a confusing red
exit-1 in the user's transcript.

**Fixed:** `orchestrate` now runs `command -v memex` itself and emits
`"memexInstalled": <bool>` in its JSON output. SKILL.md tells AI to
read the field and explicitly NOT to issue its own PATH checks.

### Subagent fan-out can silently degrade

If user's Claude Code config gives subagents zero Bash/Write
capability (not just missing path approval), the existing warm-up
doesn't help — agents silently complete without doing the work, AI
waits 5 minutes, then has to restart everything inline.

**Fixed:** SKILL.md P3 (fan-out section) now requires a single-agent
**probe** before dispatching N agents: write a literal string to
`/tmp/vb-<project>/probe.txt` and verify from main session. If the
probe fails, fall back to inline writing immediately and tell the
user once. Costs ~20 sec; saves 5+ min of confused fallback.

No code changes to the data model or spool layout; bin and tests
unchanged in behavior beyond the new `memexInstalled` field.

## 0.1.7 — 2026-05-13

`publish` and `catalog-regen` were silent on success. AI calling them
had no positive signal that work landed; one transcript showed AI
deducing success only by reissuing publish and seeing "already exists"
errors on the second call — fragile, and breaks if the first call
partially failed.

### Fixed

- `publish` now prints its `PublishReport` JSON to stdout on completion.
  Includes `chroniclesInserted`, `topicsInserted/Updated`, `committed`,
  `pushed`. Previously: empty stdout, AI inferred state from rerun behavior.
- `catalog-regen` now prints its `CatalogRegenReport` JSON the same way.
  Includes `written` (paths regenerated), `committed`, `pushed`.

Both changes are pure addition — same code paths, just emit a structured
success signal at the end. No CLI flag needed; output is always present.

## 0.1.6 — 2026-05-13

`SKILL.md` text still carried npm-CLI-era assumptions ("User has
already run vibebook sync...") that pushed in-session Claude into
checking PATH for the `vibebook` binary and reporting "vibebook CLI
isn't installed" before the plugin's own `orchestrate` step could
even run. The actual CLI invocations were correct (already used
`${CLAUDE_PLUGIN_ROOT}/bin/vibebook-plugin.js`); the bug was in
the natural-language framing.

### Fixed (skills/vibebook/SKILL.md + skills/vibebook-recall/SKILL.md)

- Removed "User has already run `vibebook sync`" prerequisite. Plugin
  is self-contained — `orchestrate` scans local jsonl on every run.
- Removed `${CLAUDE_PLUGIN_ROOT}/bin/vibebook-plugin.js --version`
  "is on PATH" line — implementation detail, not a precondition.
- Reworded prepare's "no synced sessions" error guidance: don't tell
  the user to "run `vibebook sync`" (npm CLI command they may not
  have); instead help them check cwd or use `--project`.
- Recall skill prologue: "the vibebook plugin has captured every..."
  instead of "`vibebook sync` has captured every...".
- Dropped a stray "Wizard already covered that path in `vibebook init`"
  parenthetical — npm-init wizard is not part of plugin install flow.

No code changes. Bundle byte-identical except for embedded version.

## 0.1.5 — 2026-05-13

Test-only patch. The autonomy gate now also covers VS Code Copilot Chat.
0.1.4's missing-Copilot-adapter regression slipped past tests because
the autonomy fixture only planted Claude Code jsonl. Catch that class
of bug going forward.

### Tests added

- `tests/integration/plugin-autonomy.test.ts` — new case: plant 1 Claude
  Code session + 1 Copilot Chat session (legacy `chatSessions/<id>.json`
  format under `~/Library/Application Support/Code/User/workspaceStorage/<hash>/`),
  run orchestrate, assert both end up in spool with correct `tool` tags
  in `index.json`.
- Total: 22 tests pass (was 21).

No code change. Bundle byte-identical except for embedded version string.

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
