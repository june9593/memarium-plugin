import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Minimal MemoryEntry factory (only the fields the scorer/recall touch).
function mk(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "semantic/edge-memvc/x", type: "semantic", scope: "project:edge-memvc", project: "edge-memvc",
    title: "t", summary: "s", path: "memory/semantic/edge-memvc/x.md", status: "active",
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
    // spool index so cwd "/work/edge-memvc" resolves to project "edge-memvc"
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": {
        sessionId: "s1", shortId: "s1", tool: "claude", project: "edge-memvc",
        projectRaw: "/work/edge-memvc", startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T00:00:00Z",
        nameSlug: "x", displayName: "x", relativePath: "raw_sessions/claude/edge-memvc/2026-01-01/x__s1.md",
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
      "semantic/edge-memvc/widget": mk({ id: "semantic/edge-memvc/widget", title: "widget subsystem",
        summary: "the widget", entities: ["widget"], path: "memory/semantic/edge-memvc/widget.md" }),
      "core/g": mk({ id: "core/g", type: "core", scope: "global", project: null, title: "a rule",
        importance: 5, path: "memory/core/_global/g.md" }),
    });
    const p = await run({ cwd: "/work/edge-memvc", q: "widget" });
    expect(p.stage).toBe("stage-1-ranked");
    expect(p.entries[0].id).toBe("semantic/edge-memvc/widget");
    expect(p.entries[0].whyRecalled).toContain("keyword");
    expect(p.meta.returned).toBe(2);
  });

  it("resolves local paths under the repo and overlay paths under the overlay worktree (P0b)", async () => {
    writeLocalIndex({
      "semantic/edge-memvc/local": mk({ id: "semantic/edge-memvc/local", title: "local widget",
        entities: ["widget"], path: "memory/semantic/edge-memvc/local.md" }),
    });
    writeOverlayIndex({
      "episodic/edge-memvc/remote": mk({ id: "episodic/edge-memvc/remote", type: "episodic",
        title: "remote widget arc", entities: ["widget"], updatedAt: "2026-06-05",
        path: "memory/episodic/edge-memvc/remote.md" }),
    });
    const p = await run({ cwd: "/work/edge-memvc", q: "widget" });
    const local = p.entries.find((h: any) => h.id === "semantic/edge-memvc/local");
    const remote = p.entries.find((h: any) => h.id === "episodic/edge-memvc/remote");
    expect(local.source).toBe("local");
    expect(local.path).toBe(join(repo, "memory/semantic/edge-memvc/local.md"));
    expect(remote.source).toBe("overlay");
    expect(remote.path).toBe(join(overlay, "memory/episodic/edge-memvc/remote.md")); // NOT under repo
  });

  it("excludes superseded entries from the ranked list", async () => {
    writeLocalIndex({
      "semantic/edge-memvc/old": mk({ id: "semantic/edge-memvc/old", status: "superseded",
        title: "old widget", entities: ["widget"], path: "memory/semantic/edge-memvc/old.md" }),
      "semantic/edge-memvc/new": mk({ id: "semantic/edge-memvc/new", title: "new widget",
        entities: ["widget"], path: "memory/semantic/edge-memvc/new.md" }),
    });
    const p = await run({ cwd: "/work/edge-memvc", q: "widget" });
    const ids = p.entries.map((h: any) => h.id);
    expect(ids).toContain("semantic/edge-memvc/new");
    expect(ids).not.toContain("semantic/edge-memvc/old");
  });

  it("empty query returns a scope-eligible list plus a primer header", async () => {
    writeLocalIndex({
      "semantic/edge-memvc/fact": mk({ id: "semantic/edge-memvc/fact", title: "a project fact",
        path: "memory/semantic/edge-memvc/fact.md" }),
    });
    const p = await run({ cwd: "/work/edge-memvc" });
    expect(p.query).toBe("");
    expect(p.entries.length).toBeGreaterThan(0);
    expect(p.primer).toContain("# Project memory: edge-memvc");
  });

  it("flags cwdUnresolved when the cwd maps to no synced project", async () => {
    writeLocalIndex({});
    const p = await run({ cwd: "/somewhere/unknown" });
    expect(p.meta.cwdUnresolved).toBe(true);
    expect(p.project).toBeNull();
  });

  it("bumps the local usage sidecar on a content-hit query but never the synced index", async () => {
    writeLocalIndex({
      "semantic/edge-memvc/widget": mk({ id: "semantic/edge-memvc/widget", title: "widget",
        entities: ["widget"], path: "memory/semantic/edge-memvc/widget.md" }),
    });
    const idxPath = join(repo, ".memarium/index.memory.json");
    const before = readFileSync(idxPath, "utf8");
    const { loadUsage } = await import("../../src/memory/usage-store.js");
    await run({ cwd: "/work/edge-memvc", q: "widget" });
    expect(loadUsage(repo)["semantic/edge-memvc/widget"]?.count).toBe(1);
    expect(readFileSync(idxPath, "utf8")).toBe(before); // synced index untouched
  });
});
