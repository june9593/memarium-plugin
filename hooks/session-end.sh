#!/usr/bin/env bash
# memarium plugin Stop hook — non-blocking nudge.
#
# Fires at the end of every Claude Code session. Suggests the user run
# /memarium to digest this session into chronicle + topic, and (if they
# have multiple machines) mentions the optional `memarium` npm CLI for
# cross-device sync. Never fails the turn — exits 0 unconditionally.
{
  echo "💡 memarium: run /memarium to digest this session into your book."
  echo "   (Multi-device? Install \`memarium\` npm CLI for sync: npm i -g memarium)"
} 2>/dev/null || true
exit 0
