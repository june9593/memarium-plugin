---
name: memarium
description: Digest already-synced raw_sessions into a per-project typed Memory OS — episodic memories (one per work thread, the arc/dead-ends/decisions), semantic facts, procedural gotchas, plus the derived entity wiki + distilled Q&A. Triggers on `/memarium`. Two modes auto-selected by cwd — project-mode (cwd ≠ session-repo, digests just the matching project) or global-mode (cwd = session-repo, fan-out one subagent per pending project). Per-project isolated. There is ONE knowledge layer — typed memory, read by agents (recall/primer); no human-facing book.
---

# /memarium — digest sessions into the typed Memory OS

This skill walks the **in-session Claude** (you) through digesting the user's
already-synced AI coding sessions into ONE per-project knowledge layer: **typed
memory** — `episodic` (one per work thread: the arc, dead-ends, decisions),
`semantic` (durable facts), `procedural` (how-to playbooks + gotchas), `core`
(never-forget rules) — plus the two derived layers, the **entity wiki** and
**distilled Q&A**. It is AI-native: agents read this via `/memarium-recall` and
the SessionStart primer. There is no human "book" — no chronicles, no topics, no
reading site.

Pure mechanical CLI handles I/O (`"$VBP" prepare` / `"$VBP" memory-write` /
`"$VBP" memory-propose` / `"$VBP" entity-write` / `"$VBP" qa-write` /
`"$VBP" skip-write` / `"$VBP" finalize` / `"$VBP" list-projects`); the LLM work —
segmentation + writing — is yours, in this conversation, with full context.

## Inputs you assume

- The plugin's `orchestrate` step (Pre-step + Step 0 below) scans the user's
  local `~/.claude/projects/` + Copilot Chat jsonl, writes rendered `.md` into
  `~/.memarium/session-repo/raw_sessions/...`, and updates `.memarium/index.json`.
  **You don't need to check whether sync ran** — the plugin scans on every run.
- If the user also installed the optional `memarium` npm CLI for cross-device
  sync, fine — both write the same spool. Don't gate on it; it's not required.

---

## Step −1 — Locate the plugin binary (DO THIS FIRST OF ALL)

`${CLAUDE_PLUGIN_ROOT}` is **not** populated in your in-session Bash environment,
so discover the plugin's bin path and stash it in a shell variable:

```bash
VBP="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/memarium-plugin.js}"
[ -x "$VBP" ] || VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js 2>/dev/null | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-)
echo "VBP=$VBP"
```

Confirm it resolves (picks the highest **semver** version):

```bash
[ -x "$VBP" ] && "$VBP" --version
```

