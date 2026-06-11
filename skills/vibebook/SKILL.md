---
name: vibebook
description: Digest already-synced raw_sessions into per-project book artifacts (chronicle / topics). Triggers on `/vibebook`. Two modes auto-selected by cwd — project-mode (cwd ≠ session-repo, digests just the matching project) or global-mode (cwd = session-repo, fan-out one subagent per pending project then regen catalog). Per-project isolated.
---

# /vibebook — write your book

This skill walks the **in-session Claude** (you) through digesting the user's
already-synced AI coding sessions into three per-project book artifacts. Pure
mechanical CLI handles I/O (`"$VBP" prepare` / `"$VBP" publish` /
`"$VBP" list-projects` / `"$VBP" catalog-regen`); the LLM work —
segmentation + writing — is yours, in this conversation, with full context.

## Inputs you assume

- The plugin's `orchestrate` step (run as Pre-step + Step 0 below) will
  scan the user's local `~/.claude/projects/` and Copilot Chat session
  jsonl, then write rendered `.md` + `.raw.json` into the spool at
  `~/.vibebook/session-repo/raw_sessions/...` and update
  `~/.vibebook/session-repo/.vibebook/index.json`. **You do not need to
  check whether sync ran first** — the plugin is self-contained and
  scans sessions itself on every invocation.
- If the user has ALSO installed the optional `vibebook` npm CLI for
  cross-device sync, that's fine — both write to the same spool with
  sessionId-keyed entries. Don't gate plugin work on the npm CLI being
  present; it is not required.

---

## Step −1 — Locate the plugin binary (DO THIS FIRST OF ALL)

`${CLAUDE_PLUGIN_ROOT}` is **not** populated in your in-session Bash
environment — it's only available inside Claude Code's hook subprocess.
So before any subcommand, discover the plugin's bin path and stash it
in a shell variable. Run:

```bash
VBP=$(ls -td ~/.claude/plugins/cache/*/vibebook/*/bin/vibebook-plugin.js 2>/dev/null | head -1) && echo "VBP=$VBP"
```

Confirm `$VBP` resolves to an existing file:

```bash
[ -x "$VBP" ] && "$VBP" --version
```

You should see `0.1.x` print. **If `$VBP` is empty or the version doesn't
print**, the plugin is not installed correctly — STOP and tell the user
they need to install via `/plugin install vibebook` (after adding the
marketplace `june9593/vibebook-plugin`). Do not fall back to checking
PATH for `vibebook` — that's a different (npm) product, not this plugin.

Every command in this skill below uses `$VBP` directly, e.g.
`"$VBP" prepare --cwd "$(pwd)"`. You must run all subcommands as
**`$VBP <subcommand>`** in the same shell where you set `$VBP`. If you
re-set `$VBP` in a later Bash call, that's also fine.

---

## Pre-step — First-run nudge (silent if already shown)

Before anything else, run:

```bash
"$VBP" first-run
```

This prints a one-time nudge if the user hasn't installed the optional
`vibebook` npm CLI for cross-device sync. Silent on every subsequent
invocation. Don't summarize the output to the user — just let it print.

## Step 0 — Spool warmup + mode detection (DO THIS FIRST)

Before reading any session data, prime the spool:

```bash
"$VBP" orchestrate project --cwd "$(pwd)"
```

(If you're in `~/.vibebook/session-repo/` or in a non-project dir, use
`orchestrate global` instead — see decision tree below.)

This (a) creates `~/.vibebook/session-repo/raw_sessions/` and `book/`
if absent, and (b) imports any new local `~/.claude/projects/` jsonl
into the spool. Idempotent. Read the JSON output:
- `mode`: "project" or "global"
- `project`: the project slug (project mode only)
- `scan.imported` / `scan.skipped`: how many sessions were copied this run
- `nextStep`: hint for what to do next

Then run `list-projects` for the mode-detection table:

```bash
"$VBP" list-projects
```

Read `meta.isInSessionRepo` and `meta.sessionRepoPath` in the output.

| `meta.isInSessionRepo` | Mode | What you do |
|---|---|---|
| `false` | **project-mode** | Digest only the project matching the user's cwd. Most common case — user opened Claude Code inside a normal coding repo and is asking you to write up that project's recent work. |
| `true` | **global-mode** | User is sitting in `~/.vibebook/session-repo`, asking for a full sweep. Fan out one subagent per project that has pending sessions; finish with a catalog regen. |

**Tell the user which mode you detected** in one line, then proceed to the
matching section below. Do not try to guess; trust `list-projects`.

