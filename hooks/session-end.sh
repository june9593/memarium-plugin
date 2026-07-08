#!/usr/bin/env bash
# memarium plugin Stop hook — smart-gated proactive in-session memory capture.
#
# Fires when Claude finishes a turn. Instead of echoing a nudge that the model
# never sees (plain Stop-hook stdout is NOT fed back to the agent), it pipes the
# Stop event JSON to `retro-gate`, which decides — read-only — whether the turn
# did substantive work (a file mutation, not yet retro'd) and, if so, emits a
#   {"decision":"block","reason":"…run /memarium-retro…"}
# that Claude Code feeds back so the agent captures the insight before stopping.
# The gate honours `stop_hook_active`, so it forces at most one continuation and
# never loops. Silent (exit 0, no output) on chat/Q&A turns, when the plugin
# isn't found, or on any error — a Stop hook must never wedge the turn.
VBP="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/memarium-plugin.js}"
# Fallback: pick the HIGHEST installed version by semver (sort -V), not the most
# recently-touched dir (ls -td by mtime) — with several cached version dirs
# coexisting, mtime order can resolve a stale binary.
[ -x "$VBP" ] || VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js 2>/dev/null | sort -V | tail -1)
if [ -x "$VBP" ]; then
  cat | "$VBP" retro-gate 2>/dev/null || true
fi
exit 0