**If `$VBP` is empty or the version doesn't print**, the plugin isn't installed —
STOP and tell the user to `/plugin install memarium`. Do not fall back to a PATH
`memarium` (that's the separate npm CLI). Run every subcommand as `"$VBP" <sub>`
in the same shell where you set `$VBP`.

---

## Pre-step — First-run nudge (silent if already shown)

```bash
"$VBP" first-run
```

Prints a one-time nudge about the optional npm CLI. Silent afterwards. Don't
summarize it — just let it print.

## Step 0 — Spool warmup + mode detection (DO THIS FIRST)

```bash
"$VBP" orchestrate project --cwd "$(pwd)"
```

(If you're in `~/.memarium/session-repo/` or a non-project dir, use
`orchestrate global` — see the mode table.) This imports any new local jsonl into
the spool. Idempotent. Read the JSON: `mode`, `project`, `scan.imported`,
`nextStep`. Then get the mode-detection table:

```bash
"$VBP" list-projects
```

| `meta.isInSessionRepo` | Mode | What you do |
|---|---|---|
| `false` | **project-mode** | Digest only the project matching the user's cwd. The common case. |
| `true` | **global-mode** | User is in `~/.memarium/session-repo` asking for a full sweep. Fan out one subagent per project with pending sessions. |

**Tell the user which mode you detected** in one line, then go to the matching
section. Trust `list-projects`; don't guess.

---

# Project mode

*(Project mode begins at Step P1.)*

### Step P1 — Prepare for cwd's project

```bash
"$VBP" prepare --cwd "$(pwd)"
```

If it errors `no synced sessions found for cwd '...'`, the spool has nothing for
this cwd's project. Tell them the `project` slug you tried, and ask whether
`$(pwd)` is right or whether they meant `--project <slug>`.

The payload shape:

```json
{
  "project": "github.com-acme-edge",
  "newSessions": [
    { "sessionId": "abc12345-6789-4abc-8def-0123456789ab", "shortId": "abc12345", "tool": "claude" | "copilot",
      "endedAt": "2026-04-22T15:30:00Z",
      "mdPath": "raw_sessions/claude/github.com-acme-edge/2026-04-22/...md",
      "preview": "first 300 chars of user's first real message", "insightScore": 0.62 }
  ],
  "existingEpisodes": { "github.com-acme-edge": ["episodic/github.com-acme-edge/fix-fullscreen", ...] },
  "meta": { "totalSessionsInIndex": 75, "sessionsAlreadyDigested": 68, "newSessionsCount": 4 }
}
```

`newSessions` = sessions NOT yet digested (no episodic references them) and NOT
skip-ledgered. `existingEpisodes` lets you reuse a thread's episodic `id` instead
of forking a duplicate. **Show the user** a summary line (`N new sessions in
<project>`) + first-3 previews; don't dump the full table unless asked.

### Step P2 — Segment into threads

**Default: one thread = one session → one episodic.** Only merge sessions that are
demonstrably the same continuous effort (same files, narrative picks up where the
last left off). When in doubt, keep them separate — **many small episodics beat
one bloated mega-thread**.

**Read the actual md** (`mdPath`) for every session before deciding — not just the
preview.

#### Reading a 0.7+ `manifest_version: 1` md (chunked navigation)

Each raw_sessions md has a manifest + Table of Contents at the top, so you can
navigate huge sessions (9MB+) without loading the whole body. Always check first:

```
Read offset:0 limit:80 <mdPath>
```

If the frontmatter has `manifest_version: 1`:
- It carries `user_turns`, `assistant_turns`, `tools_used`, `commits`,
  `files_touched` (up to 200), `candidate_decisions` (heuristic hints).
- A `# Table of Contents` follows: each row has `→L<number>` = the turn's line.
  Markers: 🧑 user turn, ✏️ edit, 💾 commit, 🤖 substantive assistant reply.

Navigation: read the TOC region (a second Read of ~500 lines), then pull the 3–10
most relevant rows via `Read offset:<L> limit:200`. The manifest already gives you
`files_touched` + `commits` — 80% of what an episodic needs. Only whole-file-Read
if the manifest is missing (pre-0.7 md).

#### SKIP rules — be conservative; skips go to the ledger

A session is skipped ONLY when it has **no code change, no debugging conclusion,
no decision** — pure greeting, a single unanswered question, "test this skill /
ping", resume noise, or a string of API errors with no reply. **Always skip
memarium meta-sessions** (the user running `/memarium` — first user message is
`/memarium…`, or the transcript is dominated by `"$VBP" …` calls).

**If in doubt, write the episodic.** A "I tried X and it didn't work" session is
valuable — it records the dead end. Past digests over-skipped and dropped 80%+ of
real work. Never skip: "continue from where you left off" (merge with the prior
session), or any session whose body has a commit hash, code block, file path,
error message, or decision marker.

Skipped sessions are recorded in the **local skip ledger** (Step P6), NOT as a
memory — so they don't pollute recall but also aren't re-proposed every digest.

Write the segmentation to `/tmp/memarium-groups.json` (use each session's **full
`sessionId`** from `newSessions`, NOT the 8-char `shortId` — these ids flow into
`sourceSessions` and the skip ledger):

```json
[
  { "threadId": "fix-fullscreen-bookmark-bar", "title": "Fix Edge fullscreen bookmark-bar bug",
    "sessionIds": ["abc12345-6789-4abc-8def-0123456789ab", "def67890-1234-4cde-9012-3456789abcde"], "skip": false },
  { "threadId": "ping-test", "sessionIds": ["xyz99999-aaaa-4bbb-8ccc-ddddeeeeffff"], "skip": true,
    "skipReason": "pure ping test, no real work content" }
]
```

Show the user the table (one row per non-skip thread) + the skip count. Ask to proceed.

### Step P3 — Read in parallel via subagents (when total source size warrants it)

Trigger on **effective read size** of non-skip threads, not session count. With
`manifest_version: 1` md, effective size ≈ manifest + TOC + ~5 targeted segments
(~100 KB), not the full file.

| Total effective read size | Strategy |
|---|---|
| **< 150 KB** | Inline. One Read per thread, write in the main session. Don't pay subagent overhead. |
| **150 KB – 1 MB** | Fan out, batch ~3–5 threads per agent, **all in one message**. |
| **> 1 MB** | Same, BUT isolate each session ≥ 200 KB effective into its own agent. |

**Run agents in PARALLEL:** put **multiple `Agent(...)` calls in a single
assistant message** — one call, wait, another call runs them serially. Total wall
= max(individual), not sum.

**Progress reports:** subagents take 2–10 min each; the user can't tell waiting
from stuck. Every ~3 min emit a one-line status; use PushNotification for waits
> 8 min. If one agent runs > 15 min, Stop it and re-dispatch that session solo.

**Permission warm-up (once per session, BEFORE fan-out):** subagents can't prompt
for Bash/Write permission. Run inline so the user approves the broad pattern once:

```bash
mkdir -p /tmp/vb-<project>/_warmup && rmdir /tmp/vb-<project>/_warmup
"$VBP" prepare --help >/dev/null       # approve Bash("$VBP" *)
echo warmup > /tmp/vb-<project>/_warmup.json && rm /tmp/vb-<project>/_warmup.json   # approve Write /tmp/vb-<project>/*
```

**Probe before big fan-out:** dispatch ONE probe agent that uses the **Write tool**
(not Bash heredoc) to create `/tmp/vb-<project>/probe.txt`; verify from the main
session. If Write is unavailable, fall back to inline writing — don't fight it.

**Reader subagents return JSON ONLY.** A reader's entire deliverable is its JSON
file under `/tmp/vb-<project>/agentN.json`. It must NOT write anything else. Put
this verbatim in every reader prompt:

> "Your ONLY output is the JSON file at /tmp/vb-<project>/agentN.json (use the
> **Write tool**, not Bash heredoc). Do NOT create or edit any other file — not
> memory/, not skills, not configs. `memory-write` is the sole writer; you only
> return `{entry, body}` items for it. If you think you need to write elsewhere,
> you've misread the task — stop and report."

