---
description: Capture the reusable insight from THIS session into memarium typed memory, in-session. Invoke proactively at task end — after code changes, architectural decisions, debugging, or non-trivial problem solving. The lightweight live counterpart to the batch /memarium digest.
---

Invoke the **memarium-retro** skill via the `Skill` tool with
`skill: "memarium-retro"`.

Use this **at the end of a task** — after code changes, an architectural
decision, debugging, or non-trivial problem solving — to distill what you
learned into memarium's **typed memory** so the next session (on this or
another device) starts already knowing it. Invoke proactively; don't wait
for the user to ask.

The skill:
1. Asks whether THIS session produced a reusable insight (skip if trivial).
2. Picks the memory type (core / semantic / episodic / procedural), runs a
   fact-hygiene check (WHO / WHAT-WHEN / RELATIONSHIP), and dedups against
   existing memory via `memory-query`.
3. Writes it — `memory-write` for `semantic`/`episodic`; `memory-propose`
   (the v4 review gate) for `core`/`procedural`/pinned/supersede changes.

This is the live counterpart to `/memarium` (which batch-digests already-
synced sessions into chronicles + memory). They coexist by dedup.
