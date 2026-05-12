#!/usr/bin/env bash
# vibebook plugin Stop hook — non-blocking nudge.
#
# Fires at the end of every Claude Code session. Suggests the user run
# /vibebook to digest this session into chronicle + topic, and (if they
# have multiple machines) mentions the optional `vibebook` npm CLI for
# cross-device sync. Never fails the turn — exits 0 unconditionally.
{
  echo "💡 vibebook: run /vibebook to digest this session into your book."
  echo "   (Multi-device? Install \`vibebook\` npm CLI for sync: npm i -g vibebook)"
} 2>/dev/null || true
exit 0
