---
name: memarium-context
description: Load the current project's typed memory at the start of a session so you begin already familiar with the project — architecture, setup commands, gotchas, and rules — like an engineer who doesn't re-learn the codebase every task. Triggers at the start of work in any project the user has synced, and on "what do we know about this project", "load project memory", "what's the setup here", "catch me up on this repo". Outputs layered context: Core rules / Procedures & gotchas / Project facts / relevant Episodes (past work threads) / Conflicts (stale or contradicting memories).
---

# /memarium-context — start already knowing the project

Run this BEFORE exploring code in a project repo the user has synced. It
surfaces the typed memory memarium distilled from past sessions, so you start
as a familiar engineer instead of a stranger.

## Step -1 — Locate the plugin binary

```bash
VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js 2>/dev/null | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-) && echo "VBP=$VBP"
[ -x "$VBP" ] && "$VBP" --version
```

If `$VBP` is empty, tell the user to `/plugin install memarium` and stop.

## Step 1 — Query memory for the cwd's project

```bash
"$VBP" memory-query --cwd "$(pwd)"
```

Read the JSON payload:
- `primer` — the compact per-project rollup. **Read this first; treat it as
  already-known context.**
- `core` — never-forget rules (project + global). Always honor.
- `procedures` — how-to playbooks + gotchas for this project.
- `semantic` — **trusted** project facts / architecture / decisions (these are the
  ones auto-injected into the SessionStart primer).
- `untrustedSemantic` — semantic facts whose provenance is **untrusted/unknown**
  (the digest saw them in external content / couldn't verify the source). They are
  NOT auto-loaded as project context. You MAY consider them, but surface them under
  a clearly-marked **"⚠️ unverified"** heading with their source — **never present
  them as established project fact.** If one looks load-bearing, verify it before
  relying on it (and only `memory-propose` can promote it to trusted).
- `episodes` — past-work-thread episodic memories (do NOT read all; only `Read` the
  `entry.path` of ones directly relevant to the task).
- `conflicts` — memories flagged superseded or time-bounded; double-check
  before relying on them.
- each entry has `whyRecalled` — why it surfaced, and `trust` — its provenance.

## Step 1.5 — Browse the entity wiki (knowledge base)

The project also has an **entity wiki** — living pages per file / symbol / API /
concept / person, aggregating what's known about each across sessions:

```bash
"$VBP" entity-query --cwd "$(pwd)"
```

Read the `entities` array (ranked, each with `whyMatched`). These are
reference pages — don't load them all; `Read` an entity's `entry.path` only
when the task is about that entity. If the user's task names a specific thing,
look it up directly:

```bash
"$VBP" entity-query --cwd "$(pwd)" --entity "<file/symbol/concept>"
```

This returns:
- `matchedEntities`: array of `{ entry, body }` — entity pages whose `title` or
  any `aliases[]` equals the name (case-insensitive), with full markdown body.
  `Read` these directly; no second file read needed.
- `referencingMemories`: typed memories that mention this entity by name/title.
- `entities`: the full ranked list (same as the unfiltered browse above).

## Step 1.6 — Past Q&A (`qa/` answer layer)

After Entities, surface distilled Q&A relevant to the task. Run:

```bash
memarium-plugin qa-query --cwd "$(pwd)" --q "<keywords from the user's ask>"
```

This is **index-only** — it returns ranked `{ question, answerSummary, kind, path }` (NOT the full answer). Present the top matches as a short "Past Q&A" list (question + answerSummary). If the user wants the full answer, Read the `.md` at `path`. Keep this separate from the memory recall list — it is its own light scorer, not part of the lexical (term-overlap) memory ranking.

## Step 1.7 — Pending memory proposals (`memory-diff`)

Long-term memory changes (`core` / `procedural` / pinned) captured by past digests
are not applied automatically — they wait in a local review queue. Surface them:

```bash
"$VBP" memory-diff
```

This is **read-only**. If there are pending proposals, present them briefly
(target, action, changed fields). The user applies one with
`memory-approve --id <targetKey>` or discards it with `memory-reject --id <targetKey>`.
**Do not approve on the user's behalf** — surfacing is recall; approval is the
user's decision.

## Step 2 — Optionally narrow

If the user's task has clear keywords, pass them:

```bash
"$VBP" memory-query --cwd "$(pwd)" --q "<task keywords>"
```

## Step 3 — Use it explicitly

Open your reply by stating what you already know from memory (cite the
primer / specific memories), then proceed. Don't silently absorb it — make it
visible that you're standing on past work. If `core`/`semantic`/`procedures`
are empty, say "no distilled memory for this project yet" and proceed fresh
(then `/memarium` later will start building it).

## Relationship to /memarium-recall

`/memarium-recall` ranks the **typed memory** (episodes / facts / procedures) by
relevance for deep "翻书" dives into a specific task. `/memarium-context` loads the
**broad primer** for fast session-start orientation. Use context first; drill into
recall when you need the full
narrative of a specific past thread.
