# Changelog

## 0.17.0 — 2026-07-09

### Removed the local reading website (Phase C1 of the book→memory collapse)

memarium is AI-native — the knowledge base is read by agents (recall/primer),
not browsed by humans — so the optional Astro "book site" is gone. Deleted
`src/commands/site.ts`, the entire `site-template/` Astro project, the
`site serve|build` CLI command, and the `site-template/` entry in `package.json`
`files`. The separate `docs/` product landing page (GitHub Pages) is untouched.

Independent of the recall/digest changes; no runtime behavior beyond dropping
the `site` command. `book/` itself is still produced by the digest for now
(removed in Phase C2).

## 0.16.0 — 2026-07-09

### Recall is now 2-stage over typed memory (Phase A of the book→memory collapse)

`/memarium-recall` no longer walks `book/` (topics → chronicles → Read). It now
**scores the typed-memory index** and returns a single relevance-ranked list —
episodes (past work arcs), semantic facts, procedural gotchas, core rules — each
with `whyRecalled` and an absolute `path`; the agent then `Read`s the top 1–5.

- `src/commands/recall.ts`: rewritten to reuse the existing recall engine
  (`resolveMemoryView` + `scoreMemories` + usage overlay), exactly like
  `memory-query` / `/memarium-context`. New `--q <keywords>` drives scoring;
  `--topic` is gone. No-query recall returns a scope-eligible overview + primer.
- Cross-device correct: a new `resolveEntryAbsPath(view,id)` resolves each hit's
  path against its own tree (local repo vs. the read-only overlay worktree), so
  a sibling-device (`source:"overlay"`) hit is `Read`-able.
- Best-effort usage bump on content-hit queries (local sidecar only; never the
  synced index), same as `memory-query`.
- Rewrote `skills/memarium-recall/SKILL.md` + `commands/memarium-recall.md` to
  the 2-stage flow (kept the multilingual trigger block). +6 tests.

This is Phase A; the digest still produces `book/` for now (recall simply stops
reading it). Phases B/C make the digest memory-only and remove `book/`.

## 0.15.1 — 2026-07-09

### Fix: authored memory entries serialized `createdAt: undefined` / `updatedAt: undefined`

`memory-write` / `memory-propose` payloads routinely omit `createdAt` / `updatedAt`,
and the markdown renderer wrote the literal string `"undefined"` for them —
breaking every temporal consumer (sort, lint staleness, supersession). `apply.ts`
now defaults both at write time to a real `YYYY-MM-DD` date (the entry's
`validFrom` if it set one, else today), only when missing/invalid so an
author-set timestamp is preserved — mirroring the existing `accessCount` / array
defaults that keep the live index and a rebuild consistent. +3 tests.

(The 12 already-written files carrying `undefined` were backfilled in the
session-repo separately.)

## 0.15.0 — 2026-07-09

### Fix: proactive retro (Stop hook) never actually fired — now smart-gated

The 0.14.0 "proactive retro" Stop hook only `echo`ed a nudge and `exit 0`ed.
But a Claude Code **Stop** hook's plain stdout is **not** fed back to the model
(unlike SessionStart) — so the agent never saw it, and `/memarium-retro` never
ran on its own. Confirmed by tracing a real session: a clearly retro-worthy turn
ended with the nudge printed and no retro.

Rewired to actually drive the agent, and gated so it only fires after real work:

- **New `retro-gate` CLI subcommand** (`src/commands/retro-gate.ts`): reads the
  Stop event JSON on stdin and, **only** when the just-finished turn used a
  file-mutation tool (`Edit`/`Write`/`NotebookEdit`/`MultiEdit`) and hasn't
  already retro'd, prints `{"decision":"block","reason":"…run /memarium-retro…"}`
  — which Claude Code feeds back so the agent captures the insight before
  stopping. Honours `stop_hook_active` (forces at most one continuation, never
  loops). Read-only, never throws. Pure `decideRetroGate` core + 9 tests.
- **`hooks/session-end.sh`** is now a thin pipe: `cat | "$VBP" retro-gate`.
  Silent on chat/Q&A turns (no more nagging), silent when the plugin isn't
  found or on any error.

Net effect: retro fires proactively after you change files, and stays quiet on
pure Q&A turns.

### Fix: binary discovery picked by mtime, could resolve a stale version

Every skill/hook/command fallback discovered the plugin binary with
`ls -td …/cache/*/memarium/*/…` — newest by **mtime**. With several cached
version dirs coexisting (`0.13.1` / `0.14.0` / `0.14.1`), mtime order could
(and did, observed live) resolve an **older** binary than the installed one.
All eight sites now use `ls -d … | sort -V | tail -1` (highest **semver**),
with `$CLAUDE_PLUGIN_ROOT` still preferred first.

