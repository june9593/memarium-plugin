# Changelog

## 0.1.11 — 2026-05-13

Pre-opensource documentation cleanup. No behavior changes.

### Changed

- **README.md**: rewritten to lead with the user-facing problem
  ("don't re-derive what past-you figured out") instead of jumping
  to "digests sessions into chronicles". Added a `## Repo layout`
  section describing what each top-level dir is for, including
  `site-template/` (Astro template for `site serve / build`) and
  `tests/` (vitest suite for contributors).
- **CHANGELOG**: dropped private references — internal "Phase 2" /
  "spec §4" / "docs/superpowers/specs/..." mentions and a forward-
  looking note about an unshipped npm v0.5.0 release. Outside readers
  shouldn't need a private vocabulary to read the changelog.
  Also collapsed 0.1.1–0.1.9 (rapid dogfood iteration) into a single
  summary block; 14 KB → 5.7 KB.
- **`.npmignore`**: added a comment explaining why it's `*` (this
  package is marketplace-only, never published to npm).
- **Removed `bin/.gitkeep`**: leftover scaffolding from when bin/
  was empty; obsolete since `bin/vibebook-plugin.js` is committed.

## 0.1.10 — 2026-05-13

`vibebook-recall` skill description rewritten to defeat the
"I'll just `git log --grep`" reflex AI falls into for retrospective
questions like "之前是怎么解的". Real dogfood case (2026-05-13):
user asked "fullscreen bookmark crash 之前是怎么解的", AI ran
`git log --grep="fullscreen" --grep="bookmark"` and never invoked
recall — finding commit messages but missing the chronicle's "what
didn't work / why we picked X over Y" context.

### Changed (`skills/vibebook-recall/SKILL.md` description)

- "Use this EVEN when you can grep" → "**Use this BEFORE
  `git log --grep`**" (specific reflex to override).
- Added Chinese trigger phrases: "之前是怎么解的", "上次怎么处理的",
  "以前遇到过吗" — equivalent English phrases were already there
  but cross-language matching is unreliable.
- Added explicit anti-pattern callout: jumping to git log for
  "how was X solved" finds commit messages but drops the conversation
  context where the user explained what didn't work.
- Sequenced: "Run stage 1 FIRST; if no topic matches, *then* fall
  back to git" — earlier description left ordering ambiguous so AI
  read "git is faster" subtext.

No code change; description-only patch on the recall skill.

## 0.1.1–0.1.9 — 2026-05-13

Rapid dogfood iteration shaking out the plugin's autonomy. Highlights,
in landing order:

- **0.1.1**: tolerant `readPluginConfig()` so plugin commands don't
  require `~/.vibebook/config.json` to exist.
- **0.1.2**: bundled `bin/vibebook-plugin.js` committed to git
  (marketplace install is `git clone` only — no `npm install`); rewrote
  `scan-and-import` to render `.md` + `.raw.json` and update
  `index.json` so downstream `prepare` actually finds sessions; added
  the autonomy gate test.
- **0.1.3**: marketplace renamed `vibebook` → `vibebook-plugin` to
  coexist cleanly with the npm `vibebook` repo's own marketplace
  descriptor. Plugin name stays `vibebook` so user-facing slash
  commands are unchanged.
- **0.1.4**: scan now walks both Claude Code AND VS Code Copilot Chat
  history (the 0.1.2 refactor accidentally dropped Copilot).
- **0.1.5**: autonomy gate test extended to plant a Copilot fixture
  too, so 0.1.4-class regressions can't slip past tests.
- **0.1.6**: SKILL.md text rewritten to drop npm-CLI-era assumptions
  ("User has already run vibebook sync...") that were pushing the AI
  to abort with "vibebook CLI not installed" before the plugin's own
  `orchestrate` could even run.
- **0.1.7**: `publish` and `catalog-regen` now emit JSON success
  summaries to stdout. AI was previously deducing success only by
  rerunning publish and seeing "already exists" errors — fragile, and
  wrong if the first run partially failed.
- **0.1.8**: skill uses `VBP=$(ls -td ~/.claude/plugins/cache/...)`
  to discover the plugin path — `${CLAUDE_PLUGIN_ROOT}` isn't set in
  in-session Bash, just hooks. `orchestrate` JSON now includes
  `memexInstalled` so the skill doesn't have to spawn its own
  `command -v memex` (which AI generalized into also checking
  `vibebook` on PATH and then bailing).
- **0.1.9**: SKILL.md fan-out rewrite. Triggers on total source size
  (KB), not session count. Mandates putting all `Agent(...)` calls in
  ONE message for actual parallelism. Requires 3-minute progress
  reports so the user can tell waiting from stuck. Probe must test
  Write tool, not just Bash; chronicle agents must use Write, not
  Bash heredoc (heredoc breaks on JSON with backticks/Unicode).

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

- `~/.vibebook/session-repo/` schema is the same one used by the
  optional `vibebook` npm CLI — both can coexist on one machine and
  write to the same spool with sessionId-keyed entries.
- The plugin itself does not require the npm CLI to be installed.

### Notes for users with the `vibebook` npm CLI installed

Existing data keeps working. The plugin and the npm CLI cooperate
on the spool path: the plugin owns digest + recall; the npm CLI owns
cross-device sync (push/pull/resume). Install one, both, or neither
based on what you need.
