#!/usr/bin/env bash
# memarium plugin Stop hook — proactive in-session memory capture nudge.
#
# Fires at the end of every Claude Code turn. Nudges the agent to capture the
# reusable insight from THIS session into memarium typed memory NOW (via the
# /memarium-retro skill), instead of relying on the user to remember the batch
# /memarium digest later. Non-blocking — exits 0 unconditionally; the nudge is
# just context, the agent decides whether the session earned a memory.
{
  echo "## 🧠 memarium — capture what you learned"
  echo ""
  echo "If this turn involved code changes, an architectural decision, debugging, or"
  echo "non-trivial problem solving: invoke the \`/memarium-retro\` skill NOW, before"
  echo "ending your turn — distill the reusable insight into project memory (it goes"
  echo "through the typed-memory + review gate, and shows up on the next session)."
  echo ""
  echo "Skip only if this was purely informational, trivial, or you already captured it."
  echo "(Multi-device / full digest: \`/memarium\` batch-digests synced sessions; the"
  echo "\`memarium\` npm CLI syncs across machines: npm i -g memarium.)"
} 2>/dev/null || true
exit 0