## 0.14.1 — 2026-07-07

### Fix: recall/digest binary discovery used a stale plugin-cache glob

`/memarium-recall` (and `/memarium`) discovered the plugin binary with
`ls -td ~/.claude/plugins/cache/memarium/memarium/*/bin/memarium-plugin.js`,
but the marketplace segment of the cache path is `memarium-plugin`, not
`memarium` — so the first `ls` matched nothing (`no matches found`, empty
`$VBP`) and the skill only worked if the agent improvised a fallback. Fixed
to the marketplace-agnostic `cache/*/memarium/*` glob (matching the
`memarium-context` / `memarium` / `memarium-retro` skills), and gave
`memarium-recall`'s SKILL.md its own **Step 0 — locate the plugin binary**
(`$CLAUDE_PLUGIN_ROOT` first, `cache/*/memarium/*` fallback) so it no longer
inherits the path from the command shell. Docs only; bundle unchanged.

## 0.14.0 — 2026-07-03

### Native proactive in-session memory capture + recall (drop the memex dependency)

memarium now does natively what it previously nudged users toward memex for —
proactively capturing what you learned, in-session, and prompting recall before
work — using its own typed-memory layer + review gate.

- **New `/memarium-retro` skill** (+ `commands/memarium-retro.md`): the
  lightweight, in-session counterpart to the batch `/memarium` digest. At task
  end it distills the ONE reusable insight from the current session, runs a
  fact-hygiene check (WHO / WHAT-WHEN / RELATIONSHIP), dedups via `memory-query`,
  and writes it — `memory-write` for `semantic`/`episodic`, `memory-propose`
  (the v4 review gate) for `core`/`procedural`/pinned/supersede. Coexists with
  the batch digest by dedup.
- **Stop hook (`session-end.sh`)** now nudges `/memarium-retro` at turn end
  ("if you did non-trivial work, capture the insight NOW") instead of only
  suggesting the batch digest.
- **SessionStart hook (`session-start.sh`)** adds a recall nudge after the
  primer — invoke `/memarium-recall` before re-reading code / `git log`.
- **Dropped the memex integration**: `recall.ts` no longer folds memex cards
  (`kind: "memex-card"`, `memex read index`), `orchestrator.ts` drops the
  `memexInstalled` probe, `publish.ts`'s `--cards` deprecation now points at
  typed memory / `/memarium-retro`, and the skill docs no longer reference
  memex cards. `~/.memex/` and the `memex` CLI are no longer consulted.

440 tests; tsc clean.

## 0.13.1 — 2026-07-02

**Fix: config-dir migration broke the aggregated worktree (mirror of npm memarium fix).** `migrateLegacyConfigDir` (added in 0.13.0) bulk-renames `~/.vibebook/` → `~/.memarium/`, but the read-only `aggregated/` git worktree stores its link to `session-repo` as an **absolute** path, so the move staled it. On a dual-install machine where the plugin's SessionStart hook runs the migration before `memarium sync`, cross-device recall silently degraded (the overlay's `.git` file still exists but dangles, and `refreshAggregatedWorktree` only rebuilds when it's *absent*). Fix: after the move, `git worktree repair` the aggregated worktree (keeps `_shared/config.ts` in sync with npm canonical). +4 tests.

## 0.13.0 — 2026-07-02

**Project renamed: vibebook → memarium** ("mem" + "-arium" = a place where memory lives). This is a rename-only release — no behavior change. Paired with npm `memarium` 0.13.0.

- **Skills renamed:** `/vibebook` → `/memarium`, `/vibebook-context` → `/memarium-context`, `/vibebook-recall` → `/memarium-recall` (the `skills/` dirs moved to match).
- **Plugin/marketplace names** → `memarium` / `memarium-plugin`; bundled CLI → `bin/memarium-plugin.js`.
- **Config/data dirs** move `~/.vibebook/` → `~/.memarium/` and in-repo `.vibebook/` → `.memarium/`, auto-migrated on first read (best-effort, idempotent). Legacy chain is `.memvc` → `.vibebook` → `.memarium`; borrowed-tenant plugin users (no npm CLI) migrate via `readPluginConfig`.
- `@sync-from` mirror headers now point at `github.com/june9593/memarium`.

## 0.12.0 — 2026-07-01

**Cross-device memory recall (P0b).** `vibebook sync` already aggregates every device's typed memory into `origin/main` (merge-books) and mounts a read-only worktree at `~/.vibebook/aggregated/`, but recall/primer only ever read the local device repo — so the aggregated cross-device memory was produced and never consumed (the "Q2 gap"). Now recall sees sibling-device memory:

- **`src/memory/source-resolver.ts`** (new): `resolveMemoryView` merges the local + overlay memory indexes — union by id; latest `updatedAt` wins; equal timestamp prefers local (own-device authority, a read-view override, not CI parity). It's a *repo-indexed / non-proposal* view: status is NOT pre-filtered (superseded kept for the conflicts block); pending proposals live outside the repo so they're excluded for free; each entry is tagged with its source tree. Gracefully degrades to local-only when the overlay is absent/corrupt.
- **`memory-query`** reads the merged view; **`memory-primer`** renders the SessionStart primer **live** from the merged view (no longer prefers the on-disk `_primer/<project>.md`, which is a per-device artifact merge-books doesn't aggregate). `memory-query` no longer persists `_primer` (it would be a stale, local-only snapshot).
- **`status`** gains a `crossDevice` section: overlay present/path + local / merged / sibling-only memory counts.

Writes stay local-only; the "unreviewed memory doesn't propagate" invariant is unchanged. +16 tests.

## 0.11.0 — 2026-06-30

**Project identity from the git remote (P0a) — lockstep with npm vibebook 0.11.0.** The project a session/memory belongs to was keyed on the cwd's last two path segments (`~/edge/memvc` → `edge-memvc`), so the same repo at a different path per device split into different projects and never aggregated. Identity is now the normalized git `origin` remote (`github.com-june9593-vibebook`), path-independent, with the path slug as fallback for non-git projects.

- new `src/_shared/project-identity.ts` (mirror of npm canonical).
- `_shared/project-resolve.ts` read chokepoint prefers the remote slug, path fallback.
- `_shared/sources/{claude-code,vscode-copilot}.ts`, `_shared/content-project-inference.ts` (known roots), and `digest/orchestrator.ts` assign the remote slug.

Migration of existing path-slug data not shipped (local wipe + re-digest). tsc clean; 424 tests.

## 0.10.2 — 2026-06-30

**Fix: a new project's first-digest chronicles could silently vanish from the catalog (#38).** A fan-out reader subagent that violated the "return JSON only" contract could write chronicle md straight under `book/<project>/chronicle/`, bypassing `publish` — so the md never entered `index.book.json`. Because the catalog is deliberately index-driven (not FS-globbing), the **entire project disappeared** from `book/index.md` and never got a `book/<project>/index.md` (observed: `chromium-src`, 28 chronicles on disk, 0 in the index, header still said "4 projects").

Two-part fix:
- **Self-heal (`src/digest/reconcile-orphans.ts`):** `publish` (catalog pass) and `catalog-regen` now scan `book/<project>/chronicle/*.md` for well-formed chronicles absent from the index, parse their frontmatter, and re-register them before rendering — so a whole project can't be silently dropped. Malformed / duplicate-threadId orphans are reported and skipped, never fatal. The index stays the source of truth; reconcile only re-registers what's already on disk. (Verified against a real repo: recovered all 28 `chromium-src` orphans, 0 skipped.)
- **Prevent (SKILL.md):** the fan-out reader contract is now an explicit hard guardrail — a reader's only output is its `/tmp/vb-<project>/agent<N>.json`; it must not write chronicle/topic md, memory, skills, configs, or anything else. This also closes #38's second symptom (a reader that went off-task and authored an unrelated `~/.claude/skills/.../SKILL.md`).

+6 regression tests. 398 tests; tsc clean.

## 0.10.1 — 2026-06-29

**Fix: `memory-write/-propose/-approve` crashed with `undefined.length` on a thin entry (#37).** `render.ts`'s `arr()` did `xs.length` and threw `Cannot read properties of undefined (reading 'length')` when an authored entry omitted any of `sourceSessions`/`sourceCommits`/`sourceFiles`/`entities` (and `summary` rendered as `undefined`). Those fields are de-facto required but presented as optional, so a reasonable input died opaquely — and the trap bit twice: `propose` queued a thin entry fine, then `approve` re-rendered and crashed. Fix is two-layer: `arr()` now defaults `xs ?? []` and summary `?? ""` (so render never throws, incl. approve re-render), and `applyMemoryItems` normalizes the arrays/summary alongside the existing accessCount/trust defaults so the persisted md + index stay consistent. +5 regression tests (render with each array undefined; apply normalizes a thin entry). 392 tests.

## 0.10.0 — 2026-06-24

**Removed: at-rest encryption (lockstep with npm `vibebook` 0.10.0).** The
npm CLI dropped its opt-in git-crypt body-encryption layer (default-off
since 0.8.2), so the plugin's `@sync-from` mirrors of those files are
cleaned to match:

- **Deleted** `src/_shared/passphrase-store.ts` (the npm canonical was
  removed).
- **`src/_shared/config.ts`** — dropped the `encrypt` / `salt` schema
  fields and the `freshSaltBase64` / `writeRepoSaltFile` / `getPassphrase`
  helpers + their `node:crypto` / passphrase / salt imports.
- **`src/_shared/repo-data-dir.ts`** — dropped `REPO_SALT_REL` /
  `repoSaltAbs`.
- **`src/spool/plugin-config.ts`** — `defaultPluginConfig()` no longer
  emits `encrypt` / `salt`.
- **SKILL.md** — removed the `MEMVC1` / "run `vibebook crypt init`" digest
  warning (the working tree is always plaintext; there is no filter to
  miss).
- Tidied stale "decrypt-on-demand" / "encryption happens via git filter"
  comments in `prepare.ts` / `scan-and-import.ts`.

No runtime behavior change: `readPluginConfig()` already `JSON.parse`s the
shared config and casts, so configs written by either the old or new npm
CLI parse fine — the plugin never read `encrypt` / `salt`. tsc clean,
390/390 tests passing.

## 0.9.10 — 2026-06-24

**`memory-lint --fix` — auto-staleness via the review gate (#14).**

`memory-lint` detected `expired` entries (active memories past their `validTo`) but
was read-only — a stale fact lingered until a human noticed and hand-edited it. New
`--fix` flag queues a `status→superseded` **proposal** for each expired entry,
routed through `memory-diff`/`memory-approve` — it **never writes the repo directly**
(the staleness fix is always reviewed), and writes only to the device-local proposal
queue. The fix preserves the entry's body and flips only the status. (Without `--fix`,
`memory-lint` stays purely read-only as before.) Digest Step P7.8 documents the shortcut.

## 0.9.9 — 2026-06-24

**`status` command — digest coverage / backlog visibility (#22).**

The product turns sessions into durable memory, but gave no signal about how much
of your history has actually been digested vs. is still pending. New read-only
`status` command aggregates the funnel across all real projects: synced sessions →
digested (referenced by a chronicle) → pending, a coverage %, the book layer
(chronicles / topics / cards) and the typed Memory OS layer (typed memory /
entities / qa) counts, plus a per-project pending backlog. Pure aggregation over
the existing indexes (reuses `list-projects`); no new state.

## 0.9.8 — 2026-06-23

**Provenance trust gating for semantic memory (#23).**

`semantic` memory was written live (ungated) yet auto-injected into the
SessionStart primer — a prompt-injection / memory-poisoning vector when a digest
ingests external content (web pages, external repos, files the agent read). A new
`trust` field (`trusted` | `untrusted` | `unknown`) governs auto-injection,
**without** routing every semantic write through the human review queue:

- The SessionStart primer auto-injects ONLY `trusted` semantic. `untrusted` /
  `unknown` semantic is withheld from the primer; it still writes and is searchable
  via explicit `/vibebook-context`, surfaced flagged (`untrustedSemantic`, "⚠️ unverified").
- `core` / `procedural` are unaffected — the v4 review gate already protects them.
- New writes that don't set `trust` default to `unknown` (never auto-promoted to trusted).
- **Promoting** an existing entry up to `trusted` is gated → must go through
  `memory-propose` / `memory-approve` (a plain `memory-write` is rejected). Downgrades are free.
- The scorer is untouched — `trust` affects primer injection + `/vibebook-context`
  display only, not recall ranking (eval recall@5 unchanged at 0.96).

**Compatibility:** legacy md without a `trust:` line is migrated mechanically on the
next `memory-index`: own-project provenance (a sourceSession / sourceCommit) +
project/global/user scope → `trusted`; otherwise `unknown`. Existing digested project
facts keep appearing in the primer; unprovenanced entries default out.

## 0.9.7 — 2026-06-23

**Memory types: drop the two unused types (`working`, `artifact`).**

The Memory OS has four typed-memory types — `core` / `semantic` / `episodic` /
`procedural` — matching what digests actually produce. `working` and `artifact`
were declared but had **no writer** (no plugin path ever emitted them), so they
are removed from `MemoryType`, the gate's valid-type set, the `memory-query`
payload (the always-empty `working` / `artifacts` buckets are gone), and
`memory-lint`'s stale-candidate check (now `episodic` only). `qa` and `entity`
remain separate derived layers, not memory types.

**Compatibility:** no plugin writer ever produced `working`/`artifact` entries,
so real stores are unaffected. A hand-authored legacy `working`/`artifact` md is
treated as unsupported/ignored — it still parses into the index but is never
surfaced in queries or the primer, and `memory-write` rejects the type. Resolves #20.

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