Each reader returns the episodic `{entry, body}` items (Step P4 format) for its
threads. The main session merges them and runs `memory-write` once.

### Step P4 — Write episodics (one per non-skip thread)

For each non-skip thread, author an **episodic** memory using the format in
`references/episodic-format.md` (same directory). Each is a `{ entry, body }`
item:

- `entry`: `id = episodic/<project>/<threadId-kebab>`, `type: "episodic"`,
  `scope: "project:<slug>"`, `project`, `title`, keyword-dense `summary`,
  `status: "active"`, `importance` (0–5), `confidence` (0–1),
  **`sourceSessions`** (the threads' full `sessionId` values from `newSessions` —
  the idempotency receipt; use the full `sessionId`, **NOT** `shortId`, or the
  session never counts as digested and re-proposes forever),
  `sourceFiles` (files_touched, **as repo-relative paths** — strip any absolute
  `/Users/…` / `/home/…` / `C:\Users\…` home prefix; the write guard rejects a
  memory with an absolute home path in any field, sourceFiles included),
  `sourceCommits`, `entities` (symbols/APIs/concepts).
- `body`: `## Context / ## What worked / ## Dead ends / ## Open questions /
  ## Decisions` + a `**Work status:** shipped|in-progress|blocked|abandoned` line.

**Critical:**
- **`sourceSessions` must be present + correct** — it's what marks the thread's
  sessions digested. Wrong/missing → the session re-digests forever.
