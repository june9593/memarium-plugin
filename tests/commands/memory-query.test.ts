import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryQueryCmd", () => {
  let fakeHome: string, repo: string, stdout: string[];
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memq-"));
    vi.stubEnv("HOME", fakeHome);
    // MEMARIUM_DIR wins over HOME, so pin it too: an outer value would send
    // usage writes from these tests into the caller's store.
    vi.stubEnv("MEMARIUM_DIR", join(fakeHome, ".memarium"));
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // session index so cwd resolves to project "code-demo"
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": {
        sessionId: "s1", shortId: "s1", tool: "claude", project: "code-demo",
        projectRaw: "/work/code-demo", startedAt: "2026-01-01T00:00:00Z",
        endedAt: "2026-01-01T00:00:00Z", nameSlug: "x", displayName: "x",
        relativePath: "raw_sessions/claude/code-demo/2026-01-01/x__s1.md",
        sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x" } },
    }));
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "core/g": { id: "core/g", type: "core", scope: "global", project: null,
          title: "never npm publish", summary: "the maintainer OTP", path: "memory/core/_global/g.md",
          status: "active", confidence: 1, importance: 5, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
        "semantic/code-demo/spool": { id: "semantic/code-demo/spool", type: "semantic",
          scope: "project:code-demo", project: "code-demo", title: "Spool single md",
          summary: "since 0.6.0", path: "memory/semantic/code-demo/spool.md",
          status: "active", confidence: 0.9, importance: 4, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: ["spool"],
          trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null },
        "episodic/code-demo/task": { id: "episodic/code-demo/task", type: "episodic",
          scope: "project:code-demo", project: "code-demo", title: "Current task",
          summary: "in-progress note", path: "memory/episodic/code-demo/task.md",
          status: "active", confidence: 0.7, importance: 2, createdAt: "2026-06-09",
          updatedAt: "2026-06-09", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
        "semantic/code-demo/old": { id: "semantic/code-demo/old", type: "semantic",
          scope: "project:code-demo", project: "code-demo", title: "Old fact",
          summary: "stale", path: "memory/semantic/code-demo/old.md",
          status: "superseded", confidence: 0.8, importance: 3, createdAt: "2026-05-01",
          updatedAt: "2026-05-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
      },
    }));
    stdout = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      stdout.push(typeof c === "string" ? c : Buffer.from(c).toString()); return true;
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("emits layered context for the cwd project + renders primer (no _primer file write)", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/code-demo" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.project).toBe("code-demo");
    expect(payload.core.map((x: any) => x.entry.id)).toContain("core/g");
    expect(payload.semantic.map((x: any) => x.entry.id)).toContain("semantic/code-demo/spool");
    expect(payload.primer).toContain("# Project memory: code-demo");
    // P0b: query no longer persists the primer to memory/_primer/ (memory-primer
    // renders live from the merged view; a written file would be a stale snapshot).
    expect(existsSync(join(repo, "memory/_primer/code-demo.md"))).toBe(false);
  });

  it("--q filters by text and includes whyRecalled", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/code-demo", q: "spool" });
    const payload = JSON.parse(stdout.join(""));
    const all = [...payload.core, ...payload.semantic, ...payload.procedures];
    const spool = all.find((x: any) => x.entry.id === "semantic/code-demo/spool");
    expect(spool.whyRecalled).toContain("keyword");
  });

  it("payload includes episodes array", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/code-demo" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.episodes)).toBe(true);
    expect(payload.episodes.map((x: any) => x.entry.id)).toContain("episodic/code-demo/task");
    // working/artifact buckets were removed with those unused types (#20)
    expect(payload.working).toBeUndefined();
    expect(payload.artifacts).toBeUndefined();
  });

  it("conflicts includes superseded entries even though scoreMemories drops them", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/code-demo" });
    const payload = JSON.parse(stdout.join(""));
    const conflictIds = payload.conflicts.map((x: any) => x.entry.id);
    expect(conflictIds).toContain("semantic/code-demo/old");
    const supersededItem = payload.conflicts.find((x: any) => x.entry.id === "semantic/code-demo/old");
    expect(supersededItem.whyRecalled).toBe("superseded");
  });

  // ---- accessCount tracking (usage sidecar) ----

  it("non-empty content-hit query bumps the matched entry, not baseline entries", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    await memoryQueryCmd({ cwd: "/work/code-demo", q: "spool" });
    const u = loadUsage(repo);
    expect(u["semantic/code-demo/spool"]?.count).toBe(1); // keyword hit → bumped
    expect(u["core/g"]).toBeUndefined();                   // only scope/importance baseline → NOT bumped
  });

  it("unrelated query (no content hit) bumps nothing", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    await memoryQueryCmd({ cwd: "/work/code-demo", q: "kubernetes helm" });
    expect(loadUsage(repo)).toEqual({}); // no keyword/file/commit hit anywhere → no bump
  });

  it("empty-q query overlays usage onto ranking but never bumps", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { bumpUsage, loadUsage } = await import("../../src/memory/usage-store.js");
    bumpUsage(repo, ["semantic/code-demo/spool"], "2026-06-18"); // seed count=1
    stdout.length = 0;
    await memoryQueryCmd({ cwd: "/work/code-demo" }); // empty q
    const payload = JSON.parse(stdout.join(""));
    const spool = payload.semantic.find((x: any) => x.entry.id === "semantic/code-demo/spool");
    expect(spool.entry.accessCount).toBe(1); // overlay applied even on empty q
    expect(loadUsage(repo)["semantic/code-demo/spool"].count).toBe(1); // but NOT bumped (still 1)
  });

  it("a query never mutates the synced index.memory.json", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const idxPath = join(repo, ".memarium/index.memory.json");
    const before = readFileSync(idxPath, "utf8");
    await memoryQueryCmd({ cwd: "/work/code-demo", q: "spool" }); // a real, bumping recall
    expect(readFileSync(idxPath, "utf8")).toBe(before); // byte-identical: usage lives in the local sidecar
  });

  // Cases from independent reviews. A memory that shares only a question
  // pattern (怎么, 怎么才能, 是怎么做的) or one side word with the query must not be
  // recorded as used; a topical match must be, including an exact term that
  // contains a function word (统一下单) and a lone short topic (TODO：去重). The
  // entries are old and low-importance, so an unrecorded one stays a never-used
  // archival candidate. `hits` are the entries that must be content hits, so the
  // usage rule, not the ranking, is what keeps the others out.
  const USAGE_CASES: { name: string; q: string; used: string[]; unused: string[]; hits: string[];
    rows: string[][]; entities?: Record<string, string[]> }[] = [
    { name: "SQLite 怎么恢复 / 怎么修改字体", q: "SQLite 怎么恢复", used: ["db"], unused: ["font"], hits: ["db", "font"],
      rows: [["db", "SQLite 快照恢复步骤", "还原持久化数据。"], ["font", "怎么修改字体", "使用显示设置。"]] },
    { name: "SQLite 怎么恢复 / 恢复字体设置", q: "SQLite 怎么恢复", used: ["db"], unused: ["font"], hits: ["db", "font"],
      rows: [["db", "SQLite 快照恢复步骤", "使用本地快照。"], ["font", "恢复字体设置", "重置显示样式。"]] },
    { name: "Git 怎么配置", q: "Git 怎么配置", used: ["git"], unused: ["docker"], hits: ["git", "docker"],
      rows: [["git", "Git 配置凭据", "凭据管理。"], ["docker", "Docker 配置镜像", "容器镜像加速。"]] },
    { name: "SQLite 是怎么做的", q: "SQLite 是怎么做的", used: ["sql"], unused: ["ui"], hits: ["sql", "ui"],
      rows: [["sql", "SQLite 持久化实现", "使用日志文件。"], ["ui", "按钮动画是怎么做的", "界面动效说明。"]] },
    // An ASCII word match still counts, as in 0.22.8, so the TODO-only memory is recorded too.
    { name: "TODO：修复重复入账", q: "TODO：修复重复入账", used: ["ledger", "font"], unused: [], hits: ["ledger", "font"],
      rows: [["ledger", "修复重复入账", "同一笔账单按流水号去重。"], ["font", "TODO：修改字体", "界面配色指引。"]] },
    { name: "TODO：去重", q: "TODO：去重", used: ["dedup"], unused: [], hits: ["dedup"],
      rows: [["dedup", "去重", "按流水号归并。"], ["ui", "界面样式", "调整显示大小。"]] },
    { name: "怎么才能恢复数据库 / 怎么才能修改字体", q: "怎么才能恢复数据库", used: ["db"], unused: ["font"], hits: ["db", "font"],
      rows: [["db", "数据库恢复步骤", "从备份还原业务数据。"], ["font", "怎么才能修改字体", "界面配色指引。"]] },
    { name: "怎么才能恢复数据库 / 恢复字体设置", q: "怎么才能恢复数据库", used: ["db"], unused: ["font"], hits: ["db", "font"],
      rows: [["db", "数据库恢复步骤", "备份还原。"], ["font", "恢复字体设置", "重置显示样式。"]] },
    { name: "统一下单", q: "统一下单", used: ["pay"], unused: [], hits: ["pay"],
      rows: [["pay", "统一下单", "商户用此接口创建支付订单。"], ["font", "界面样式", "调整显示大小。"]] },
    { name: "统一下单 inside a longer title", q: "统一下单", used: ["pay"], unused: [], hits: ["pay"],
      rows: [["pay", "统一下单接口签名", "商户用此接口创建支付订单。"], ["bg", "界面样式", "调整显示大小。"]] },
    { name: "如何统一下单", q: "如何统一下单", used: ["pay"], unused: [], hits: ["pay"],
      rows: [["pay", "统一下单", "商户用此接口创建支付订单。"], ["font", "怎么修改字体", "界面样式。"]] },
    // A name that merely occurs inside a longer query is not naming the memory.
    { name: "测试 inside a long mixed question", q: "为什么 PostgreSQL 连接池偶尔超时，应该怎样测试重连逻辑？", used: ["gold"], unused: ["ui"], hits: ["gold", "ui"],
      rows: [["gold", "PostgreSQL 连接池重连", "按错误码重试。"], ["ui", "测试", "仅用于测试屏幕色温。"]] },
    { name: "entity 数据 inside 数据库", q: "SQLite 数据库的快照损坏后，怎样恢复订单记录？", used: ["gold"], unused: ["ui"], hits: ["gold", "ui"],
      rows: [["gold", "SQLite 快照恢复", "从检查点还原订单。"], ["ui", "广告点击报表", "仅统计广告数据。"]], entities: { ui: ["数据"] } },
    { name: "测试 joined across punctuation", q: "CPU 使用量需要先预测，试运行后怎么导出结果？", used: ["gold"], unused: ["ui"], hits: ["gold", "ui"],
      rows: [["gold", "CPU 使用量预测", "写入监控。"], ["ui", "测试", "导出色卡。"]] },
    { name: "function-word entity 现在", q: "现在怎样排查支付失败？", used: ["gold"], unused: ["ui"], hits: ["gold", "ui"],
      rows: [["gold", "支付失败排查", "检查渠道回执。"], ["ui", "日历组件", "现在显示为选中日期。"]], entities: { ui: ["现在"] } },
    { name: "测试 inside a long Chinese question", q: "退款上线前应该怎样测试重复扣款的回滚路径？", used: ["gold"], unused: ["ui"], hits: ["gold", "ui"],
      rows: [["gold", "重复扣款回滚", "按业务单号处理。"], ["ui", "测试", "仅用于测试屏幕色温。"]] },
    // Quoting a name, or giving it as the whole topic after a label, is naming.
    { name: "quoted entity 「测试」", q: "请查实体名为「测试」的那条记忆", used: ["ui"], unused: [], hits: ["ui"],
      rows: [["ui", "显示器色温校准", "保存测量结果。"], ["bg", "界面样式", "调整显示大小。"]], entities: { ui: ["测试"] } },
    { name: "quoted title 「测试」", q: "请查标题为「测试」的那条记忆", used: ["ui"], unused: [], hits: ["ui"],
      rows: [["ui", "测试", "仅用于校准色温。"], ["bg", "界面样式", "调整显示大小。"]] },
    { name: "TODO：去重 naming an entity", q: "TODO：去重", used: ["dedup"], unused: [], hits: ["dedup"],
      rows: [["dedup", "流水号核对", "按交易号归并。"], ["bg", "界面样式", "调整显示大小。"]], entities: { dedup: ["去重"] } },
    { name: "去重", q: "去重", used: ["ledger"], unused: ["font"], hits: ["ledger"],
      rows: [["ledger", "重复导入时去重", "比对流水号。"], ["font", "怎么修改字体", "使用显示设置。"]] },
    { name: "有没有备份", q: "有没有备份", used: ["backup"], unused: ["promo"], hits: ["backup", "promo"],
      rows: [["backup", "备份", "保留数据副本。"], ["promo", "有没有优惠", "查看折扣。"]] },
    { name: "要不要回滚部署", q: "要不要回滚部署", used: ["ops"], unused: ["font"], hits: ["ops", "font"],
      rows: [["ops", "回滚部署", "恢复旧版本。"], ["font", "要不要修改字体", "调整界面。"]] },
    { name: "有没有 alone", q: "有没有", used: [], unused: ["ui"], hits: ["ui"],
      rows: [["ui", "有没有替代字体", "调整显示。"], ["bg", "界面样式", "调整显示大小。"]] },
    { name: "现在时", q: "现在时", used: ["grammar"], unused: [], hits: ["grammar"],
      rows: [["grammar", "现在时", "英语动词时态。"], ["bg", "界面样式", "调整显示大小。"]] },
    // Each hit is judged on its own: an unrelated TODO memory does not stop 去重
    // from counting, and the absence of a SQLite memory does not make a shared
    // question tail count.
    { name: "TODO：去重 beside a TODO memory", q: "TODO：去重", used: ["dedup", "font"], unused: [], hits: ["dedup", "font"],
      rows: [["dedup", "去重", "按流水号归并。"], ["font", "TODO：修改字体", "界面配色指引。"]] },
    { name: "SQLite 是怎么做的 with no SQLite memory", q: "SQLite 是怎么做的", used: [], unused: ["ui"], hits: ["ui"],
      rows: [["ui", "按钮动画是怎么做的", "界面动效说明。"], ["bg", "界面样式", "调整显示大小。"]] },
  ];

  it.each(USAGE_CASES)("records topical matches as used, not shared question patterns: $name", async ({ q, rows, used, unused, hits, entities }) => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    const { planArchival, ARCHIVE_DEFAULTS } = await import("../../src/memory/archive.js");
    const entries = Object.fromEntries(rows.map(([slug, title, summary]) => {
      const id = `semantic/code-demo/${slug}`;
      return [id, { id, type: "semantic", scope: "project:code-demo", project: "code-demo", title, summary,
        path: `memory/semantic/code-demo/${slug}.md`, status: "active", confidence: 0.9, importance: 1,
        createdAt: "2024-01-01", updatedAt: "2024-01-01", validFrom: null, validTo: null, sourceSessions: [],
        sourceCommits: [], sourceFiles: [], supersedes: null, entities: entities?.[slug!] ?? [], trust: "trusted", originDevice: null,
        accessCount: 0, lastAccess: null }];
    }));
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries }));
    await memoryQueryCmd({ cwd: "/work/code-demo", q });
    const p = JSON.parse(stdout.join(""));
    for (const slug of hits) {
      expect(p.semantic.find((s: { entry: { id: string } }) => s.entry.id.endsWith(`/${slug}`))?.whyRecalled).toContain("keyword");
    }
    const usage = loadUsage(repo);
    const recorded = Object.keys(usage).map((id) => id.split("/").pop());
    for (const slug of used) expect(recorded).toContain(slug);
    for (const slug of unused) expect(recorded).not.toContain(slug);
    const candidates = planArchival(Object.values(entries) as never, usage, { now: "2026-11-23", ...ARCHIVE_DEFAULTS, knownSessions: undefined })
      .archive.map((a) => a.id.split("/").pop());
    for (const slug of unused) expect(candidates).toContain(slug);
    for (const slug of used) expect(candidates).not.toContain(slug);
  });


  it("bumps at most the top 5 content-hit results, even with 6 hits", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    // overwrite the index with 6 entries that all keyword-hit "widget" (equal score)
    const entries: Record<string, any> = {};
    for (let i = 1; i <= 6; i++) {
      const id = `semantic/code-demo/widget-${i}`;
      entries[id] = { id, type: "semantic", scope: "project:code-demo", project: "code-demo",
        title: "widget thing", summary: "about widget", path: `memory/semantic/code-demo/widget-${i}.md`,
        status: "active", confidence: 0.9, importance: 3, createdAt: "2026-06-01", updatedAt: "2026-06-01",
        validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: ["widget"], originDevice: null, accessCount: 0, lastAccess: null };
    }
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries }));
    await memoryQueryCmd({ cwd: "/work/code-demo", q: "widget" });
    const u = loadUsage(repo);
    expect(Object.keys(u).length).toBe(5);              // capped at 5
    expect(u["semantic/code-demo/widget-6"]).toBeUndefined(); // lowest-ranked tie dropped
  });

  it("splits semantic by trust: trusted → semantic, untrusted/unknown → untrustedSemantic (#23)", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const e = (id: string, trust: string) => ({ id, type: "semantic", scope: "project:code-demo",
      project: "code-demo", title: id, summary: "s", path: `memory/${id}.md`, status: "active",
      confidence: 0.9, importance: 3, createdAt: "2026-06-01", updatedAt: "2026-06-01", validFrom: null,
      validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], trust, originDevice: null, accessCount: 0, lastAccess: null });
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "semantic/code-demo/t": e("semantic/code-demo/t", "trusted"),
      "semantic/code-demo/u": e("semantic/code-demo/u", "untrusted"),
      "semantic/code-demo/k": e("semantic/code-demo/k", "unknown"),
    } }));
    stdout.length = 0;
    await memoryQueryCmd({ cwd: "/work/code-demo" });
    const p = JSON.parse(stdout.join(""));
    expect(p.semantic.map((x: any) => x.entry.id)).toEqual(["semantic/code-demo/t"]);
    const un = p.untrustedSemantic.map((x: any) => x.entry.id);
    expect(un).toContain("semantic/code-demo/u");
    expect(un).toContain("semantic/code-demo/k");
    // and the primer only carries the trusted one
    expect(p.primer).toContain("semantic/code-demo/t");
    expect(p.primer).not.toContain("semantic/code-demo/u");
  });
});