---

# Project mode

*(Project mode begins at Step P1.)*

### Step P1 — Prepare for cwd's project

```bash
"$VBP" prepare --cwd "$(pwd)"
```

If this errors with `no synced sessions found for cwd '...'`, the spool
has no sessions matching the current cwd's project. Tell them which
`project` slug you tried (`projectSlugFromPath(cwd)`), then either:
- ask them whether `$(pwd)` is correct (the plugin scans local
  `~/.claude/projects/` automatically — if they really worked here in
  Claude Code or Copilot, sessions should be there), or
- ask them to pass `--project <slug>` if they meant a different project
  (e.g. they cd'd into a subdir but want the parent project's sessions).

The payload shape:

```json
{
  "project": "edge-src",
  "newSessions": [
    {
      "sessionId": "abc12345", "shortId": "abc12345",
      "tool": "claude" | "copilot",
      "endedAt": "2026-04-22T15:30:00Z",
      "mdPath": "raw_sessions/claude/edge-src/2026-04-22/...md",
      "preview": "first 300 chars of user's first real message",
      "insightScore": 0.62
    }
  ],
  "existingTopics": ["native-ui-fullscreen", "bookmark-bar", ...],
  "existingCards": ["gotcha-immersive-mode-mac-uaf", ...]
}
```

**Show the user** a summary line (`N new sessions in <project>`) and ask
to proceed. **Don't print the full table** unless the user asks — just the
count + first-3 displayName previews so they can sanity-check.

### Step P2 — Segment into threads

**Default: one thread = one session.** Only merge sessions if they are
demonstrably the same continuous effort (same threadId style, same files
touched, narrative obviously picks up where the previous one left off).
When in doubt, leave them separate. **Many small chronicles beat one bloated
mega-thread** — and you will under-count if you over-merge.