- **Work status lives in the BODY.** `entry.status` is the lifecycle axis
  (`active`/`superseded`/`pinned`) — never set it to a work status.
- Imperative agent-reuse voice; preserve commit hashes / file paths / DCHECK
  strings verbatim — **but write file paths repo-relative**: strip any absolute
  `/Users/…` / `/home/…` / `C:\Users\…` home prefix (the write guard rejects an
  absolute home path in ANY field — title, summary, body, sourceFiles, entities).
  At most one small code block per section. Dead ends matter as
  much as What worked — write `(none)` if genuinely empty, don't omit.
- Don't hallucinate outcomes; `**Work status:** blocked` beats overstating.
- Reuse an existing episodic `id` from `existingEpisodes` for a continued thread
  (it upserts/refines); keep `threadId` stable.

Build the JSON incrementally — `Write` to `/tmp/memarium-episodics.json` (or one
file per thread, merged with a small Python pass). **Never `cat <<EOF` a big batch
of bodies in one shot** (Bash-injection prompts + 524s). **Never write a Python
script that generates the bodies** — the bodies ARE your LLM output; Python is
only for merging/sorting JSON.

### Step P4b — Distill semantic / procedural / core facts

Episodics capture the *arc*; now extract the durable *facts* worth surfacing on
their own. Add these to the memory JSON (or a second file):

- **semantic** — a durably-true project fact / architecture / decision. Set
  **`trust`** (`trusted` only when it's the user's OWN work on THIS project —
  their session / a repo commit / a verified local fact; only trusted semantic
  auto-injects into the SessionStart primer; default `untrusted` when in doubt).
  If a new fact replaces an old one, set `supersedes: <old-id>`.
- **procedural** — a how-to playbook / gotcha ("to add X do Y; watch out for Z").
  **⚠️ Abstract the RULE — don't just describe the fix.** The #1 digest-quality
  miss is recording what happened in THIS session instead of the reusable rule a
  DIFFERENT-but-similar situation could apply. When a fix embodies a general
  principle, write the abstracted procedural rule as its OWN entry — a standing
  `trigger → action` rule decoupled from the origin bug — not only the
  session-specific description. One session often yields MORE than one rule; split them.
  - ❌ fix-description (welded to this session): _"search_files ran off the event
    loop and skipped OneDrive placeholders, so the async freeze got fixed."_
  - ✅ two standalone procedural rules:
    - _"Never run a synchronous filesystem walk on the asyncio event loop — offload to a bounded thread pool."_
    - _"OneDrive placeholder files hang on stat() — check the RECALL flags before touching them."_
  **Additive, never substitutive:** the abstracted rules are EXTRA entries. Always
  write the episodic (the arc) AND the must-have semantic/procedural facts FIRST,
  then add the rules on top. Splitting into rules must never drop, merge away, or
  under-specify the session's core arc + key facts — and a non-skip thread must
  NEVER finish with zero memories.
- **core** — a never-forget rule (rare). scope `global`/`user`/`project:<slug>`.

`id = <type>/<project|_global>/<kebab-slug>`. Fill `entities`, `importance` (0–5),
`confidence` (0–1). **Do NOT set `accessCount`** (device-local, auto-maintained).
Be conservative — a few high-value facts beat many trivial ones; don't duplicate
what the SessionStart primer already loaded.

### Step P5 — Persist typed memory (v4 gate: write vs propose)

Split the P4 + P4b items into two arrays by the **v4 gate**. A change is *gated*
if the entry is `core` or `procedural`, has `status: pinned`, supersedes/edits an
existing core/procedural/pinned memory, OR elevates an existing memory to
`trusted`:

