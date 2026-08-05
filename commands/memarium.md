---
description: Digest already-synced sessions into a per-project typed Memory OS — episodic memories (one per work thread) + semantic/procedural/core facts + entity wiki + distilled Q&A. AI-native; no human book.
---

Invoke the **memarium** skill via the `Skill` tool with `skill: "memarium:memarium"`.

The skill walks you through (typed-memory only — there is no book/chronicles/topics):
1. Locate the plugin binary (`VBP="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/memarium-plugin.js}"; [ -x "$VBP" ] || VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-)`).
2. Run `"$VBP" orchestrate project --cwd "$(pwd)"` to prime the spool and detect mode.
3. Run `"$VBP" prepare --cwd "$(pwd)"` to discover un-digested sessions (those not
   referenced by an episodic memory and not skip-ledgered).
4. For 0.7+ `manifest_version: 1` source md, navigate via the embedded manifest +
   Table of Contents instead of loading the whole body (P3 chunked reading).
5. Segment sessions into threads (one **episodic** per thread).
6. Write an episodic `{entry, body}` per non-skip thread (`references/episodic-format.md`:
   Context / What worked / Dead ends / Open questions / Decisions; `sourceSessions`
   correct; work-status in the body, NOT `entry.status`), plus distilled
   `semantic`/`procedural`/`core` facts, the entity wiki, and Q&A.
7. Persist via `"$VBP" memory-write` (non-gated: episodic/plain-semantic) and
   `"$VBP" memory-propose` (gated: core/procedural/pinned/supersede/trust-elevation);
   surface proposals for review.
8. Record skipped sessions with `"$VBP" skip-write`, then `"$VBP" finalize` to commit + push.

Per-project isolation is a hard rule. This is the batch digest; `/memarium-retro`
is its lightweight in-session counterpart (capture one insight live).
