# Changelog

## 0.5.0 — 2026-06-10

**Memory OS v2 — automatic project memory + a personal knowledge base.**
v1 made typed memory exist behind a manual `/vibebook-context`. v2 closes the
killer use case: project memory now loads **automatically** at session start,
and sessions grow an **entity wiki**.

### SessionStart auto-injection (the killer use case, automatic)

- **New `SessionStart` hook** (`hooks/session-start.sh`) injects the cwd
  project's primer (Core + Semantic + Procedural) at the start of every
  session — so a new session begins already knowing the project without
  running anything.
- **New read-only `memory-primer --cwd` command** backs the hook. Strictly
  read-only (prefers the digest-written `_primer/<project>.md`, falls back to
  rendering from the index in-memory), never writes, always exits 0, silent
  when there's no project memory. (The existing `memory-query` writes the
  primer file, so it is deliberately NOT used by the hook.)
- Primer sections are capped (top-N by importance) for a hard token budget.

### Entity wiki — personal knowledge base

- **New `memory/entities/<project|_global>/<slug>.md`** living pages — one per
  file / symbol / API / concept / person — that aggregate what's known about an
  entity across sessions, with a committed `.vibebook/index.entity.json`.
- This is a **derived layer, not a 7th memory type**: an entity page is a
  synthesis / reverse index (no lifecycle/supersede), distinct from the typed
  memory facts.
- **New `entity-write` / `entity-query` / `entity-index` commands.**
  `entity-query --entity <name>` does a reverse lookup (which memories
  reference the entity) — the raw material the digest agent uses to author a
  page. Path-safety guarded; own light scorer (not the memory BM25).
- **Digest step P7.6** synthesizes/updates entity pages after typed-memory
  distillation; `/vibebook-context` gains an **Entities** browse section.

> Cross-device aggregation of entity pages ships as a small `merge-books`
> entity pass in the vibebook npm CLI.

## 0.3.0 — 2026-06-10

**Typed memory layer — a new session starts already knowing the project.**
vibebook now distills durable, typed memory from your sessions and loads it
at the start of work, so an agent opening a fresh session in a project begins
familiar with it (architecture, setup, gotchas, rules) instead of re-learning
the codebase every task.

### New

- **Six memory types** written as markdown under `memory/<type>/<scope>/<slug>.md`:
  `core` (never-forget rules), `semantic` (project facts/architecture),
  `procedural` (how-to + gotchas), `episodic` (lightweight chronicle pointers),
  `working`, `artifact`. Markdown is the source of truth; a committed
  `.vibebook/index.memory.json` mirrors it for retrieval.
- **Three CLI subcommands**: `memory-write` (render md + update index +
  supersede), `memory-query` (resolve cwd→project, score, emit layered context
  + refresh the per-project primer), `memory-index` (rebuild the index from
  markdown — recovery path).
- **`/vibebook-context` skill** — run at the start of work to load the
  project's typed memory (Core / Procedures / Project facts / Episodes /
  Conflicts) plus a compact per-project primer.
- **Per-project primer** (`memory/_primer/<project>.md`) — the carrier of
  "don't forget the project", refreshed on every query.
- **JS retrieval scorer** — BM25-lite term overlap over title/summary/entities
  plus scope, file/commit overlap, recency, importance, and prior-use signals,
  with a `whyRecalled` explanation per hit. No SQLite, no native deps.
- **Digest distill step (P7.5)** — after publishing chronicles/topics,
  `/vibebook` distills durable typed memory for the project.

### Changed

- **Decoupled from memex.** vibebook no longer hands off to memex; atomic
  insights are captured as `procedural`/`semantic` typed memory in P7.5.
- **Robust plugin-binary discovery** — skills now locate the bundled binary
  across any marketplace dir (`cache/*/vibebook/*`), so installs from the
  `vibebook-plugin` marketplace resolve correctly.

> Cross-device aggregation of `memory/` (union by id, latest wins) ships in
> the vibebook npm CLI 0.8.6 (`merge-books` + `sync` staging).

## 0.2.0 — 2026-05-23

**Full sync of the spool extractor with vibebook (npm) 0.7.1.** Before
this, plugin's standalone scan was stuck on 0.6.x extractor logic — so
users with only the plugin installed (no npm `vibebook`) hit five
classes of bugs that npm vibebook had already fixed. This release
brings the plugin to parity.

### Fixes inherited from npm vibebook

- **Copilot `chatSessions/<id>.jsonl` chronological reconstruction**
  (npm 0.6.2). VS Code stores Copilot as a rolling-window state log;
  pre-0.2.0 the plugin captured only the latest visible turn (~5–8% of
  multi-turn agent sessions). Now walks events chronologically and
  appends snapshot elements to a growing `turns[]` array.
- **Copilot agent-mode response extraction** (npm 0.6.2). Agent
  sessions rarely emit `markdownContent`; they emit `thinking` +
  `toolInvocationSerialized`. Both are now extracted as ContentBlocks.
- **Claude `isMeta=true` entries filtered** (npm 0.6.3). System-injected
  slash-command skill bodies no longer leak into displayName derivation
  (the `Step-0-—-Detect-the-mode-DO-THIS-FIRST…` artifact is gone).
- **Per-session manifest + Table of Contents in md frontmatter** (npm
  0.7.0). Every rendered md now has `manifest_version: 1` +
  `tools_used` histogram + `commits` + `files_touched` +
  `candidate_decisions` + a `# Table of Contents` block with
  `→L<line>` jump offsets. Skill consumers can navigate huge sessions
  without loading the whole body.
- **Copilot `chatSessions/` vs `transcripts/` dedupe** (npm 0.7.1).
  When the same sessionId exists in both source formats within one
  workspace, only `chatSessions/` is yielded. Stops the duplicate-.md
  problem (~83 orphan files on Yue's machine before fix).
- **Empty-shell session skip** (npm 0.7.1). VS Code creates a chat
  session file for every tab opened (even ones immediately closed);
  these have no `requests` and fell through to `1970-01-01/untitled__*.md`
  files. Now skipped at scan time.

### Breaking

- **Dropped `.raw.json` sibling files.** Each session now writes a
  single `.md`. The .md carries all session data (rich content
  blocks, manifest, TOC). `index.json` `relativePath` points at the
  .md directly. `prepare.ts`'s existing `.raw.json` → `.md` regex swap
  becomes a no-op (preserved for back-compat with old indices).

### Files synced from `june9593/vibebook@v0.7.1`

- `src/_shared/types.ts` — added `ContentBlock`, `SessionManifest`,
  `TocEntry`, `contentBlocks` field, `originSessionId` field
- `src/_shared/sources/claude-code.ts` — verbatim
- `src/_shared/sources/vscode-copilot.ts` — verbatim
- `src/_shared/digest/manifest.ts` — new
- `src/_shared/digest/toc.ts` — new
- `src/spool/writer.ts` — 2-pass renderer with manifest + TOC, drops
  `.raw.json` output
- `src/spool/scan-and-import.ts` — empty-shell skip, `.md`-only output

22/22 vitest passing (was 22 in 0.1.11 too — same test count, all
adapted to the longer fixture content the 10-char sanitizer requires).

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
