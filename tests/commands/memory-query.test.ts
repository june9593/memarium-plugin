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
});
