# vibebook plugin

[English](#english) · [中文](#中文)

**📖 Project page:** https://june9593.github.io/vibebook-plugin/

---

## English

Claude Code plugin that turns your past AI coding sessions into a
searchable book of decisions, dead ends, and fixes — so future-you
doesn't re-derive what past-you already figured out.

Want to know what you tried last time you debugged a particular crash?
Why you picked one library over another? Whether you've already explored
some idea? Run `/vibebook` once a week to digest your sessions; run
`/vibebook-recall` before any non-trivial task to surface what's
relevant.

Self-contained — no extra CLI, no cloud service, your data stays local.

### Install

```text
/plugin marketplace add june9593/vibebook-plugin
/plugin install vibebook
```

That's it. Open any Claude Code session and run `/vibebook` to digest
your local sessions, or `/vibebook-recall` to surface past notes.

### What it does

- **`/vibebook`** — Walks `~/.claude/projects/...jsonl` and your VS Code
  Copilot Chat history, then digests each session into per-project
  artifacts under `~/.vibebook/session-repo/book/<project>/`:
  - **chronicles** — one per work thread, AI-first frontmatter
    (`files_touched`, `commits`, `decisions`, `blockers`, `next_steps`,
    `status`) plus a 4-section body (Context / What worked / Dead ends
    / Open questions).
  - **topics** — one per subsystem, cross-references the chronicles
    that contributed.

  Auto-detects project from cwd; in non-project dirs it asks before
  doing a full sweep. When [memex](https://github.com/iamtouchskyer/memex)
  is installed, atomic insight cards are delegated to `/memex-retro`.

- **`/vibebook-recall`** — Three-stage progressive recall before new
  work. Stage 1 returns a topic list (~5 KB). Stage 2 (drill into a
  topic) returns chronicle frontmatter without bodies. Stage 3 reads
  the bodies you actually need. Cheap to invoke, fast to navigate,
  designed for AI agents to consume before exploring code.

- **Static-site rendering** (optional) — Run
  `${CLAUDE_PLUGIN_ROOT}/bin/vibebook-plugin.js site serve` to browse
  your book locally as HTML, or `... site build` to produce a
  deployable static site. Uses the bundled Astro template under
  `site-template/`.

The plugin reads `~/.claude/projects/...jsonl` directly. No external
service, no separate sync needed.

### Cross-device sync (optional)

To carry your sessions across multiple machines, install the optional
**vibebook** npm CLI:

```sh
npm i -g vibebook
vibebook init
```

It syncs `~/.vibebook/session-repo/` to a private GitHub repo across
your devices. Plugin and CLI share the same spool path with
sessionId-keyed entries — install one, both, or neither.

See https://github.com/june9593/vibebook for the npm CLI.

### Files written

- `~/.vibebook/session-repo/raw_sessions/<tool>/<project>/<date>/*.{md,raw.json}` — rendered copies of your sessions
- `~/.vibebook/session-repo/book/<project>/{chronicle,topics}/*.md` — digested book
- `~/.vibebook/session-repo/.vibebook/index.json` — per-session entry index
- `~/.vibebook/session-repo/.vibebook/index.book.json` — chronicle/topic catalog
- `~/.vibebook/.plugin-state.json` — plugin's onboarding state (one-time tip flag)

The plugin **does not** create or modify `.git/` or any of the npm
CLI's config files (`config.json`, `passphrase`, `repo-salt.json`,
`.gitattributes`) — those are owned by the optional npm CLI when
present.

### Repo layout

- `skills/` — `/vibebook` and `/vibebook-recall` skill files (the
  in-session prompts that drive the LLM through digest + recall)
- `commands/` — slash command thin wrappers
- `hooks/` — `Stop` hook that nudges the user to run `/vibebook` at
  end of session
- `bin/vibebook-plugin.js` — bundled CLI invoked by the skills
  (single esbuild output, all deps inlined; not on user PATH)
- `src/` — TypeScript source for the bundled CLI
- `site-template/` — Astro template for the optional local book site
- `docs/` — Astro source for this repo's GitHub Pages
- `tests/` — vitest suite covering the bundled CLI; run
  `npm install && npx vitest run` if you're contributing

### Contributing

PRs welcome. Open an issue first for anything beyond a typo or a
small bug fix — design changes touch a written spec and benefit from
discussion before implementation.

### License

MIT

---

## 中文

Claude Code 插件,把你过去的 AI 编程会话整理成一本可检索的笔记 —
记录决定、死胡同和修复方案 — 让未来的你不必重新摸索过去的你
已经搞清楚的东西。

想知道上次调那个 crash 试过什么?为什么选了这个库而不是另一个?
某个想法是不是已经探索过了?每周跑一次 `/vibebook` 整理你的会话;
做任何不平凡的任务前跑一次 `/vibebook-recall` 把相关的过去工作
翻出来。

独立运行 — 不需要额外 CLI,不需要云服务,数据全部留在本地。

### 安装

```text
/plugin marketplace add june9593/vibebook-plugin
/plugin install vibebook
```

就这样。开任何一个 Claude Code 会话,跑 `/vibebook` 整理本机会话,
或者 `/vibebook-recall` 翻过去的笔记。

### 它做什么

- **`/vibebook`** — 扫描 `~/.claude/projects/...jsonl` 和 VS Code
  Copilot Chat 历史,把每个会话整理成两类按项目分组的产物,放在
  `~/.vibebook/session-repo/book/<project>/`:
  - **chronicles** — 一个工作线一份,带 AI 优先的 frontmatter
    (`files_touched`、`commits`、`decisions`、`blockers`、
    `next_steps`、`status`)加四段式正文(Context / What worked /
    Dead ends / Open questions)。
  - **topics** — 一个子系统一份,反向链接到贡献的 chronicle。

  根据 cwd 自动判断项目;在非项目目录里会问你要不要做全量整理。
  装了 [memex](https://github.com/iamtouchskyer/memex) 时,原子化
  insight 卡片会交给 `/memex-retro`。

- **`/vibebook-recall`** — 开始新工作之前的三阶段渐进式 recall。
  第一阶段返回 topic 列表(约 5 KB)。第二阶段(钻进某个 topic)
  返回 chronicle 的 frontmatter,不含正文。第三阶段读真正需要的
  那几篇 chronicle。调用代价低、检索快,专门设计成 AI agent 在
  探索代码前能廉价消费的形式。

- **静态站点渲染(可选)** — 跑
  `${CLAUDE_PLUGIN_ROOT}/bin/vibebook-plugin.js site serve` 在
  本地以 HTML 浏览你的笔记本,或者 `... site build` 生成可发布
  的静态站点。用 `site-template/` 下打包好的 Astro 模板。

插件直接读 `~/.claude/projects/...jsonl`,无需外部服务,无需单独
同步。

### 跨设备同步(可选)

要把会话带到多台机器之间,装可选的 **vibebook** npm CLI:

```sh
npm i -g vibebook
vibebook init
```

它把 `~/.vibebook/session-repo/` 同步到一个私有 GitHub repo。
插件和 CLI 在同一个 spool 路径上协作,条目用 sessionId 做 key —
装其中一个、两个都装、或者都不装,按你需要选。

npm CLI 在 https://github.com/june9593/vibebook。

### 写到哪里

- `~/.vibebook/session-repo/raw_sessions/<tool>/<project>/<date>/*.{md,raw.json}` — 渲染过的会话副本
- `~/.vibebook/session-repo/book/<project>/{chronicle,topics}/*.md` — 整理出来的笔记本
- `~/.vibebook/session-repo/.vibebook/index.json` — 单会话条目索引
- `~/.vibebook/session-repo/.vibebook/index.book.json` — chronicle / topic 目录
- `~/.vibebook/.plugin-state.json` — 插件自己的 onboarding 状态(首次提示标记)

插件**不会**创建或修改 `.git/` 或可选 npm CLI 的任何配置文件
(`config.json`、`passphrase`、`repo-salt.json`、`.gitattributes`)
— 那些是装了 npm CLI 才有的领地。

### 仓库布局

- `skills/` — `/vibebook` 和 `/vibebook-recall` 的 skill 文件
  (驱动 LLM 走 digest + recall 的 in-session prompt)
- `commands/` — slash command 薄壳
- `hooks/` — 会话结束 `Stop` hook,提醒用户跑 `/vibebook`
- `bin/vibebook-plugin.js` — skill 调用的打包 CLI(单个 esbuild
  输出,依赖全部 inline;不进用户 PATH)
- `src/` — 打包 CLI 的 TypeScript 源码
- `site-template/` — 可选本地笔记站点的 Astro 模板
- `docs/` — 本仓库 GitHub Pages 的 Astro 源
- `tests/` — 覆盖打包 CLI 的 vitest 测试;贡献时跑
  `npm install && npx vitest run`

### 贡献

PR 欢迎。typo 或小 bug 之外的改动,先开 issue 讨论 — 设计层面的
改动牵涉到写过的 spec,先沟通再动手最省事。

### 许可证

MIT