**Read the actual md file** (`mdPath`) for every session before deciding —
not just the preview. The preview can mislead (a session can open with "I
need to research" but turn into a 6KB debugging session).

> **Encryption is transparent.** Working tree is always plaintext. If you
> see `MEMVC1` at the top of any md file, the git filter wasn't installed
> here — tell the user to run `vibebook crypt init` and stop.

#### Reading a 0.7+ `manifest_version: 1` md (chunked navigation)

vibebook 0.7+ writes a per-session manifest + Table of Contents at the top
of each raw_sessions md, so you can navigate huge sessions (9MB+, 10000+
turns) without loading the whole body. **Always check for this first:**

```
Read offset:0 limit:80 <mdPath>
```

If the frontmatter contains `manifest_version: 1`, the file is navigable:

- The frontmatter carries `user_turns`, `assistant_turns`, `tools_used`
  (histogram), `commits`, `files_touched` (deduped, up to 200), and
  `candidate_decisions` (heuristic — keyword matches like 我决定 / decided to /
  ok merged — useful hints, not authoritative).
- A `# Table of Contents` table follows the frontmatter. Each row has a
  `→L<number>` column = absolute line number of that turn's heading.
  Marker legend: 🧑 real user turn, ✏️ file edit, 💾 commit/tag, 🤖
  substantive assistant reply.

**Navigation pattern:**

1. The first Read (lines 0–80) gave you the frontmatter + start of TOC.
   Continue reading the TOC region as far as needed (TOC is usually 200–500
   rows for a long session, plan for a second Read of ~500 lines).
2. From the manifest, you already know files_touched + commits — that's
   80% of what most chronicles need.
3. Pick the 3–10 TOC rows most relevant to the work thread (e.g., commits
   near a thread's end, decisions, last user turns). Pull each with
   `Read offset:<L> limit:200`.
4. Only fall back to whole-file Read if the manifest is missing key
   context the TOC can't surface (rare — usually the session is genuinely
   pre-0.7 and lacks manifest_version).

If the frontmatter does NOT have `manifest_version: 1` (older 0.6 md),
read the whole file the old way. Existing 0.6 sessions will stay
pre-manifest until their source jsonl changes and triggers a re-sync.

#### SKIP rules — be conservative

A session may be marked `skip: true` ONLY when ALL of these hold:

- It contains **no code change, no debugging conclusion, no decision**.
- It's one of: pure greeting, single unanswered question, "test this skill /
  ping", session-resume noise, or a string of API errors with no real reply.
- The user **explicitly abandoned** it ("nvm, gonna try elsewhere") OR the
  whole transcript is < ~500 chars of useful content.

**Always SKIP — vibebook meta-sessions.** A session whose entire content is
the user invoking `/vibebook` (or otherwise driving this skill) has zero
chronicle value — it's the user *running* the digest pipeline, not doing
real work. Detect via any of:

- The first user message is exactly `/vibebook` (or `/vibebook ...`).
- The transcript is dominated by `"$VBP" prepare` / `"$VBP" publish` /
  `"$VBP" list-projects` / `"$VBP" catalog-regen` tool calls.
- The assistant's output is mostly chronicle/topic/card markdown bodies
  being written to `/tmp/vibebook-*.json` or directly into `book/`.
- Project slug is `home` or any other pseudo project (already filtered by
  `isRealProjectPath`, but double-check at thread-segmentation time).

Mark these `skip: true` with `skipReason: "vibebook meta-session — user
running the digest skill, no original work content"`. Do NOT chronicle
them; they would just be self-referential noise.

**If in doubt, write the chronicle.** A 4-section chronicle for a "I tried X
and it didn't work" session is still valuable — it records the dead end.
Past sessions over-SKIPped and dropped 80%+ of real work; do not repeat
that mistake. The meta-session rule is the ONE exception where SKIP is the
default, not the conservative choice.

In particular, you must NOT SKIP:
- "Continue from where you left off" — read the previous session and merge.
- Sessions whose body has any of: a commit hash, a code block, a file path,
  an error message, a decision marker ("decided / let's go with / ok merged").
- Sessions where the user attached an image or a log and asked for analysis,
  even if your reply was short.
- Sessions with `untitled` filename — read the body; usually they're real
  work where the first message wasn't a question.

Write the segmentation to `/tmp/vibebook-groups.json`:

```json
[
  { "threadId": "fix-fullscreen-bookmark-bar",
    "title": "Fix Edge fullscreen bookmark-bar bug",
    "sessionIds": ["abc12345", "def67890"],
    "skip": false },
  { "threadId": "ping-test",
    "sessionIds": ["xyz99999"],
    "skip": true, "skipReason": "pure ping test, no real work content" }
]
```

Show user the table (one row per non-skip thread) + the skip count + skip
reasons in one block. Ask to proceed.

### Step P3 — Read in parallel via subagents (when total source size warrants it)

**When to fan out (NEW heuristic, 0.1.9; refined for 0.7+ chunked reads):**

Don't trigger on session count alone. Trigger on **effective read size** of
non-skip threads. With 0.7+ `manifest_version: 1` md, the effective read
size is the manifest + TOC + ~5 targeted segments (~100KB total), NOT the
full file size. For pre-0.7 md (no manifest), it's the full file size.

| Total effective read size | Strategy |
|---|---|
| **< 150 KB** | Inline. One Read per thread, write chronicle in main session. Don't pay subagent overhead for small inputs. |
| **150 KB – 1 MB** | Fan out, batch ~3–5 threads per agent, **all in one message**. |
| **> 1 MB** | Same as above BUT **isolate each session whose effective size ≥ 200 KB into its own dedicated agent** — large reads dominate latency, mixing them with small ones blocks the small ones. |

For 0.7+ navigable md, a 9MB file's effective read size is only ~100KB
(header + TOC + selective body reads), so most sessions will land in
the inline tier even if the on-disk md is huge.

Inline below 150 KB is faster end-to-end because:
- 5+ threads at 5 KB each = 25 KB total = main session reads them in <10 seconds
- Each subagent has 3–5 second startup overhead
- Subagents can't share parsed context across chronicles
- You won't hit a context window for 25 KB

Below the threshold, **just open the files and write**. Don't fan out.

**Anti-pattern:** looping `vibebook show <id>` in the main session for 50
threads — eats your context window and produces lower-quality writing
because you start cargo-culting your own previous chronicles.

#### CRITICAL — How to actually run agents in PARALLEL

Subagents only run in parallel when you put **multiple `Agent(...)` tool
calls in a single assistant message**. If you write one `Agent(...)`,
wait for it to complete, then write another, those run **serially** —
6 agents at 5 minutes each = 30 minutes wall-clock.

**Correct pattern (parallel):**

In ONE assistant message, emit ALL of:
```
Agent(description: "Chronicle batch 1", prompt: "...")
Agent(description: "Chronicle batch 2", prompt: "...")
Agent(description: "Chronicle batch 3", prompt: "...")
```

The harness fires all three concurrently. Total wall = max(individual),
not sum.

**Wrong pattern (serial, what was happening before this rewrite):**

Message 1: `Agent("...batch 1...")` → wait for completion
Message 2: `Agent("...batch 2...")` → wait for completion

If you find yourself writing one Agent call, then waiting, then writing
another, **STOP** and put them all in the next single message.

#### Progress reports — DO NOT silently wait

When you've fanned out N agents, the user will see "Running…" and not
much else. Subagents writing chronicle bodies routinely take 2–10
minutes per agent (LLM-bound: read source md → reason → write JSON).
**The user has no way to tell waiting apart from stuck.**

Required cadence: every **3 minutes of wall-clock**, emit a one-line
status to the user, e.g.:

> "3 of 6 chronicle agents finished (batch sizes: ✓2 ✓3 ✓2 / ⏳3 ⏳4 ⏳5).
> Largest pending: 3db31cbd (342 KB md). Estimated 5–8 more minutes."

Use the **PushNotification tool** (when available) for any wait that
exceeds 8 minutes; the user may have switched away from the terminal.
The notification body can be one short line — "vibebook fan-out: 4/6
chronicle agents done, 2 still running".

If a single agent has been running > 15 minutes, suspect it's stuck on
a malformed Read or oversized output. Use Stop Task on it and re-
dispatch with that one session split off solo.

#### Permission warm-up — DO THIS BEFORE FAN-OUT, ONCE PER SESSION

Subagents in Claude Code **cannot interactively prompt the user for
Bash / Write permission** — that ability is exclusive to the main
session. If your fan-out fires before the user has approved the
patterns subagents need (writing JSON to `/tmp/vb-<project>/`,
running `"$VBP" publish`, etc.), each subagent will silently
stall, fall back to a different MCP tool, or return "permission
denied" without doing the work.

Before the first `Agent(...)` call in P3 (and before P5 / P6 sub-
fan-outs that write to `/tmp/`), run these warm-ups **inline in the
main session**. Each will trigger one `[Always allow ?]` prompt the
user can accept once:

```bash
mkdir -p /tmp/vb-<project>/_warmup && rmdir /tmp/vb-<project>/_warmup
# triggers Bash(mkdir -p /tmp/vb-<project>/*) approval

"$VBP" prepare --help >/dev/null
"$VBP" publish --help >/dev/null
# triggers Bash("$VBP" prepare *) and Bash("$VBP" publish *) approval

echo warmup > /tmp/vb-<project>/_warmup.json && rm /tmp/vb-<project>/_warmup.json
# triggers Write to /tmp/vb-<project>/* approval
```

Replace `<project>` with the actual project slug (e.g. `vb-edge-src`).
Tell the user to accept the BROAD pattern (the one with `*`) rather
than the literal call — one acceptance covers every subagent for the
rest of the session.

**Skip this only if** you've already warmed up earlier in the same
session, or the user has the patterns pre-approved in
`~/.claude/settings.json`.

If a subagent comes back with "permission denied", do NOT have the
subagent retry — it can't escalate. Run the warm-up from the main
session, then re-dispatch (or SendMessage to the same agent).

#### Probe BEFORE big fan-out — catch tool-access gaps early

Some users have Claude Code configured so subagents have NO Write
capability at all (not just path-specific permissions). In that case,
warm-up doesn't help — subagents will silently complete with no
output. Dispatching 13 of them and waiting 5 minutes is wasted.

**Before fan-out of N agents, run ONE probe agent first.** The probe
must exercise the SAME tool the chronicle agents will use (Write,
not Bash heredoc — see "Force agents to use Write" below):

```
Agent(
  description: "Probe write access",
  subagent_type: "general-purpose",
  prompt: "Use the Write tool (NOT Bash with heredoc) to create /tmp/vb-<project>/probe.txt with the literal contents 'probe-ok'. Then read it back via the Read tool and report what you read. If Write tool is unavailable, say so explicitly."
)
```

Then verify from main session:

```bash
cat /tmp/vb-<project>/probe.txt 2>&1 | head -1
```

- If you see `probe-ok` AND the agent confirmed using Write tool →
  subagents work; proceed with full fan-out.
- If file missing OR agent reported "Write tool unavailable" → **fall
  back to inline writing in the main session**. Don't fight it. Tell
  the user once:
  > "Your Claude Code config doesn't allow subagents the Write tool, so
  > I'll do all chronicle writing inline. This may take longer for
  > large session sets."

The probe wastes ~20 sec but saves the 30+ min of unattended-serial-
agent failure that costs much more token + time.

#### Force agents to use Write tool, not Bash heredoc

In your fan-out agent prompt, **explicitly require the agent to use
the Write tool** for the JSON output, not Bash with `cat <<EOF` or
`>` redirection. Reasons:

- Bash heredoc fails on JSON containing single backticks, certain
  Unicode, or shell expansions in nested code blocks.
- Write tool is faster (no shell process).
- Probe (above) only confirmed Bash works — Write tool may be
  separately gated; chronicle agents that fall back to Bash silently
  succeed at writing junk.

Add this line to every fan-out agent prompt:

> "Output JSON via the Write tool (path: /tmp/vb-<project>/agent<N>.json).
> Do NOT use Bash heredoc or shell redirection. If Write tool is
> unavailable, stop and report 'no write tool' — do not fall back."



### Step P4 — Write chronicles (AI-first format, agent-reuse body)

For each non-skip thread, write a chronicle markdown using the AI-first
format spec'd in `references/chronicle-format.md` (same directory).
Critical rules:

- **Frontmatter is the index.** Fill files_touched / commits / decisions /
  blockers / next_steps / status from the source session. AI agents
  triage chronicles by reading frontmatter ONLY — missing fields mean
  invisible to recall queries.
- **Body is structured agent-reuse experience, not a weekly report.**
  Four sections — `## Context`, `## What worked`, `## Dead ends`,
  `## Open questions`. NOT What/Why/How/Outcome (that was the human-
  reading template; we deprecated it because agents have to re-parse
  it back into structured form every time).
- **Voice = imperative agent-reuse.** "Use X to achieve Y; commit Z" —
  NOT "we then did X and it was interesting". Imagine the reader is
  another AI agent on a similar task next month.
- **Dead ends matter as much as What worked.** Failed approaches save
  more agent-time than successes by preventing rediscovery. Don't
  skip the Dead ends section. If genuinely none, write `(none)` —
  empty section signals "considered, none came up", missing section
  signals "I forgot to think about it".
- **Atomic insights → Step P7.5.** If the chronicle inspires a "next time
  remember X" insight, capture it as `procedural`/`semantic` typed memory in
  Step P7.5 (not here). Skip atomic-insight prose here.
- Preserve commit hashes / file paths / code blocks / command lines
  verbatim. Paste at most ONE small code block per section when the
  literal form genuinely matters (DCHECK message, magic constant).
- Do NOT hallucinate. Use `status: blocked` + a `blockers` entry instead
  of overstating. If something didn't land, the `status` field says so.
- When writing What worked / Dead ends / Open questions, scan the last
  few messages of the source session — users often drop "ok merged" /
  "didn't work" / "still don't know if this races" right at the end.

**Build the JSON incrementally** — `Write` to `/tmp/vibebook-chronicles.json`
one chronicle at a time, OR write each chronicle to
`/tmp/vb/chronicle-<threadId>.json` and merge at the end with a small Python
pass. **Never `cat > /tmp/x.json << 'PYEOF'` heredoc with all bodies in
one shot** — that triggers Bash injection prompts and hits cloudflare 524
on big batches.

**`project`, `threadId`, `title` MUST appear at the TOP LEVEL of each JSON
entry, not only inside the markdown frontmatter.** publish reads the JSON
top level to compute paths; if `project` is missing publish refuses with
`chronicle.project is required`. The same rule applies to topics
(`project` + `topicSlug`). Schema:

```json
[
  { "threadId": "fix-fullscreen", "project": "edge-src",
    "title": "Fix Edge fullscreen bookmark-bar bug",
    "sessionIds": ["abc12345"], "tags": ["fullscreen"],
    "body": "---\nproject: edge-src\n...\n---\n# ...\n## What...\n" }
]
```

**Never write a Python script that generates chronicle bodies.** The bodies
ARE your output as the LLM. Python is fine for: merging JSON files, sorting,
deduplicating slugs. NOT for writing prose.

### Step P5 — Update topic pages

Decide which **topic(s)** each non-skip thread touches. Topic = mid-grain
subsystem (`native-ui-fullscreen`, `bookmark-bar`, `mojo-ipc`,
`crash-debugging-macos`). Not a single bug; not the whole project.

A thread can touch 0, 1, or many topics. Multiple threads usually touch
the same topic.

For each affected topic:

- **If it exists** (in `existingTopics[]`): `Read book/<project>/topics/<slug>.md`
  full text → preserve every historical fact → fold the new thread's facts
  + relations into a coherent rewrite (`action: "update"`). The publish
  step backs the old page up to `<slug>.md.bak`.
- **If it doesn't exist**: create it (`action: "insert"`) with the schema in
  `references/topic-format.md`.
- **If a thread is too ad-hoc to fit any topic**: skip topic creation. Not
  every chronicle needs a topic.

**Wikilinks** — write `[[chronicle/<threadId>]]` directly in topic +
chronicle bodies as human-friendly placeholders. `"$VBP" publish`
mechanically rewrites them to real relative-path markdown links. Use
bare `threadId`, NOT a date-prefixed filename.

Write topics to `/tmp/vibebook-topics.json`:

```json
[
  { "topicSlug": "native-ui-fullscreen",
    "project": "edge-src",
    "action": "update",
    "contributingThreads": ["fix-fullscreen-bookmark-bar", "immersive-mode-rewrite"],
    "body": "..." }
]
```

### Step P6 — Atomic insights

Atomic "next time remember X" insights are no longer a separate card layer.
Capture them as `procedural` or `semantic` typed memory in Step P7.5 below.
Don't write a separate atomic-card artifact here.

### Step P7 — Confirm + publish

Show the user:

```
About to publish to book/<project>/:
  Chronicles: N (S SKIP'd)
  Topics:     M (X update / Y new)

Confirm? (y/n)
```

If user wants to tweak something, do it now (you can rewrite any artifact —
just re-emit the JSON). Then publish:

```bash
"$VBP" publish \
  --chronicles /tmp/vibebook-chronicles.json \
  --topics /tmp/vibebook-topics.json \
  --no-catalog
```

`--no-catalog` because project-mode is incremental — the catalog will be
regenerated next time the user runs global-mode `/vibebook`. Skipping it
here keeps the commit small and avoids touching files for other projects.

publish does:

1. Inserts each chronicle to `<repoPath>/book/<project>/chronicle/...md`
   (refuses on threadId collision).
2. Topics: backs old `.md` up to `<slug>.md.bak` if existed, writes new.
3. Resolves `[[wikilinks]]` against the live BookIndex.
4. Stages ONLY the files it wrote + `.vibebook/index.book.json`.
5. Commits + pushes the device branch.

If unresolved wikilinks remain, publish prints them at the end. Read the
warning, fix in a follow-up batch (`"$VBP" publish` is idempotent — already-
inserted chronicles refuse via threadId collision, so you can re-run with
just the new artifacts).

### Step P7.5 — Distill typed memory

After chronicles/topics are published, distill durable typed memory for this
project so future sessions start informed. Write a JSON array to
`/tmp/vibebook-memory.json` where each item is `{ entry, body }`:

- **core** — never-forget rules (rare; e.g. release/workflow rules). scope
  `global`/`user`/`project:<slug>`.
- **semantic** — project facts / architecture / decisions that are durably
  true. If a new fact replaces an old one, set `supersedes: <old-id>`.
- **procedural** — how-to playbooks + gotchas ("to add X, do Y; watch out for Z").
- **episodic** — a lightweight pointer per significant thread: title +
  summary + `sourceSessions`, body = 1-2 lines linking to the chronicle.
- **artifact** — notable commits/PRs/files (optional).

`id` is a stable globally-unique slug: `<type>/<project|_global>/<kebab-slug>`.
Fill `entities` with file paths / symbols / APIs the memory is about (powers
retrieval). Set `importance` 0-5 and `confidence` 0-1. Then:

    "$VBP" memory-write --input /tmp/vibebook-memory.json

This writes `memory/<type>/...` md + updates `.vibebook/index.memory.json`.
Then run a query to refresh the project primer:

    "$VBP" memory-query --cwd "$(pwd)" >/dev/null

Be conservative: a few high-value memories beat many trivial ones. Don't
duplicate what's already in the index (it was loaded at session start via
`/vibebook-context`).

