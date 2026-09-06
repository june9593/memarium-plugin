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
[ -x "$VBP" ] || VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js 2>/dev/null | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-)
if [ -x "$VBP" ]; then
  PRIMER=$("$VBP" memory-primer --cwd "$(pwd)" 2>/dev/null || true)
  if [ -n "$PRIMER" ]; then
    printf '## 📓 Project memory (memarium)\n\n%s\n' "$PRIMER"
    printf '\n### Recall before you dig in\n'
    printf 'This primer is automatic context, not a ranked recall query. Before exploring a relevant new task or prior decision, invoke the Skill tool with skill: "memarium:memarium-recall" to surface matching episodes, decisions and dead ends. For broader project context, use skill: "memarium:memarium-context". Reuse recall already done for the same task.\n'
  fi
fi
exit 0
