---
description: Two-stage ranked recall over your memarium typed memory. Stage 1 scores the project's episodes + facts + procedures against your task keywords; stage 2 reads the top entries. Use BEFORE (or while) exploring code in any project the user has synced.
---

Invoke the **memarium-recall** skill via the `Skill` tool with
`skill: "memarium-recall"`.

Use this **before** you start exploring code in a project repo where the
user has run memarium sync + digest. The skill walks you through two stages:

1. **Stage 1**: `"$VBP" recall --cwd "$(pwd)" --q "<task keywords>"` — get a
   relevance-ranked list of the project's typed memory (episodes / semantic
   facts / procedural gotchas / core rules), each with `title`, `summary`,
   `whyRecalled`, and an absolute `path`. `$VBP` is the plugin binary discovered
   in the skill's Step 0 (`ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-`).
2. **Stage 2**: `Read` the top 1–5 entries' `path` for the full bodies
   (episodes carry the arc / dead-ends / decisions).

Reference past findings explicitly when you reply.

This skill closes the read loop on `/memarium` (batch typed-memory digest) and
`/memarium-retro` (in-session typed-memory writer).