### Step P7.6 — Synthesize entity wiki (personal knowledge base)

After typed memory, grow the project's **entity wiki** — one living page per
salient entity (file / symbol / API / concept / person) that aggregates what's
known about it across sessions. This is the knowledge-base layer; it's
SEPARATE from typed memory (an entity page is a synthesis/reverse-index, not a
fact with a lifecycle).

1. Pick the few entities this session is genuinely *about* (e.g. a core file
   you changed, an API you learned, a recurring concept). Be conservative —
   one page per real entity, not per mention.
2. For each, pull existing context so you update rather than overwrite:

       "$VBP" entity-query --cwd "$(pwd)" --entity "<name>"

   This returns three things in the JSON payload:
   - `matchedEntities`: array of `{ entry, body }` — entity pages whose `title`
     or any `aliases[]` equals `<name>` (case-insensitive), with their full `.md`
     file contents as `body`. This is the existing page to update in place.
   - `referencingMemories`: typed memories that mention this entity (by title or
     `entities[]` field) — your raw material for synthesising the updated page.
   - `entities`: the full ranked entity list (unfiltered browse), always present.
3. Write a JSON array to `/tmp/vibebook-entities.json` where each item is
   `{ entry, body }`:
   - `entry`: `id` = `entity/<project|_global>/<kebab-slug>`, `kind` =
     `file|symbol|api|concept|person`, `scope`/`project`, `title`, `aliases`,
     `sourceMemoryIds` (the referencing memory ids), `sourceSessions`,
     `sourceFiles`, `relatedEntities` (other entity ids — the graph),
     `createdAt`/`updatedAt`.
   - `body`: one-line definition + **What it is** + **Key facts** + **Gotchas**
     + **Related** (reference chronicles/memories/other entities by name; don't
     copy them). Imperative, agent-reuse voice.
