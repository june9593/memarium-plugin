---
description: Digest synced sessions into chronicles + topics (per-project). Capture reusable insights as typed memory via /memarium-retro.
---

Invoke the **memarium** skill via the `Skill` tool with `skill: "memarium"`.

The skill walks you through:
1. Locate the plugin binary (`VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js | sort -V | tail -1)`).
2. Ask once: also capture reusable insights as typed memory via `/memarium-retro` afterward?
3. Run `"$VBP" orchestrate project --cwd "$(pwd)"` to prime the spool and detect mode.
4. Run `"$VBP" prepare --cwd "$(pwd)"` to discover unprocessed sessions.
5. For 0.7+ `manifest_version: 1` source md, navigate via the embedded
   manifest + Table of Contents instead of loading the whole body — see
   the skill's P3 chunked reading section for the targeted-Read pattern.
6. Segment sessions into threads (one chronicle per thread).
7. Write per-project chronicles (AI-first frontmatter, 4-section body) +
   topic pages (mid-grain subsystem index).
8. Run `"$VBP" publish --chronicles ... --topics ... --no-catalog` to
   commit + push.
9. If user opted in at step 2: chain into `/memarium-retro` to distill the
   session's one reusable insight into typed memory (semantic/episodic via
   `memory-write`; core/procedural/pinned/supersede via `memory-propose`).

Per-project isolation is a hard rule (publish.ts rejects missing
`project` field). Reusable-insight capture lives in memarium's own typed
memory layer now (`/memarium-retro`) — there is no external card tool.
