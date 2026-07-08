---
name: memarium-recall
description: |
  **TRIGGER IMMEDIATELY when the user's question contains retrospective phrasing in ANY language:** 之前是怎么解的 / 之前怎么解的 / 上次怎么处理的 / 上次怎么解决的 / 以前遇到过吗 / 以前我们怎么做 / 之前我们试过吗 / how did we fix X before / how was Y solved / why does Z work this way / what did we try last time / did we already try W. **Also trigger on:** design/architecture/prior-art questions — what pattern should I use for X / how have we approached Y before / what did we decide about Z / is there prior art for W. **Anti-pattern to break before reflex kicks in:** the question often contains clear keywords (file name, crash type, API) and your shortcut instinct is `git log --grep="<keyword>"` — DO NOT. Commit messages strip the conversation context where the user explained what didn't work and why; memarium chronicles preserve decisions, dead ends, trade-offs, and unmerged-attempt context that git history can't surface. Run memarium-recall stage 1 (one CLI call, ~5 KB) FIRST; if no topic matches, *then* fall back to git. Three-stage progressive recall — stage 1 = topic list. Stage 2 (`--topic <slug>`) = chronicles in that topic + frontmatter. Stage 3 = `Read` chronicle bodies. Cheap to invoke; when in doubt, run stage 1 — never deduplicate it away as "git is faster".
---

# /memarium-recall — read your own notes before doing the work

You (in-session Claude) just landed in a project repo. The user has been
working in this repo (and others) for weeks/months, and the memarium
plugin has captured every Claude Code + Copilot session into
`~/.memarium/session-repo/`. The `/memarium` skill has digested those
sessions into per-project **chronicles** (one per work thread,
4-section AI-first body) and **topics** (one per subsystem).

**Your job here**: before you start exploring code, figure out which
past topic(s) bear on the current task, then read the matching
chronicles. Past-you may have already debugged exactly this thing.

## Why three-stage recall

A typical project has 5-15 topics and 30-150 chronicles. Loading all
chronicle bodies = hundreds of KB and crowds out room for the actual
work. So we walk from coarse to fine:

| Stage | Payload | Question it answers |
|---|---|---|
| 1 (default) | ~5 KB — topics + 1-line summaries | "Which subsystem does my task touch?" |
| 2 (`--topic <slug>`) | ~5-15 KB — chronicles in that topic + frontmatter (no body) | "Within this subsystem, which past work is most similar?" |
| 3 (`Read` tool) | full body, ~2-5 KB per chronicle | "What did past-me actually do here?" |

## Step 0 — locate the plugin binary

```bash
VBP="${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/bin/memarium-plugin.js}"
[ -x "$VBP" ] || VBP=$(ls -d ~/.claude/plugins/cache/*/memarium/*/bin/memarium-plugin.js 2>/dev/null | awk -F/ '{print $(NF-2)"\t"$0}' | sort -V | tail -1 | cut -f2-)
```

`$CLAUDE_PLUGIN_ROOT` is set when the skill runs inside the plugin. The `ls`
fallback globs the plugin cache — the marketplace dir is `memarium-plugin`, so
match `cache/*/memarium/*` (the `*` covers the marketplace segment), **not**
`cache/memarium/memarium/*`. If `$VBP` is empty the plugin isn't installed —
tell the user and stop.

## Step 1 — Stage 1: topic list

Run this **first**, in the user's current cwd:

```bash
"$VBP" recall --cwd "$(pwd)"
```

The output is a JSON payload like:

```json
{
  "stage": "stage-1-topics",
  "project": "edge-src",
  "repoPath": "/Users/me/.memarium/session-repo",
  "entries": [
    {
      "kind": "topic",
      "project": "edge-src",
      "title": "Edge macOS Menu Bar Copilot",
      "summary": "Edge for Mac places a Copilot icon in the menu bar; left-click opens a floating widget, right-click opens a context menu.",
      "path": "book/edge-src/topics/menu-bar-copilot-mac.md",
      "slug": "menu-bar-copilot-mac",
      "updatedAt": "2026-04-22",
      "tags": []
    }
  ],
  "meta": {
    "topics": 5,
    "chronicles": 0,
    "nextStep": "Pick a relevant topic, then run: "$VBP" recall --project <slug> --topic <topicSlug>"
  }
}
```

Stage 1 includes:
- **`kind: "topic"`** — memarium topics for the current project. Read
  `summary` to gauge subsystem fit.

## Step 2 — Triage topics

For each topic in stage 1, ask: does the title or summary mention what
I'm about to touch (file / API / bug / feature)? Pick the **1-2 most
likely** topics. Don't try to read everything — most projects have
many topics, but only a few will be relevant to a given task.

## Step 3 — Stage 2: chronicles for the chosen topic

For each picked topic, fetch its chronicles:

```bash
"$VBP" recall --cwd "$(pwd)" --topic <topic-slug>
```