4. Persist:

       "$VBP" entity-write --input /tmp/vibebook-entities.json

   Writes `memory/entities/...` md + updates `.vibebook/index.entity.json`.

Skip this step entirely if the session produced no durable entity worth a page.

### Step P7.7 — Distill Q&A (`qa/` answer layer)

After typed memory (P7.5) and entity wiki (P7.6), scan THIS session for high-reuse question→answer pairs worth filing as `qa/` pages. **Conservative — prefer writing nothing over writing noise.**

Write a Q&A page ONLY when ALL four hold:
1. the **user actually asked** the question (not a fact you inferred),
2. it was **resolved within the session**,
3. the answer has **reuse value** ("you'll genuinely ask this again"),
4. it has **clear sources** (chronicle / commit / memory id / session id).

Only these kinds qualify: **compound questions, troubleshooting conclusions, decision rationale, operational routes.** Do NOT rewrite ordinary facts into Q&A form — those belong in typed memory (P7.5) or entity pages (P7.6). A qa page references memories/entities/chronicles via its structured fields; it never duplicates their content.

For each qualifying pair, build an item and call `qa-write` with JSON shaped like:

```json
[{
  "entry": {
    "scope": "project:<slug>",
    "project": "<slug>",
    "question": "<the user's question, single line>",
    "answerSummary": "<one-line gist of the answer>",
    "kind": "operational",
    "tags": ["..."],
    "sources": ["chronicle:<id>", "commit:<sha>"],
    "sourceMemoryIds": ["<memory id>"],
    "sourceSessions": ["<session id>"],
    "relatedEntities": ["entity/<...>"],
    "createdAt": "<YYYY-MM-DD>",
    "updatedAt": "<YYYY-MM-DD>"
  },
  "body": "<the full reusable answer in markdown — multiple paragraphs OK>"
}]
```