- **Non-gated** (`episodic`, plain `semantic`) → `/tmp/memarium-memory.json`:

      "$VBP" memory-write --input /tmp/memarium-memory.json

  Writes `memory/<type>/...` md + updates `.memarium/index.memory.json`. The
  SessionStart primer renders live from the (cross-device) memory view, so new
  memory shows up next session automatically. (Sanity-check with
  `"$VBP" memory-query --cwd "$(pwd)" >/dev/null` if you like.)

- **Gated** (`core` / `procedural` / pinned / supersede-of-gated / trust-elevation)
  → a separate array + `memory-propose` (same `{entry, body}` items, optional
  `rationale`/`sourceSession`):

      "$VBP" memory-propose --input /tmp/memarium-gated.json

  These queue locally for human review — they do NOT land live. If you call
  `memory-write` with a gated item it errors "use memory-propose" — re-route it.
  **Never approve your own proposals.**

**Surface proposals for review — required, but NON-BLOCKING.** After
`memory-propose`, save the returned `targetKeys`, run `"$VBP" memory-diff --json`,
and present them IN CHAT (don't echo raw CLI output — it collapses): a numbered
one-line-per-proposal table for THIS round's `targetKeys`
(`[n] [<type>] <targetKey> — <plain summary> · src <session>`), full body inlined
for at most 1–3 of the most consequential (core/pinned > procedural > high-importance
create). Tell the user: "queued for your review — reply `approve 1,3 · reject 2`
now or later." Only when they name numbers do you run, one at a time,
`"$VBP" memory-approve --id <targetKey>` / `memory-reject --id <targetKey>`. Never
blind-approve; the digest completes either way.

### Step P6 — Synthesize entity wiki (derived layer)

Grow the project's **entity wiki** — one living page per salient entity
(file / symbol / API / concept / person) aggregating what's known across sessions.

1. Pick the few entities this session is genuinely *about* (be conservative).
2. For each, pull existing context to update rather than overwrite:

       "$VBP" entity-query --cwd "$(pwd)" --entity "<name>"

   Returns `matchedEntities` (existing pages + bodies to update in place),
   `referencingMemories` (raw material), `entities` (ranked browse list).
3. Write `/tmp/memarium-entities.json` — each `{ entry, body }` with
   `entry.id = entity/<project|_global>/<kebab-slug>`, `kind`, `title`, `aliases`,
   `sourceMemoryIds`, `sourceSessions`, `sourceFiles`, `relatedEntities`; body =
   one-line def + **What it is** / **Key facts** / **Gotchas** / **Related**.
4. Persist: `"$VBP" entity-write --input /tmp/memarium-entities.json`

Skip entirely if the session produced no durable entity worth a page.

### Step P7 — Distill Q&A (`qa/` derived layer)

Scan THIS session for high-reuse question→answer pairs. **Conservative — prefer
writing nothing.** Write a qa page ONLY when ALL hold: the **user actually asked**
it, it was **resolved in-session**, the answer has **reuse value**, and it has
**clear sources**. Only compound questions / troubleshooting conclusions /
decision rationale / operational routes qualify — ordinary facts belong in typed
memory. Build `{ entry, body }` (entry has `scope`/`project`/`question`/
`answerSummary`/`kind`/`tags`/`sources`/`sourceMemoryIds`/`sourceSessions`) and:

      "$VBP" qa-write --input <that-json-file>

Re-asking a known question upserts the existing page — don't fork. Nothing
qualifies → write nothing.

### Step P8 — Consolidate (memory health + conservative promotion)

```bash
"$VBP" memory-lint --cwd "$(pwd)" --json
```

`issues[]` = objective defects; `suggestions[]` = judgment candidates. Act on only
a FEW high-confidence items — prefer nothing over noise. Non-gated writes go
through `memory-write`; **gated changes (core/procedural/pinned, or superseding
one) go through `memory-propose`** (surface for review like above). For plain
`expired` findings you can `memory-lint --cwd "$(pwd)" --fix` to *queue*
`status→superseded` proposals. **By default KEEP a source episodic** when
promoting a stable fact into `semantic`/`procedural` — the episodic is the
evidence; only supersede it if it's a low-value duplicate pointer whose provenance
you carry forward.

### Step P9 — Record skips (so they aren't re-proposed)

Record in the local skip ledger — otherwise these resurface as "new" every digest
(and keep triggering global fan-out): **(a)** every thread you marked `skip: true`
in Step P2, **and (b)** every id in `prepare`'s **`filteredMetaSessions`** (the
memarium meta-sessions prepare already removed from `newSessions` — they're not
episodic-consumed, so you must ledger them here). Build a JSON array of
`{ sessionId, reason }` using each session's **full `sessionId`**:

