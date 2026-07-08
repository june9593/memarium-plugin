---
description: Three-stage progressive recall of past chronicles + topics from your memarium session-repo. Stage 1 lists topics; stage 2 (--topic) lists chronicles with frontmatter; stage 3 reads the bodies that match. Use BEFORE exploring code in any project the user has synced.
---

Invoke the **memarium-recall** skill via the `Skill` tool with
`skill: "memarium-recall"`.

Use this **before** you start exploring code in a project repo where the
user has run memarium sync (via the plugin's bundled scan or the optional
npm CLI). The skill walks you through three stages:

1. **Stage 1**: `"$VBP" recall --cwd "$(pwd)"` — fetch the project's
   topic list (~5 KB of title + summary). `$VBP` is the plugin binary
   discovered in the skill's Step 0 (`ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-`).
2. **Stage 2**: `"$VBP" recall --cwd "$(pwd)" --topic <slug>` — for
   each topic that matches the task, fetch its chronicles with
   AI-first frontmatter (files_touched / commits / decisions / status).
3. **Stage 3**: `Read` the chronicle bodies that the frontmatter
   suggests are most relevant.

Reference past findings explicitly when you reply.

This skill closes the read loop on `/memarium` (batch chronicle + topic +
memory writer) and `/memarium-retro` (in-session typed-memory writer).
