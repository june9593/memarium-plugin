#!/usr/bin/env bash
# memarium plugin Stop hook — smart-gated proactive in-session memory capture.
#
# Reads completed tool activity from the current turn, including bounded Bash
# mutation evidence. When a useful assessment has not already been prompted,
# it emits {"decision":"block","reason":"..."} for one in-session continuation.
# This is an advisory retro check, not a claim that a memory has been saved:
# no new insight means no write, and a user's refusal must not be retried.
# stop_hook_active prevents a loop. Missing/unsupported evidence and errors
# remain nonblocking; the hook never writes memory or calls an LLM.
VBP="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/memarium-plugin.js}"
# Fallback: pick the HIGHEST installed version by semver (sort -V), not the most
# recently-touched dir (ls -td by mtime) — with several cached version dirs
# coexisting, mtime order can resolve a stale binary.
[ -x "$VBP" ] || VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js 2>/dev/null | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-)
if [ -x "$VBP" ]; then
  cat | "$VBP" retro-gate 2>/dev/null || true
fi
exit 0