```json
[ { "sessionId": "xyz99999-...-uuid", "reason": "pure ping test, no real work content" },
  { "sessionId": "abc11111-...-uuid", "reason": "memarium meta-session (filtered by prepare)" } ]
```

```bash
"$VBP" skip-write --input /tmp/memarium-skips.json
```

The ledger is `.memarium/index.skips.json` — local-only (never synced), kept OUT
of recall. This replaces the old book-era `skip:true` chronicle.

### Step P10 — Finalize + summary

**Finalize — commit the round (REQUIRED):**

    "$VBP" finalize

Ensures the repo exists, commits everything this digest wrote (`raw_sessions/`,
`memory/`, `.memarium/index.{json,memory,entity,qa}.json`), and auto-pushes
if a remote is configured. It stages only memarium's own paths, never foreign
files (`.memarium/index.skips.json` is device-local and never committed). Read its JSON report (`committed`, `staged`, `pushed`, `branch`, `remote`).

Print a one-line-per-layer summary:

```
✓ Memory: A episodics + B semantic/procedural/core, C entities, D Q&A pages.
✓ Consolidated: E promoted/superseded, F proposals queued for review (surfaced above).
✓ Skipped: G sessions ledgered.
✓ Finalized: committed <N> files (pushed to <branch> | local-only, no remote).
```