Output:

```json
{
  "stage": "stage-2-articles",
  "project": "edge-src",
  "topic": "menu-bar-copilot-mac",
  "repoPath": "/Users/me/.memarium/session-repo",
  "entries": [
    {
      "kind": "chronicle",
      "project": "edge-src",
      "title": "Native header + 3 PR landing",
      "summary": "status=shipped · 4 files · 3 commits · 2 decisions",
      "path": "/Users/me/.memarium/session-repo/book/edge-src/chronicle/2026-04-25__menu-bar-app-native-header__menu-bar.md",
      "slug": "menu-bar-app-native-header",
      "frontmatter": {
        "files_touched": [
          "chrome/browser/ui/cocoa/edge_menu_bar/edge_menu_bar_widget_header_view.mm",
          "chrome/browser/ui/cocoa/edge_menu_bar/edge_menu_bar_prefs.cc"
        ],
        "commits": ["7bc9ef48b654", "abcd1234ef56"],
        "decisions": ["Native C++ header over server-side header (audit blocker)"],
        "status": "shipped"
      },
      "updatedAt": "2026-04-25",
      "tags": ["copilot", "macos"]
    }
  ],
  "meta": { "chronicles": 7, "nextStep": "..." }
}
```

The frontmatter tells you 80% of what you need *without* reading the body:
- `files_touched` matches the file you're about to edit?
- `commits` includes a SHA you're about to revert / cherry-pick?
- `decisions` already made the architectural call you were about to debate?
- `status: blocked` means past-you tried this and got stuck — read the
  body to see why before retrying.

## Step 4 — Stage 3: read selectively

For chronicles whose frontmatter looks relevant, use the `Read` tool with
the absolute `path`:

```
Read /Users/me/.memarium/session-repo/book/edge-src/chronicle/2026-04-25__menu-bar-app-native-header__menu-bar.md
```

Chronicles are short (1-3 sentences per section, the body is the receipt
for the frontmatter). 3-5 reads is usually plenty.

## Step 5 — Use what you read

When you reply to the user:
- **Reference the past finding explicitly**: "Per your earlier
  chronicle `menu-bar-app-native-header`, you decided native C++ header
  over the server-side approach because of an audit blocker — let me
  follow the same pattern…"
- **Don't paraphrase silently** — it should be obvious to the user that
  you're standing on past work, not re-deriving it.
- **Update on contradiction**: if what you read no longer reflects
  current code, mention it. The user may want to update the chronicle.
- **No relevant chronicle / topic / card?** Say so explicitly: "I
  didn't find anything in your memarium about X — proceeding fresh."

## When NOT to invoke recall

- The user's request has nothing to do with code in this repo (e.g.
  asking you to format JSON, write an essay, debug a config).
- The user explicitly says "ignore my notes" or "fresh start".
- `"$VBP" recall` errors with "no synced sessions for cwd" — the user
  hasn't synced this project. Fall back to normal exploration; don't
  pester them to sync.
- You're being asked the same question for the second time in one
  session — you already loaded the relevant entries the first time.

## Failure modes to avoid

- ❌ **Skipping stage 1 and reading a chronicle directly** — without
  the topic list you don't know which chronicles to even ask for.
- ❌ **Reading every chronicle in a topic** — stage 2 is the triage
  layer; only `Read` the 1-3 chronicles whose frontmatter actually
  matches. Reading 7 chronicles to find the 1 useful one wastes
  context.
- ❌ **Treating recall as search** — the catalog is hierarchical
  (topic → chronicle), not keyword-indexed. Match against
  `keyConcepts` in topic frontmatter and `files_touched` in chronicle
  frontmatter.
- ❌ **Hallucinating "I checked your notes"** when you didn't run the
  CLI. Always run it explicitly so the user can see you did.
- ❌ **Refusing to do the task because old notes contradict it.** Notes
  are dated; code may have moved on. Recall is one input, not a veto.

## Relationship: /memarium vs /memarium-retro vs /memarium-recall

| | `/memarium` (batch write) | `/memarium-retro` (live write) | `/memarium-recall` (read) |
|---|---|---|---|
| When | After sessions, batch-digest | At the END of a task, in-session | At the START of new work |
| Cwd | session-repo (global) or project | The project you worked in | Always a project repo |
| Reads | raw_sessions/ | the current conversation | book/ (chronicles + topics) |
| Writes | book/ + typed memory | one typed-memory insight (gated) | nothing |
| LLM | in-session Claude (you) | in-session Claude (you) | in-session Claude (you) |

The skills close the loop:
- `/memarium` batch-digests synced sessions into chronicles + typed memory.
- `/memarium-retro` captures the ONE reusable insight from THIS session, live.
- `/memarium-recall` lets future-you read the chronicles/topics in one pass
  (and `/memarium-context` loads the typed-memory primer).
