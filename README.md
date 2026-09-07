# memarium — a local, auditable **Memory OS** for AI coding agents

[English](#english) · [中文](#中文)

**📖 Project page:** https://june9593.github.io/memarium-plugin/ · **npm CLI (optional sync):** https://github.com/june9593/memarium

> memarium turns your AI coding sessions into a **durable, typed, queryable memory** that every future session starts from — not just a log of what happened, but a layered *Memory OS*: typed memory, an entity wiki, distilled Q&A, health linting, a human-review gate for long-term memory, and a CI scorer regression eval harness.
>
> **Markdown-first. Local. Git-syncable. Fully auditable.** No cloud, no vector database, and **no LLM in the storage/retrieval layer** — all writing happens in-session via skills; the CLI is pure I/O.

---

## Architecture at a glance

**Digest → memory → recall** (how a session becomes context the next session starts with):

```mermaid
flowchart LR
  subgraph Sources
    A[Claude Code sessions]
    B[VS Code Copilot Chat]
    C[Codex Desktop + CLI]
  end
  A & B & C -->|extract| SP[raw_sessions/*.md<br/>spool]
  SP -->|/memarium digest<br/>in-session agent| D{Distill}
  D --> M[typed memory<br/>4 types incl. episodic]
  D --> E[entity wiki]
  D --> Q[distilled Q&A]
  M & E & Q --> IDX[(.memarium/index.*.json)]
  IDX -->|SessionStart hook| P[project primer<br/>auto-loaded]
  IDX -->|/memarium-context| R[layered recall<br/>term-overlap scorer]
```

**The memory-PR gate** (v4 self-evolution — protected long-term memory cannot change without review):

```mermaid
flowchart TD
  X[digest / consolidation wants to change memory] --> G{gated change?<br/>core / procedural / pinned<br/>or supersedes one}
  G -->|no| W[memory-write → live]
  G -->|yes| PP[memory-propose<br/>→ local review queue]
  PP --> DI[memory-diff<br/>human reviews the diff]
  DI -->|approve| AP[memory-approve<br/>→ apply live + refresh primer]
  DI -->|reject| RJ[memory-reject → discard]
```

---

## English

### What it is

A Claude Code plugin that gives an AI coding agent **long-term memory it can trust**. It imports sessions from Claude Code, VS Code Copilot Chat, Codex Desktop, and interactive Codex CLI. Run `/memarium` to digest them into a per-project typed memory store; a SessionStart hook then auto-loads a compact *primer* so every new session begins already knowing the project's rules, setup, facts, and gotchas — instead of re-deriving them every time.

Self-contained: no extra CLI required, no cloud service, your data stays local and human-readable.

### The Memory OS (built in layers)

| Layer | What it adds |
|---|---|
| **v1 — typed memory** | Four memory types (`core` / `semantic` / `episodic` / `procedural`), a per-project **primer**, a JSON index, and a relevance scorer. |
| **v2 — primer + entities** | A **SessionStart hook** that auto-injects the primer; an **entity wiki** (one living page per file / symbol / API / concept / person). |
| **qa — distilled Q&A** | A `qa/` answer layer: durable question→answer pairs (compound questions, troubleshooting conclusions, decision rationale, operational routes). |
| **v3 — lint + consolidation** | `memory-lint`, a read-only health check (expired / dangling-supersede / duplicate-like / missing-provenance / stale), plus a conservative consolidation step at digest time. |
| **v4 — self-evolution gate** | A **"memory-PR"** flow: changes to long-term `core` / `procedural` / pinned memory can't be written directly — the agent must `memory-propose`; a human reviews with `memory-diff` and applies with `memory-approve` (or `memory-reject`). One bad summary can't silently poison long-term behavior. |
| **v5 — retrieval eval** | A deterministic, LLM-free **scorer regression suite** (LongMemEval-style fixtures) that locks the scorer's behavior against a hand-authored corpus in CI — a guardrail against scorer regressions, *not* a held-out recall benchmark — with zero runtime footprint. (Real-corpus recall measurement is a separate, ongoing effort.) |

### Why it's designed this way — prior art & lineage

memarium is deliberately grounded in published research and a clear set of trade-offs, not invented from scratch:

| Design choice | Based on / informed by | Why |
|---|---|---|
| **Typed memory** (core / semantic / episodic / procedural) | **CoALA** — *Cognitive Architectures for Language Agents* (Sumers, Yao, Narasimhan, Griffiths, 2023) | A principled memory taxonomy from cognitive science, rather than one undifferentiated blob. |
| **Relevance scorer** = recency + importance + relevance | **Generative Agents** (Park et al., 2023) — the memory-stream retrieval function | A simple, explainable, well-validated ranking signal. |
| **Scorer regression eval** | **LongMemEval** (Wu et al., 2024) — long-term memory benchmark for chat assistants | Inspiration for the ability axes (info-extraction, multi-session, temporal, knowledge-update, abstention), which are exercised against a fixture corpus to catch scorer regressions — not a benchmark of real-corpus recall. |
| **Markdown-first, local, git-synced, no vector DB** | A deliberate counter-position to vector/graph memory stacks like **mem0**, **Letta / MemGPT**, **Zep / Graphiti**, **A-MEM** | Auditability and ownership: memory is human-readable, diff-able, and version-controlled. The cost — lexical (term-overlap) retrieval — is a known trade-off (see [Limitations](#limitations--roadmap)). |
| **Memory-PR governance gate** | (novel) — most memory frameworks let the agent self-edit long-term memory freely | Governance: long-term, behavior-shaping memory changes get human review before they persist. |
| **Entity wiki + distilled Q&A** | Personal-knowledge-base / Zettelkasten practice (linked atomic notes) | A reverse-index synthesis layer on top of episodic memories. |

> **Honest positioning:** the taxonomy, scorer, and governance gate are aligned with — and in places ahead of — mainstream agent-memory tooling; the eval harness is a CI regression guard (held-out real-corpus recall benchmarking is ongoing, not yet shipped). The one intentional gap is **lexical-only retrieval** (no embeddings/graph); see the roadmap below for how we plan to close it without giving up auditability.

### Commands & skills

**Skills (slash commands — the everyday surface):**
Canonical names use `/memarium:<skill-name>`, for example `/memarium:memarium-recall`.
The short aliases below work when no other command uses the same name.
- **`/memarium`** — digest synced sessions into per-project typed memory (episodic + semantic/procedural/core) + entity wiki + distilled Q&A (with a conservative consolidation pass).
- **`/memarium-context`** — load this project's memory at the start of work: *Core rules / Procedures & gotchas / Project facts / Episodes / Conflicts / Entities / Past Q&A / Pending memory proposals.*
- **`/memarium-recall`** — 2-stage ranked recall over typed memory (score the index → Read the top entries).
- **`/memarium-retro`** — assess the current task for reusable insights; deduplicate and capture only useful memory, respecting the proposal gate.
- **SessionStart hook** — auto-injects the project primer so a new session starts informed.

The primer is injected automatically; ranked recall is an agent-invoked skill.
The Stop hook can request one retro assessment after completed file-edit tools
or supported Bash write evidence (Git commits, cat redirects, in-place sed,
inline/heredoc Python writes). It is not a general shell side-effect detector:
unknown scripts may need an explicit retro. Read-only commands stay quiet,
user refusal is respected, and no new insight means no memory write.

**Underlying `bin/memarium-plugin.js` subcommands** (the skills call these; pure I/O, no LLM):
`memory-write` · `memory-query` · `memory-index` · `memory-primer` · `entity-write` · `entity-query` · `entity-index` · `qa-write` · `qa-query` · `qa-index` · `memory-lint` · `memory-propose` · `memory-diff` · `memory-approve` · `memory-reject` · `recall` · `skip-write` · `list-projects` · `status` · `prepare`.

### Install

```text
/plugin marketplace add june9593/memarium-plugin
/plugin install memarium
```

Open any Claude Code session and run `/memarium` to digest your local Claude Code, Copilot Chat, and Codex sessions; a new session afterward auto-loads the project primer.

When a provider stores its own session title, memarium uses it for the rendered
name and filename (`Copilot customTitle`, `Codex thread_name`); otherwise it
falls back to the first real user message. Clearing a Copilot title restores
that fallback. On upgrade, the next scan reimports unchanged local Copilot
`chatSessions` once and replaces the indexed rendered filename; source files and
session IDs stay unchanged. No rename script is required. Update both the CLI
and plugin if you use both. Sessions without a local source keep their old names
until rescanned on the source device.
On case-insensitive filesystems, case-only title changes retain the on-disk
filename spelling while updating the displayed title; this keeps the index
path usable in a case-sensitive Git tree.

### Cross-device sync (optional)

To carry sessions **and** memory across machines, install the optional **memarium** npm CLI:

```sh
npm i -g memarium
memarium init
```

It syncs `~/.memarium/session-repo/` (sessions **and** the `memory/` layer) to a private GitHub repo, aggregating across devices on the `main` branch. The CLI also resumes a session on another machine:

```sh
memarium list-sessions --since 1d   # find the sessionId
memarium resume <sessionId>         # starts fresh Claude Code with the rendered session as context
```

> **Note:** the memory layer (`memory/` + its indexes) syncs only with CLI **≥ 0.8.6**. The plugin and CLI share the same spool path; use the plugin alone for local memory, or add the CLI for cross-device sync. npm CLI: https://github.com/june9593/memarium

### Files written

- `~/.memarium/session-repo/raw_sessions/<tool>/<project>/<date>/*.md` — rendered session (single `.md`: YAML frontmatter w/ `manifest_version: 1` + `tools_used` / `commits` / `files_touched`, a Table-of-Contents block, then the body).
- `~/.memarium/session-repo/memory/{core,semantic,episodic,procedural}/<project|_global>/*.md` — the four typed-memory collections.
- `~/.memarium/session-repo/memory/entities/<project|_global>/*.md` and `memory/qa/<project|_global>/*.md` — derived entity wiki and Q&A.
- `~/.memarium/session-repo/.memarium/index.json` and `index.{memory,entity,qa}.json` in that directory — the synced indexes. `index.skips.json` is a **local-only** digest-skip ledger (never committed/synced). The digest no longer reads or writes `index.book.json` (a legacy file may remain on disk, but it is not an active index).
- `~/.memarium/local-proposals/<repoHash>/*.json` — **local-only** memory-PR queue (never synced).
- `~/.memarium/usage/<repoHash>/access.json` — device-local recall usage counters (never synced).

The standalone plugin's `finalize` command can initialize the spool Git repo,
commit only allowlisted session/memory files, and push when a remote is configured.
The npm CLI is optional transport and setup tooling, not a prerequisite for that
Git lifecycle. Normal memory commands read the configured spool location;
configuration changes belong to the user's setup/configuration workflow.

### Limitations & roadmap

- **Lexical-only retrieval (the known gap).** Recall ranks by keyword overlap + scope + recency + importance, so a *semantically* related but *lexically* different query can under-recall. The scorer is **presence-based term-overlap, not IDF-weighted** — rare and common tokens weigh equally (IDF was evaluated and deferred as net-neutral on the current corpus). Planned: an **optional local embedding index** used only for recall ranking (markdown stays the source of truth — never "vector-only"), validated against the v5 eval harness before adoption.
- **Codex scope.** Desktop and interactive CLI JSONL are imported; `codex exec` batch runs and internal subagent/guardian child threads are excluded by default.
- **End-to-end answer-quality eval** (no-context vs recalled-context) — a documented follow-up to the v5 retrieval eval.

### Repo layout

- `skills/` — the four canonical in-session workflows: digest, context, recall, and retro; no duplicate command wrappers.
- `hooks/` — automatic SessionStart primer + advisory Stop assessment.
- `bin/memarium-plugin.js` — bundled CLI invoked by the skills (single esbuild output; not on PATH).
- `src/` — TypeScript source · `tests/` — vitest suite (`npm install && npx vitest run`).
- `docs/` — GitHub Pages source (product landing page).

### Contributing

Start with the [contributor / agent guide](./CLAUDE.md). PRs welcome. Open an issue first for anything beyond a typo — design changes are spec-driven and benefit from discussion. **License: MIT.**

---

## 中文

### 这是什么

一个 Claude Code 插件,给 AI 编程 agent 一套**可信赖的长期记忆**。它会导入 Claude Code、VS Code Copilot Chat、Codex Desktop 和交互式 Codex CLI 会话。跑 `/memarium` 把这些会话整理成按项目分组的、有类型的长期记忆;之后 SessionStart hook 会自动加载一份精简的 *primer*,让每个新会话一开始就知道这个项目的规则、配置、事实和坑 —— 而不是每次都重新摸索。

独立运行:不需要额外 CLI、不需要云服务,数据全部留在本地、人类可读。

### Memory OS(分层构建)

| 层 | 加了什么 |
|---|---|
| **v1 — typed memory** | 四种记忆类型(`core` / `semantic` / `episodic` / `procedural`)、按项目的 **primer**、JSON 索引、相关性打分器。 |
| **v2 — primer + 实体** | **SessionStart hook** 自动注入 primer;**entity wiki**(每个文件 / 符号 / API / 概念 / 人一份活页)。 |
| **qa — 精炼问答** | `qa/` 答案层:可复用的问→答对(复合问题、排障结论、决策理由、操作路径)。 |
| **v3 — lint + 整合** | `memory-lint` 只读健康检查(过期 / 悬挂 supersede / 疑似重复 / 缺出处 / 陈旧),以及 digest 时的保守整合。 |
| **v4 — 自进化门禁** | **"memory-PR"** 流程:长期 `core` / `procedural` / pinned 记忆不能直接写 —— agent 必须 `memory-propose`;人用 `memory-diff` 审、用 `memory-approve` 落库(或 `memory-reject`)。一条坏 summary 无法静默污染长期行为。 |
| **v5 — 召回评估** | 确定性、不调 LLM 的 **scorer 回归套件**(LongMemEval 风格的 fixture),在 CI 里把 scorer 行为锁在一组手写语料上 —— 是防 scorer 回归的护栏,**不是** held-out 召回基准,零运行时开销。(真实语料的召回测量是另一条单独、进行中的工作。) |

### 为什么这么设计 —— 参考的论文与 repo

memarium 刻意建立在公开研究和清晰的取舍之上,而不是凭空发明:

| 设计选择 | 参考 / 受启发于 | 为什么 |
|---|---|---|
| **typed memory**(core / semantic / episodic / procedural) | **CoALA** — *Cognitive Architectures for Language Agents*(2023) | 来自认知科学的记忆分类法,而不是一坨无差别的 blob。 |
| **打分器** = recency + importance + relevance | **Generative Agents**(Park 等, 2023)的 memory-stream 召回函数 | 简单、可解释、被验证过的排序信号。 |
| **Scorer 回归评估** | **LongMemEval**(Wu 等, 2024)长期记忆基准 | 借鉴其能力维度(信息抽取/多会话/时序/知识更新/弃答),在 fixture 语料上跑来防 scorer 回归 —— 不是真实语料召回的基准。 |
| **markdown 优先、本地、git 同步、不用向量库** | 对 **mem0**、**Letta / MemGPT**、**Zep / Graphiti**、**A-MEM** 这类向量/图记忆栈的刻意反向选择 | 可审计、可拥有:记忆人类可读、可 diff、可版本控制。代价是词法(term-overlap)召回 —— 一个已知取舍(见[局限](#局限与路线图))。 |
| **memory-PR 治理门禁** | (新)—— 多数记忆框架让 agent 自由自改长期记忆 | 治理:会长期影响行为的记忆改动落库前先经人审。 |
| **entity wiki + 精炼 Q&A** | 个人知识库 / Zettelkasten 实践(链接式原子笔记) | 在 episodic 记忆之上的反向索引综合层。 |

> **如实定位:** 分类法、打分器、治理门禁与主流 agent 记忆工具持平,有些地方还领先;评估 harness 是 CI 回归护栏(真实语料的 held-out 召回基准还在进行、尚未上线)。唯一刻意的缺口是**纯词法召回**(没有 embedding / 图);路线图里写了如何在不放弃可审计的前提下补上它。

### 命令与 skills

**Skills(斜杠命令 —— 日常入口):**
完整入口为 `/memarium:<skill-name>`,例如 `/memarium:memarium-recall`。
下列短别名仅在没有同名命令冲突时可用。
- **`/memarium`** —— 把会话整理成按项目的 typed memory(episodic + semantic/procedural/core)+ entity wiki + 精炼 Q&A(带保守整合)。
- **`/memarium-context`** —— 工作开始时加载本项目记忆:核心规则 / 操作与坑 / 项目事实 / 片段 / 冲突 / 实体 / 历史 Q&A / 待审记忆提案。
- **`/memarium-recall`** —— 两阶段召回 typed memory(给 index 打分 → Read 命中的条目)。
- **`/memarium-retro`** —— 检查当前任务是否产生可复用经验,去重后按审批规则记录;没有新知识就不写。
- **SessionStart hook** —— 自动注入项目 primer,新会话一开始就有底。

自动注入的是 primer;排序召回仍需 agent 调用 skill。Stop hook 在已完成的
文件编辑或支持的 Bash 修改迹象后,可要求一次 retro 检查(Git 提交、cat 重定向、
sed 原地修改、Python inline/heredoc 写入)。它不是通用 shell 副作用分析器,
未知脚本可能需要显式回顾。只读操作不打扰,尊重用户拒绝,不强迫每轮生成记忆。

**底层 `bin/memarium-plugin.js` 子命令**(skills 调用;纯 I/O,不调 LLM):
`memory-write` · `memory-query` · `memory-index` · `memory-primer` · `entity-write` · `entity-query` · `entity-index` · `qa-write` · `qa-query` · `qa-index` · `memory-lint` · `memory-propose` · `memory-diff` · `memory-approve` · `memory-reject` · `recall` · `skip-write` · `list-projects` · `status` · `prepare`。

### 安装

```text
/plugin marketplace add june9593/memarium-plugin
/plugin install memarium
```

开任何 Claude Code 会话跑 `/memarium` 整理本机的 Claude Code、Copilot Chat 与 Codex 会话;之后新会话会自动加载项目 primer。

如果来源保存了自己的会话标题,memarium 会优先用它生成渲染名称和文件名
(`Copilot customTitle`、`Codex thread_name`);否则回退到第一条真实用户消息。
清空 Copilot 标题后也会恢复首句回退。升级后的下一次扫描会一次性重新导入
本地 Copilot `chatSessions`(即使源文件未修改),按同一 session ID 更新索引并
替换旧渲染文件名;不修改源文件,不需要手动改名脚本。同时使用 CLI 和 plugin
时请一起更新。没有本地源文件的会话暂时保留旧名字,需在持有源文件的设备重扫。
在不区分大小写的文件系统上,仅改变标题大小写时会更新显示标题,但保留磁盘上
实际的文件名拼写,确保 index 路径在区分大小写的 Git tree 中也能读取。

### 跨设备同步(可选)

要把会话**和记忆**带到多台机器,装可选的 **memarium** npm CLI:

```sh
npm i -g memarium
memarium init
```

它把 `~/.memarium/session-repo/`(会话**以及** `memory/` 层)同步到私有 GitHub repo,并在 `main` 分支跨设备聚合。CLI 也能在另一台机器 resume 会话:

```sh
memarium list-sessions --since 1d
memarium resume <sessionId>
```

> **注意:** 记忆层(`memory/` 及其索引)只在 CLI **≥ 0.8.6** 时同步。插件与 CLI 共享同一 spool 路径;可只用插件处理本地记忆,需要跨设备同步时再加 CLI。npm CLI:https://github.com/june9593/memarium

### 写到哪里

- `~/.memarium/session-repo/raw_sessions/<tool>/<project>/<date>/*.md` —— 渲染过的会话(单 `.md`:YAML frontmatter + 目录块 + 正文)。
- `~/.memarium/session-repo/memory/{core,semantic,episodic,procedural}/<project|_global>/*.md` —— 四种 typed memory。
- `~/.memarium/session-repo/memory/entities/<project|_global>/*.md` 和 `memory/qa/<project|_global>/*.md` —— 派生的实体 wiki 与问答。
- `~/.memarium/session-repo/.memarium/index.json` 及同目录的 `index.{memory,entity,qa}.json` —— 同步的索引。`index.skips.json` 是**仅本地**的 digest-skip 账本(从不 commit/同步)。digest 不再读写 `index.book.json`(旧安装可能在磁盘留下文件,但它不再是有效索引)。
- `~/.memarium/local-proposals/<repoHash>/*.json` —— **仅本地**的 memory-PR 队列(从不同步)。
- `~/.memarium/usage/<repoHash>/access.json` —— 设备本地的召回使用计数(从不同步)。

独立插件的 `finalize` 可以初始化 spool 的 Git 仓库,只提交允许列表内的会话/记忆文件,
并在配置远端时推送。npm CLI 提供可选的同步和配置工具,不是这套 Git 生命周期的前提。
正常记忆命令读取已配置的存储位置;配置变更由用户的初始化/配置流程管理。

### 局限与路线图

- **纯词法召回(已知缺口)。** 召回靠关键词重叠 + scope + recency + importance 排序,所以语义相关但词面不同的查询可能漏召回。打分是**基于出现的 term-overlap,不是 IDF 加权** —— 稀有词和泛词同权(IDF 评估过,在当前语料上净收益为零,已搁置)。计划:加一个**可选的本地 embedding 索引**,只用于召回排序(markdown 仍是唯一真相源,绝不"纯向量"),上线前用 v5 eval harness 实测验证。
- **Codex 范围。** 支持 Desktop 与交互式 CLI JSONL;默认排除 `codex exec` 批处理和内部 subagent/guardian 子线程。
- **端到端答案质量评估**(无上下文 vs 召回上下文)—— v5 召回评估之后的后续项。

### 仓库布局

- `skills/` —— digest、context、recall、retro 四个完整工作流;不再注册同名转发壳。
- `hooks/` —— 自动 SessionStart primer + 建议性的 Stop 回顾检查。
- `bin/memarium-plugin.js` —— skill 调用的打包 CLI(单 esbuild 输出;不进 PATH)。
- `src/` —— TypeScript 源 · `tests/` —— vitest(`npm install && npx vitest run`)。
- `docs/` —— GitHub Pages 源(产品落地页)。

### 贡献

先阅读[贡献者 / agent 指南](./CLAUDE.md)。欢迎 PR。typo 之外的改动先开 issue 讨论 —— 设计层改动是 spec 驱动的。**许可证:MIT。**