Run `vibebook-plugin qa-write --input <that-json-file>`. The CLI derives the stable `id`/`path`, normalizes `question`/`answerSummary` to single lines, writes `memory/qa/<project|_global>/<slug>.md`, and updates `.vibebook/index.qa.json`. Re-asking a known question upserts (refines) the existing page — do not fork. **If nothing qualifies, write nothing and move on.**

### Step P8 — Done

Print a one-line summary:

```
✓ Published to book/<project>/: N chronicles, M topics.
✓ Pushed to <device-branch>.
```

That's it for project-mode. The user can now `cd ~/.vibebook/session-repo && claude → /vibebook`
later to do a global sweep across all projects.

---

# Global mode

Triggered when cwd = `~/.vibebook/session-repo`. The user wants a full
sweep across every project. You orchestrate; subagents do the per-project
work using the same project-mode flow.

### Step G1 — Triage

`"$VBP" list-projects` already ran in Step 0. Show the user the table:

```
project              total  pending  chronicles  topics  cards  lastTouched
edge-src                75       68           7       2     12  2026-04-22
chromium-src            53       43          10       3      8  2026-04-22
edge-claude-code        21       18           3       1      4  2026-04-15
...
edge-misc                4        4           0       0      0  —

12 projects pending; 0 already covered (lastTouched=null AND pending>0 means
"never digested").
```

