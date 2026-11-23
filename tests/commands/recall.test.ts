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

  // Chinese is matched by character pairs, so a common pair such as 怎么 makes
  // unrelated memories content hits. Those must not be recorded as used: the
  // count feeds later ranking and the never-used archival rule.
  const sqliteAndHowTos = () => ({
    "semantic/code-demo/sqlite": mk({ id: "semantic/code-demo/sqlite", title: "SQLite 快照恢复步骤",
      summary: "从快照恢复 SQLite 数据库。", path: "memory/semantic/code-demo/sqlite.md" }),
    "semantic/code-demo/font": mk({ id: "semantic/code-demo/font", title: "怎么调整字体",
      summary: "界面操作说明。", path: "memory/semantic/code-demo/font.md" }),
    "semantic/code-demo/color": mk({ id: "semantic/code-demo/color", title: "怎么修改配色",
      summary: "界面操作说明。", path: "memory/semantic/code-demo/color.md" }),
  });

  it("a mixed query does not record live hits made only of a common Chinese pair as used", async () => {
    writeLocalIndex(sqliteAndHowTos());
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    const p = await run({ cwd: "/work/code-demo", q: "SQLite 怎么恢复" });
    expect(p.entries.filter((h: { whyRecalled: string }) => h.whyRecalled.includes("keyword"))).toHaveLength(3);
    expect(Object.keys(loadUsage(repo))).toEqual(["semantic/code-demo/sqlite"]);
  });
});
