# memarium-plugin — contributor / agent guide

## Product boundary

This repository is the standalone digest + recall half of memarium. The optional
[npm CLI](https://github.com/june9593/memarium) handles cross-device session
transport, aggregation, and resume. Read `README.md` for installation and the
public workflow. Read versions from `package.json`, not a status note.

The plugin CLI and hooks do pure I/O; they do not call an LLM. The model's
reasoning and memory writing happen in the current session through the skills.
Do not add a background inference service as part of a bug fix.

## Layout

- `skills/` — four canonical workflows: digest, context, recall, and retro.
- `hooks/` — SessionStart primer and one advisory Stop assessment.
- `src/commands/` — CLI dispatch targets, including the read-only retro gate.
- `src/spool/` — autonomous source scan, single-Markdown rendering, and import.
- `src/_shared/` — modules mirrored from npm; `@sync-from` names the canonical file.
- `src/memory/`, `src/entity/`, `src/qa/` — typed memory and derived knowledge.
- `bin/memarium-plugin.js` — committed bundle used by installed plugins.
- `tests/` — isolated Vitest fixtures; `docs/` — tracked bilingual Astro site.

## Safety and data contracts

- Shared spool identity is `{tool}:{sessionId}`. Preserve IDs during title/path
  changes; render one `.md` per session, not raw JSON/JSONL siblings.
- Keep npm and plugin mirrors aligned for shared adapters, types, project
  identity, writer/index contracts, and manifest/TOC changes. Plugin-only memory
  and hook logic stays here.
- `memory/` is shared by multiple projects. Never wipe a whole subtree or reset
  the index as a shortcut for a project-scoped repair. Inspect and back up data
  before destructive work; do not run a live sync/digest without user approval.
- Core/procedural/pinned edits, protected supersession, and trust elevation use
  `memory-propose`. Proposals are local-only and require human review. Never
  approve your own proposals or silently turn a refusal into another attempt.
- Live/partial retro entries leave `sourceSessions: []`; those IDs are consumed
  receipts for the batch digest, not general-purpose session provenance.
- `finalize` can initialize Git, commit allowlisted files, and push when a remote
  is configured. Never replace its whitelist with repository-wide staging.

## Skills and hooks

Use `memarium:<skill-name>` for model-facing Skill IDs. Do not reintroduce
same-name command wrappers. Test the host-facing entrypoint as well as the CLI.
The primer is automatic context; ranked recall is an agent-invoked workflow.
The Stop gate is advisory and bounded, not proof of arbitrary shell side effects
or a requirement to create memory after every response.

## Verification and release

Run `npm run build && npx vitest run`; build `docs/` when its content changes.
Tests must establish temporary `HOME` / `MEMARIUM_DIR` and use synthetic sources
or local Git remotes, never the developer's live stores. Preserve behavioral
assertions when a machine is slow; adjust run-level concurrency/timeouts instead.

After a meaningful change, use the appropriate patch/minor bump and keep
`package.json`, `package-lock.json`, `.claude-plugin/plugin.json`, and
`.claude-plugin/marketplace.json` aligned. Rebuild and commit the bundle. Commit
on a branch, create an annotated tag, push, and open a PR. Do not npm publish.
Do not hot-patch a user's installed cache to make a test appear to pass.

Local `AGENTS.md` may mirror this file for Codex; the repository intentionally
keeps that generated copy untracked. Do not change personal agent settings.