Confirm with user which projects to process this run. Default: every project
with `pendingSessions > 0`. Let user exclude any.

### Step G2 — Fan out subagents (one per project)

#### Permission warm-up — DO THIS FIRST

Same rationale as project-mode P3 (subagents can't prompt the user
for permission). Before the first `Agent(...)` call, run inline:

```bash
mkdir -p /tmp/vibebook/_warmup && rmdir /tmp/vibebook/_warmup
"$VBP" prepare --help >/dev/null
"$VBP" publish --help >/dev/null
echo warmup > /tmp/vibebook/_warmup.json && rm /tmp/vibebook/_warmup.json
```

Tell the user to approve the BROAD pattern (e.g. `Bash(vibebook
prepare *)`, not the literal `--help` invocation). Skip if already
warmed up earlier in the session or pre-approved in
`~/.claude/settings.json`.

#### The actual fan-out

For each project to process, dispatch a `general-purpose` Agent in parallel
(via multiple Agent tool calls in one message). Each agent's prompt:

```
You are running project-mode /vibebook for project '<slug>'. Steps to follow,
verbatim from skills/vibebook/SKILL.md sections P1–P7:

  1. Run: "$VBP" prepare --project <slug>
  2. For every newSession, Read its mdPath. Apply SKIP rules conservatively
     (read the SKIP rules in SKILL.md project-mode Step P2 — only ping/greeting/
     pure-error sessions get skipped; everything else gets a chronicle).
  3. Segment one-thread-per-session by default; merge only when it's the
     same continuous effort.
  4. Write an agent-reuse 4-section chronicle for each non-skip thread
     (Context / What worked / Dead ends / Open questions; imperative
     voice; preserve commit hashes / file paths / code blocks verbatim).
  5. Update or insert topic pages (mid-grain subsystem level). Read existing
     topic pages and preserve historical facts when rewriting.
  6. Run: "$VBP" publish --chronicles ... --topics ... --no-catalog

Write your three input JSON files under /tmp/vibebook/<slug>/ so we don't
collide with sibling subagents.

Return a one-line summary of counts. Do NOT regen the catalog — the
orchestrating session will do that once after all subagents finish.

If you hit a `permission denied` on a Bash or Write tool: STOP, return
"permission denied: <pattern>" as your summary, and let the orchestrator
re-run the warm-up. Do NOT retry the same command — you can't escalate.
```

