---
description: Digest synced sessions into chronicles + topics (per-project). Atomic cards delegated to memex when installed.
---

Invoke the **vibebook** skill via the `Skill` tool with `skill: "vibebook"`.

The skill walks you through:
1. Locate the plugin binary (`VBP=$(ls -td ~/.claude/plugins/cache/vibebook/vibebook/*/bin/vibebook-plugin.js | head -1)`).
2. (If memex is installed) Ask once: also kick off `/memex-retro` afterward?
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
9. If user opted in at step 2: chain into `/memex-retro` for atomic cards.

Per-project isolation is a hard rule (publish.ts rejects missing
`project` field). Cards are no longer written by vibebook itself — that
workflow belongs to memex.
