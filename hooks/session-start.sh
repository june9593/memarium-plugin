#!/usr/bin/env bash
# memarium SessionStart hook — read-only project-memory auto-injection.
#
# Fires at the start of every Claude Code session. Prints the cwd project's
# primer (core + semantic + procedural typed memory) so a new session starts
# already knowing the project — architecture, setup, gotchas, rules — without
# the user running /memarium-context manually.
#
# Strictly read-only: it only calls `memory-primer` (which never writes) and
# prints to stdout, which Claude Code injects as session context. Never blocks
# the session — exits 0 unconditionally, silent when there's no project memory.
VBP="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/memarium-plugin.js}"
[ -x "$VBP" ] || VBP=$(ls -td ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js 2>/dev/null | head -1)
if [ -x "$VBP" ]; then
  PRIMER=$("$VBP" memory-primer --cwd "$(pwd)" 2>/dev/null || true)
  if [ -n "$PRIMER" ]; then
    printf '## 📓 Project memory (memarium)\n\n%s\n\n> Run `/memarium-context` for deeper recall (episodes / conflicts / entities).\n' "$PRIMER"
  fi
fi
exit 0
