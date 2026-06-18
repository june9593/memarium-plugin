import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryQueryCmd", () => {
  let fakeHome: string, repo: string, stdout: string[];
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memq-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".vibebook/session-repo");
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
    mkdirSync(join(fakeHome, ".vibebook"), { recursive: true });
    writeFileSync(join(fakeHome, ".vibebook/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // session index so cwd resolves to project "edge-memvc"
    writeFileSync(join(repo, ".vibebook/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": {
        sessionId: "s1", shortId: "s1", tool: "claude", project: "edge-memvc",
        projectRaw: "/work/edge-memvc", startedAt: "2026-01-01T00:00:00Z",
        endedAt: "2026-01-01T00:00:00Z", nameSlug: "x", displayName: "x",
        relativePath: "raw_sessions/claude/edge-memvc/2026-01-01/x__s1.md",
        sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x" } },
    }));
    writeFileSync(join(repo, ".vibebook/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "core/g": { id: "core/g", type: "core", scope: "global", project: null,
          title: "never npm publish", summary: "Yue OTP", path: "memory/core/_global/g.md",
          status: "active", confidence: 1, importance: 5, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
        "semantic/edge-memvc/spool": { id: "semantic/edge-memvc/spool", type: "semantic",
          scope: "project:edge-memvc", project: "edge-memvc", title: "Spool single md",
          summary: "since 0.6.0", path: "memory/semantic/edge-memvc/spool.md",
          status: "active", confidence: 0.9, importance: 4, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: ["spool"],
          originDevice: null, accessCount: 0, lastAccess: null },
        "working/edge-memvc/task": { id: "working/edge-memvc/task", type: "working",
          scope: "project:edge-memvc", project: "edge-memvc", title: "Current task",
          summary: "in-progress note", path: "memory/working/edge-memvc/task.md",
          status: "active", confidence: 0.7, importance: 2, createdAt: "2026-06-09",
          updatedAt: "2026-06-09", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
        "semantic/edge-memvc/old": { id: "semantic/edge-memvc/old", type: "semantic",
          scope: "project:edge-memvc", project: "edge-memvc", title: "Old fact",
          summary: "stale", path: "memory/semantic/edge-memvc/old.md",
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

  it("emits layered context for the cwd project + writes primer", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/edge-memvc" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.project).toBe("edge-memvc");
    expect(payload.core.map((x: any) => x.entry.id)).toContain("core/g");
    expect(payload.semantic.map((x: any) => x.entry.id)).toContain("semantic/edge-memvc/spool");
    expect(payload.primer).toContain("# Project memory: edge-memvc");
    expect(existsSync(join(repo, "memory/_primer/edge-memvc.md"))).toBe(true);
  });

  it("--q filters by text and includes whyRecalled", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/edge-memvc", q: "spool" });
    const payload = JSON.parse(stdout.join(""));
    const all = [...payload.core, ...payload.semantic, ...payload.procedures];
    const spool = all.find((x: any) => x.entry.id === "semantic/edge-memvc/spool");
    expect(spool.whyRecalled).toContain("keyword");
  });

  it("payload includes working array", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/edge-memvc" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.working)).toBe(true);
    expect(payload.working.map((x: any) => x.entry.id)).toContain("working/edge-memvc/task");
  });

  it("conflicts includes superseded entries even though scoreMemories drops them", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    await memoryQueryCmd({ cwd: "/work/edge-memvc" });
    const payload = JSON.parse(stdout.join(""));
    const conflictIds = payload.conflicts.map((x: any) => x.entry.id);
    expect(conflictIds).toContain("semantic/edge-memvc/old");
    const supersededItem = payload.conflicts.find((x: any) => x.entry.id === "semantic/edge-memvc/old");
    expect(supersededItem.whyRecalled).toBe("superseded");
  });

  // ---- accessCount tracking (usage sidecar) ----

  it("non-empty content-hit query bumps the matched entry, not baseline entries", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    await memoryQueryCmd({ cwd: "/work/edge-memvc", q: "spool" });
    const u = loadUsage(repo);
    expect(u["semantic/edge-memvc/spool"]?.count).toBe(1); // keyword hit → bumped
    expect(u["core/g"]).toBeUndefined();                   // only scope/importance baseline → NOT bumped
  });

  it("unrelated query (no content hit) bumps nothing", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    await memoryQueryCmd({ cwd: "/work/edge-memvc", q: "kubernetes helm" });
    expect(loadUsage(repo)).toEqual({}); // no keyword/file/commit hit anywhere → no bump
  });

  it("empty-q query overlays usage onto ranking but never bumps", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { bumpUsage, loadUsage } = await import("../../src/memory/usage-store.js");
    bumpUsage(repo, ["semantic/edge-memvc/spool"], "2026-06-18"); // seed count=1
    stdout.length = 0;
    await memoryQueryCmd({ cwd: "/work/edge-memvc" }); // empty q
    const payload = JSON.parse(stdout.join(""));
    const spool = payload.semantic.find((x: any) => x.entry.id === "semantic/edge-memvc/spool");
    expect(spool.entry.accessCount).toBe(1); // overlay applied even on empty q
    expect(loadUsage(repo)["semantic/edge-memvc/spool"].count).toBe(1); // but NOT bumped (still 1)
  });

  it("a query never mutates the synced index.memory.json", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const idxPath = join(repo, ".vibebook/index.memory.json");
    const before = readFileSync(idxPath, "utf8");
    await memoryQueryCmd({ cwd: "/work/edge-memvc", q: "spool" }); // a real, bumping recall
    expect(readFileSync(idxPath, "utf8")).toBe(before); // byte-identical: usage lives in the local sidecar
  });

  it("bumps at most the top 5 content-hit results, even with 6 hits", async () => {
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    // overwrite the index with 6 entries that all keyword-hit "widget" (equal score)
    const entries: Record<string, any> = {};
    for (let i = 1; i <= 6; i++) {
      const id = `semantic/edge-memvc/widget-${i}`;
      entries[id] = { id, type: "semantic", scope: "project:edge-memvc", project: "edge-memvc",
        title: "widget thing", summary: "about widget", path: `memory/semantic/edge-memvc/widget-${i}.md`,
        status: "active", confidence: 0.9, importance: 3, createdAt: "2026-06-01", updatedAt: "2026-06-01",
        validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: ["widget"], originDevice: null, accessCount: 0, lastAccess: null };
    }
    writeFileSync(join(repo, ".vibebook/index.memory.json"), JSON.stringify({ version: 1, entries }));
    await memoryQueryCmd({ cwd: "/work/edge-memvc", q: "widget" });
    const u = loadUsage(repo);
    expect(Object.keys(u).length).toBe(5);              // capped at 5
    expect(u["semantic/edge-memvc/widget-6"]).toBeUndefined(); // lowest-ranked tie dropped
  });
});
