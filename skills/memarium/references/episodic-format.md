# Episodic format (the digest's per-thread receipt — AI-first, agent-reuse)

An **episodic** memory is what a work thread becomes when `/memarium` digests it.
It replaced the old "chronicle": same agent-reuse content (the arc, dead-ends,
decisions), but as a **typed memory entry**, not a separate book page. It is the
digest RECEIPT for its sessions — `entry.sourceSessions` is what marks those
sessions consumed (so they aren't re-digested).

Episodic is one of the four `MemoryType`s and uses the standard `MemoryEntry`
shape. You author it as a `{ entry, body }` item for `memory-write` (episodic is
NOT gated). The frontmatter fields ARE the index; the body carries the narrative
the fields can't.

```json
{
  "entry": {
    "id": "episodic/<project-slug>/<threadId-kebab>",
    "type": "episodic",
    "scope": "project:<project-slug>",
    "project": "<project-slug>",
    "title": "<≤60 chars, human-readable>",
    "summary": "<one line, keyword-bearing — it IS scored by recall>",
    "status": "active",
    "importance": 3,
    "confidence": 0.9,
    "sourceSessions": ["abc12345-6789-4abc-8def-0123456789ab"],
    "sourceFiles": ["chrome/browser/ui/.../foo.mm"],
    "sourceCommits": ["7bc9ef48b654"],
    "entities": ["FooController", "NSStatusBar", "fullscreen"]
  },
  "body": "## Context …\n## What worked …\n## Dead ends …\n## Open questions …\n## Decisions …\n\n**Work status:** shipped"
}
```

## Field mapping (old chronicle → episodic)

| Old chronicle field | Episodic home |
|---|---|
| `sessionIds` | `entry.sourceSessions` — the full `sessionId` from `newSessions` (NOT `shortId`); **the idempotency key; must be present + correct** |
| `files_touched` | `entry.sourceFiles` (scored via file-overlap) |
| `commits` | `entry.sourceCommits` (scored via commit-overlap) |
| symbols / APIs / concepts / tags | `entry.entities` (scored via keyword-overlap; also feeds the entity wiki) |
| title / one-liner | `entry.title` / `entry.summary` — **put keywords in `summary`; it's scored** |
| reusability / importance | `entry.importance` (0–5), `entry.confidence` (0–1) |
| Context / What worked / Dead ends / Open questions / Decisions | **body markdown sections** |
| work status (`shipped\|in-progress\|blocked\|abandoned`) | **a body line `**Work status:** …`** |

## ⚠️ Work status is NOT `entry.status`

`entry.status` is the memory **lifecycle** axis — it is only ever `active`,
`superseded`, or `pinned`. The work's outcome (shipped / blocked / abandoned)
goes in a **body line** (`**Work status:** blocked`). Setting
`entry.status: "blocked"` is invalid and will break scoring/filtering.

## Body sections

```markdown
## Context
1–2 sentences: the triggering scenario, enough that an agent landing here cold
knows what problem this thread was about.

## What worked
The path that shipped. Each bullet 1–2 sentences, imperative agent-reuse voice —
"Use X to achieve Y; commit Z", NOT "we then did X". Preserve commit hashes,
file paths, DCHECK strings verbatim; at most ONE small code block per section.

## Dead ends
Approaches tried that didn't work, and **why**, so the next agent doesn't
reproduce them. These often save more agent-time than the successes.

## Open questions
Uncertainties a future agent should know before extending the work (NOT a TODO
list — those are just prose here).

## Decisions
Architectural calls + the rejected alternative ("Used Glic widget over
CopilotBubbleView — the latter's lifecycle didn't fit floating UI").

**Work status:** shipped | in-progress | blocked | abandoned
```

If a section is genuinely empty, write `(none)` — an empty section signals
"considered, nothing came up"; a missing section signals "forgot to think".

## Rules

- **`sourceSessions` is load-bearing.** It's the digest receipt; use each session's
  **full `sessionId`** (from `prepare`'s `newSessions[].sessionId`) — NOT `shortId`
  (the 8-char truncation), or the session never matches the consumed check and
  re-digests forever. A wrong/missing value also risks skipping real work.
- **`summary` is scored** — write it keyword-dense (files, APIs, symptom), not vague.
- **Keep `threadId` stable** per real thread across re-digests — the `id` upserts,
  so a stable id refines rather than duplicates.
- **Imperative agent-reuse voice**, no narrator ("interestingly enough", "we then").
- **Don't hallucinate outcomes** — `**Work status:** blocked` beats an overstated
  "it shipped".
- **Match the source session's language** for body prose; keep section HEADINGS in
  English for cross-session consistency.
- Atomic durable facts/rules do NOT belong here — those are `semantic`/`procedural`
  typed memory (SKILL Step P4b). Episodic = the *arc*; semantic/procedural = the
  *extracted fact*.
