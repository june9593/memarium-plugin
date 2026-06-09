---
name: vibebook-context
description: Load the current project's typed memory at the start of a session so you begin already familiar with the project — architecture, setup commands, gotchas, and rules — like an engineer who doesn't re-learn the codebase every task. Triggers at the start of work in any project the user has synced, and on "what do we know about this project", "load project memory", "what's the setup here", "catch me up on this repo". Outputs layered context: Core rules / Procedures & gotchas / Project facts / relevant Episodes (chronicle pointers) / Conflicts (stale or contradicting memories).
---

# /vibebook-context — start already knowing the project

Run this BEFORE exploring code in a project repo the user has synced. It
surfaces the typed memory vibebook distilled from past sessions, so you start
as a familiar engineer instead of a stranger.

## Step -1 — Locate the plugin binary

```bash
VBP=$(ls -td ~/.claude/plugins/cache/vibebook/vibebook/*/bin/vibebook-plugin.js 2>/dev/null | head -1) && echo "VBP=$VBP"
[ -x "$VBP" ] && "$VBP" --version
```

If `$VBP` is empty, tell the user to `/plugin install vibebook` and stop.

## Step 1 — Query memory for the cwd's project

```bash
"$VBP" memory-query --cwd "$(pwd)"
```

Read the JSON payload:
- `primer` — the compact per-project rollup. **Read this first; treat it as
  already-known context.**
- `core` — never-forget rules (project + global). Always honor.
- `procedures` — how-to playbooks + gotchas for this project.
- `semantic` — project facts / architecture / decisions.
- `episodes` — pointers to chronicles (do NOT read all; only `Read` the
  `entry.path` of ones directly relevant to the task).
- `conflicts` — memories flagged superseded or time-bounded; double-check
  before relying on them.
- each entry has `whyRecalled` — why it surfaced.

## Step 2 — Optionally narrow

If the user's task has clear keywords, pass them:

```bash
"$VBP" memory-query --cwd "$(pwd)" --q "<task keywords>"
```

## Step 3 — Use it explicitly

Open your reply by stating what you already know from memory (cite the
primer / specific memories), then proceed. Don't silently absorb it — make it
visible that you're standing on past work. If `core`/`semantic`/`procedures`
are empty, say "no distilled memory for this project yet" and proceed fresh
(then `/vibebook` later will start building it).

## Relationship to /vibebook-recall

`/vibebook-recall` reads the **book** (chronicles/topics) for deep "翻书"
dives. `/vibebook-context` reads the **typed memory** for fast session-start
orientation. Use context first; drill into recall when you need the full
narrative of a specific past thread.