(If a layer wrote nothing, say so explicitly — `Memory: 0 (nothing durable this
round)` — so it's clear the step *ran* and chose to write nothing.)

That's it for project-mode. The user can `cd ~/.memarium/session-repo && claude →
/memarium` later for a global sweep.

---

# Global mode

Triggered when cwd = `~/.memarium/session-repo`. You orchestrate; subagents do the
per-project work using the same project-mode flow.

### Step G1 — Triage

`"$VBP" list-projects` already ran in Step 0. Show the table (`project · total ·
pending · episodes · memories · lastTouched`). Default: every project with
`pendingSessions > 0`; let the user exclude any.

### Step G2 — Fan out subagents (one per project)

**Permission warm-up first** (same as P3 — subagents can't prompt):

```bash
mkdir -p /tmp/memarium/_warmup && rmdir /tmp/memarium/_warmup
"$VBP" prepare --help >/dev/null
echo warmup > /tmp/memarium/_warmup.json && rm /tmp/memarium/_warmup.json
```

Then dispatch a `general-purpose` Agent per project in parallel (multiple Agent
calls in one message). Agents are **READERS ONLY** — they produce JSON, they do
NOT persist. (The shared index files `index.{memory,entity,qa,skips}.json` cannot
be written by parallel agents — concurrent load-mutate-save races drop entries; so
persistence is serialized by the orchestrator in G3.) Each agent's prompt:

```
You are a READER for project-mode /memarium, project '<slug>', per SKILL.md
P1–P8 (typed-memory only — NO book — and DO NOT persist anything):

  1. "$VBP" prepare --project <slug>
  2. Read each newSession's mdPath. Apply SKIP rules conservatively.
  3. Segment one-thread-per-session by default; merge only if continuous.
  4. For each non-skip thread produce an episodic {entry,body} (episodic-format.md:
     Context/What worked/Dead ends/Open questions/Decisions; sourceSessions = the
     full sessionId values, NOT shortId; work-status in body, NOT entry.status) +
     distilled semantic/procedural/core facts — for `procedural`, write the
     ABSTRACTED trigger→action RULE, not the session-specific fix (see P4b's ❌/✅);
     one session often yields several, and they are ADDITIVE — never a substitute
     for the episodic + must-have facts, and a non-skip thread never returns empty —
     + entity {entry,body} + qa {entry,body}.
  5. Write these as JSON FILES under /tmp/memarium/<slug>/ (use the Write tool):
     memory.json (episodics + non-gated semantic), gated.json (core/procedural/
     pinned/supersede/trust-elevation), entities.json, qa.json, and skips.json
     ([{sessionId,reason}] for both skipped threads AND prepare.filteredMetaSessions).
  Do NOT run memory-write / memory-propose / entity-write / qa-write / skip-write /
  finalize — the orchestrator persists SEQUENTIALLY. Return the count per file.

If you hit `permission denied`: STOP, return "permission denied: <pattern>", and
let the orchestrator re-run warm-up. Do NOT retry — you can't escalate.
```

Cap at ~4 agents in flight; queue the rest. If one fails, log it and continue.

### Step G3 — Persist sequentially, then finalize

The agents only produced JSON. Persist ONE PROJECT AT A TIME (never in parallel —
that's what avoids the concurrent-index-write races). For each project's
`/tmp/memarium/<slug>/`, in sequence, run only the files that are non-empty:

```bash
"$VBP" memory-write   --input /tmp/memarium/<slug>/memory.json
"$VBP" memory-propose --input /tmp/memarium/<slug>/gated.json     # if any gated
"$VBP" entity-write   --input /tmp/memarium/<slug>/entities.json  # if any
"$VBP" qa-write       --input /tmp/memarium/<slug>/qa.json        # if any
"$VBP" skip-write     --input /tmp/memarium/<slug>/skips.json     # if any
```

Then surface any gated proposals for review (`"$VBP" memory-diff --json`,
non-blocking), and commit the whole sweep once:

    "$VBP" finalize

Print a per-project summary (episodics + facts added) and the finalize result.

---

## Things you should NEVER do

- ❌ `Write` directly into `memory/**/*.md` — always go through `"$VBP"
  memory-write` / `memory-propose` so the index + gate stay in sync.
- ❌ Set `entry.status` to a work status (shipped/blocked/…) — it's the lifecycle
  axis (`active`/`superseded`/`pinned`); work status goes in the episodic body.
- ❌ Omit or fake `sourceSessions` on an episodic — it's the digest receipt; a
  wrong value re-digests the session forever or skips real work.
- ❌ Write an episodic for a SKIP'd session (ledger it instead), or force-merge
  unrelated sessions into a "bigger thread".
- ❌ Approve your own gated proposals, or blind-approve "all".
- ❌ Blogger voice ("let me walk you through", "we then"). Imperative agent-reuse.
- ❌ Hallucinate outcomes, or cross project boundaries.
- ❌ Touch anything in `raw_sessions/` — immutable source data.
- ❌ Run global-mode with cwd ≠ `~/.memarium/session-repo`.

## Things you should always do

- ✅ Run `"$VBP" list-projects` FIRST to detect mode.
- ✅ Default to one-thread-per-session; merge only when continuous.
- ✅ Be conservative with SKIP — write the episodic if in any doubt.
- ✅ Set `sourceSessions` correctly; keep `threadId`/episodic `id` stable across re-digests.
- ✅ Preserve exact code blocks, command lines, file paths, commit hashes — but write file paths repo-relative (never an absolute `/Users/…` home path; the write guard rejects it).
- ✅ Route gated (core/procedural/pinned/supersede/trust-elevation) through `memory-propose`.
- ✅ Record skipped sessions with `skip-write`, and `finalize` at the end.


