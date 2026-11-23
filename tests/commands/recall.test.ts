import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Minimal MemoryEntry factory (only the fields the scorer/recall touch).
function mk(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "semantic/code-demo/x", type: "semantic", scope: "project:code-demo", project: "code-demo",
    title: "t", summary: "s", path: "memory/semantic/code-demo/x.md", status: "active",
    confidence: 0.9, importance: 3, createdAt: "2026-06-01", updatedAt: "2026-06-01",
    validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("recall (2-stage over typed memory)", () => {
  let fakeHome: string, repo: string, overlay: string, stdout: string[];

  function writeLocalIndex(entries: Record<string, unknown>) {
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries }));
  }
  function writeOverlayIndex(entries: Record<string, unknown>) {
    mkdirSync(join(overlay, ".memarium"), { recursive: true });
    writeFileSync(join(overlay, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries }));
  }

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-recall-"));
    vi.stubEnv("HOME", fakeHome);
    // MEMARIUM_DIR wins over HOME, so pin it too: an outer value would send
    // usage writes from these tests into the caller's store.
    vi.stubEnv("MEMARIUM_DIR", join(fakeHome, ".memarium"));
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    overlay = join(fakeHome, ".memarium/aggregated"); // = aggregatedOverlayPath() under stubbed HOME
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // spool index so cwd "/work/code-demo" resolves to project "code-demo"
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": {
        sessionId: "s1", shortId: "s1", tool: "claude", project: "code-demo",
        projectRaw: "/work/code-demo", startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T00:00:00Z",
        nameSlug: "x", displayName: "x", relativePath: "raw_sessions/claude/code-demo/2026-01-01/x__s1.md",
        sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x" } },
    }));
    stdout = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      stdout.push(typeof c === "string" ? c : Buffer.from(c).toString()); return true;
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  async function run(opts: Record<string, unknown>) {
    const { recallCmd } = await import("../../src/commands/recall.js");
    await recallCmd(opts);
    return JSON.parse(stdout.join(""));
  }

  it("ranks a keyword hit above baseline entries and echoes whyRecalled", async () => {
    writeLocalIndex({
      "semantic/code-demo/widget": mk({ id: "semantic/code-demo/widget", title: "widget subsystem",
        summary: "the widget", entities: ["widget"], path: "memory/semantic/code-demo/widget.md" }),
      "core/g": mk({ id: "core/g", type: "core", scope: "global", project: null, title: "a rule",
        importance: 5, path: "memory/core/_global/g.md" }),
    });
    const p = await run({ cwd: "/work/code-demo", q: "widget" });
    expect(p.stage).toBe("stage-1-ranked");
    expect(p.entries[0].id).toBe("semantic/code-demo/widget");
    expect(p.entries[0].whyRecalled).toContain("keyword");
    expect(p.meta.returned).toBe(2);
  });

  it("resolves local paths under the repo and overlay paths under the overlay worktree (P0b)", async () => {
    writeLocalIndex({
      "semantic/code-demo/local": mk({ id: "semantic/code-demo/local", title: "local widget",
        entities: ["widget"], path: "memory/semantic/code-demo/local.md" }),
    });
    writeOverlayIndex({
      "episodic/code-demo/remote": mk({ id: "episodic/code-demo/remote", type: "episodic",
        title: "remote widget arc", entities: ["widget"], updatedAt: "2026-06-05",
        path: "memory/episodic/code-demo/remote.md" }),
    });
    const p = await run({ cwd: "/work/code-demo", q: "widget" });
    const local = p.entries.find((h: any) => h.id === "semantic/code-demo/local");
    const remote = p.entries.find((h: any) => h.id === "episodic/code-demo/remote");
    expect(local.source).toBe("local");
    expect(local.path).toBe(join(repo, "memory/semantic/code-demo/local.md"));
    expect(remote.source).toBe("overlay");
    expect(remote.path).toBe(join(overlay, "memory/episodic/code-demo/remote.md")); // NOT under repo
  });

  it("excludes superseded entries from the ranked list", async () => {
    writeLocalIndex({
      "semantic/code-demo/old": mk({ id: "semantic/code-demo/old", status: "superseded",
        title: "old widget", entities: ["widget"], path: "memory/semantic/code-demo/old.md" }),
      "semantic/code-demo/new": mk({ id: "semantic/code-demo/new", title: "new widget",
        entities: ["widget"], path: "memory/semantic/code-demo/new.md" }),
    });
    const p = await run({ cwd: "/work/code-demo", q: "widget" });
    const ids = p.entries.map((h: any) => h.id);
    expect(ids).toContain("semantic/code-demo/new");
    expect(ids).not.toContain("semantic/code-demo/old");
  });

  it("empty query returns a scope-eligible list plus a primer header", async () => {
    writeLocalIndex({
      "semantic/code-demo/fact": mk({ id: "semantic/code-demo/fact", title: "a project fact",
        path: "memory/semantic/code-demo/fact.md" }),
    });
    const p = await run({ cwd: "/work/code-demo" });
    expect(p.query).toBe("");
    expect(p.entries.length).toBeGreaterThan(0);
    expect(p.primer).toContain("# Project memory: code-demo");
  });

  it("flags cwdUnresolved when the cwd maps to no synced project", async () => {
    writeLocalIndex({});
    const p = await run({ cwd: "/somewhere/unknown" });
    expect(p.meta.cwdUnresolved).toBe(true);
    expect(p.project).toBeNull();
  });

  it("bumps the local usage sidecar on a content-hit query but never the synced index", async () => {
    writeLocalIndex({
      "semantic/code-demo/widget": mk({ id: "semantic/code-demo/widget", title: "widget",
        entities: ["widget"], path: "memory/semantic/code-demo/widget.md" }),
    });
    const idxPath = join(repo, ".memarium/index.memory.json");
    const before = readFileSync(idxPath, "utf8");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    await run({ cwd: "/work/code-demo", q: "widget" });
    expect(loadUsage(repo)["semantic/code-demo/widget"]?.count).toBe(1);
    expect(readFileSync(idxPath, "utf8")).toBe(before); // synced index untouched
  });

  // Cases from an independent review: a memory that shares only a question
  // pattern (怎么, 怎么才能) with the query must not be recorded as used, and a
  // real topical match must be. The entries are old and low-importance, so an
  // unrecorded one stays a never-used archival candidate.
  const USAGE_CASES = [
    { q: "SQLite 怎么恢复", used: ["db"], unused: ["font"], hits: ["db", "font"],
      rows: [["db", "SQLite 快照恢复步骤", "还原持久化数据。"], ["font", "怎么修改字体", "使用显示设置。"]] },
    { q: "TODO：修复重复入账", used: ["ledger"], unused: [], hits: ["ledger", "font"],
      rows: [["ledger", "修复重复入账", "同一笔账单按流水号去重。"], ["font", "TODO：修改字体", "界面配色指引。"]] },
    { q: "怎么才能恢复数据库", used: ["db"], unused: ["font"], hits: ["db", "font"],
      rows: [["db", "数据库恢复步骤", "从备份还原业务数据。"], ["font", "怎么才能修改字体", "界面配色指引。"]] },
    { q: "去重", used: ["ledger"], unused: ["font"], hits: ["ledger"],
      rows: [["ledger", "重复导入时去重", "比对流水号。"], ["font", "怎么修改字体", "使用显示设置。"]] },
  ];

  it.each(USAGE_CASES)("records topical matches as used, not shared question patterns: $q", async ({ q, rows, used, unused, hits }) => {
    writeLocalIndex(Object.fromEntries(rows.map(([slug, title, summary]) => [`semantic/code-demo/${slug}`,
      mk({ id: `semantic/code-demo/${slug}`, title, summary, importance: 1, createdAt: "2024-01-01",
        updatedAt: "2024-01-01", path: `memory/semantic/code-demo/${slug}.md` })])));
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    const { planArchival, ARCHIVE_DEFAULTS } = await import("../../src/memory/archive.js");
    const p = await run({ cwd: "/work/code-demo", q });
    // The weak entries are real content hits of this query, so the rule is what keeps them out.
    for (const slug of hits) {
      expect(p.entries.find((h: { id: string }) => h.id.endsWith(`/${slug}`))?.whyRecalled).toContain("keyword");
    }
    const usage = loadUsage(repo);
    const recorded = Object.keys(usage).map((id) => id.split("/").pop());
    for (const slug of used) expect(recorded).toContain(slug);
    for (const slug of unused) expect(recorded).not.toContain(slug);
    const index = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8")).entries;
    const candidates = planArchival(Object.values(index) as never, usage, { now: "2026-11-23", ...ARCHIVE_DEFAULTS })
      .archive.map((a) => a.id.split("/").pop());
    for (const slug of unused) expect(candidates).toContain(slug);
    for (const slug of used) expect(candidates).not.toContain(slug);
  });
});
