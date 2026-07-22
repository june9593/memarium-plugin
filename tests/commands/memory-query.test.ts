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