**Don't run them all at once if there are 10+ projects** — Claude Code has
limits on concurrent subagents. Cap at 4 in flight; queue the rest.

If a subagent fails (especially with `permission denied`), log it but
continue with the next batch — the user can re-run `/vibebook` against
that project later in project-mode after the warm-up has approved the
needed patterns.

### Step G3 — Catalog regen

After all subagents return:

```bash
"$VBP" catalog-regen
```

This regenerates `book/index.md`, `book/_meta/timeline.md`, and
`book/<project>/index.md` for every project, then commits + pushes.

### Step G4 — Summary

```
✓ Global sweep complete.
  edge-src:        +6 chronicle, +2 topic
  chromium-src:    +5 chronicle, +1 topic
  ...
  catalog regenerated and pushed.
```

---

## Things you should NEVER do

- ❌ `Write` directly into `book/<project>/{chronicle,topics}/*.md` —
  always go through `"$VBP" publish` so wikilinks resolve and the index
  stays in sync.
- ❌ Write a chronicle for a SKIP'd session.
- ❌ Force-merge unrelated sessions to make a "bigger thread".
- ❌ Write blogger-style "let me walk you through" / "interestingly
  enough" / "we then" prose. Body voice is imperative agent-reuse:
  "Use X to achieve Y" — not "we did X and discovered Y".
- ❌ Hallucinate outcomes. If user didn't say it worked, don't say it worked.
- ❌ Cross project boundaries (edge-src content ending up in chromium-src/).
- ❌ Skip Step P7.5. Distilling typed memory is what lets future sessions start already knowing the project.
- ❌ Skip the `Read` of an existing topic page before rewriting it.
- ❌ Touch any file in `raw_sessions/` — those are immutable source data.
- ❌ Run global-mode `/vibebook` with cwd ≠ `~/.vibebook/session-repo`. The
  cwd check is the mode trigger; do not override.

## Things you should always do

- ✅ Run `"$VBP" list-projects` FIRST to detect mode.
- ✅ In project-mode, derive project from cwd (`"$VBP" prepare --cwd`).
- ✅ Default to one-thread-per-session; merge only when continuous.
- ✅ Be conservative with SKIP — write the chronicle if in any doubt.
- ✅ Use Read / Glob / Grep to inspect existing book/ before writing topics.
- ✅ Preserve exact code blocks, command lines, file paths, commit hashes.
- ✅ Mark uncertainty: "unfinished", "unverified", "blocked".
- ✅ Stop and ask if user said something contradicting your plan.
