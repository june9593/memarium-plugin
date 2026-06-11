import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryPrimerCmd", () => {
  let fakeHome: string, repo: string, stdout: string[];

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memp-"));
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
        "procedural/edge-memvc/bump": { id: "procedural/edge-memvc/bump", type: "procedural",
          scope: "project:edge-memvc", project: "edge-memvc", title: "Bump and tag workflow",
          summary: "npm run build + vitest + version + tag", path: "memory/procedural/edge-memvc/bump.md",
          status: "active", confidence: 0.95, importance: 4, createdAt: "2026-06-01",
          updatedAt: "2026-06-01", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: null, accessCount: 0, lastAccess: null },
      },
    }));
    stdout = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      stdout.push(typeof c === "string" ? c : Buffer.from(c).toString()); return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("writes primer markdown to stdout and does NOT write _primer/ to disk", async () => {
    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/edge-memvc" });
    const out = stdout.join("");
    // Assert 1: correct header + entry titles
    expect(out).toContain("# Project memory: edge-memvc");
    expect(out).toContain("never npm publish");
    expect(out).toContain("Spool single md");
    expect(out).toContain("Bump and tag workflow");
    // Assert 2: key read-only assertion — _primer/ must NOT be created
    expect(existsSync(join(repo, "memory", "_primer"))).toBe(false);
  });

  it("returns silently when cwd resolves to no project", async () => {
    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/no/such/project" });
    expect(stdout.join("")).toBe("");
    expect(existsSync(join(repo, "memory", "_primer"))).toBe(false);
  });

  it("prints pre-written _primer file verbatim when it exists (prefers on-disk file)", async () => {
    // Pre-write a _primer file as the digest command would
    const primerDir = join(repo, "memory", "_primer");
    mkdirSync(primerDir, { recursive: true });
    const prewritten = "# Project memory: edge-memvc\n\nPre-written content from digest.\n";
    writeFileSync(join(primerDir, "edge-memvc.md"), prewritten);

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/edge-memvc" });
    // Should print the pre-written file verbatim, not re-render from index
    expect(stdout.join("")).toBe(prewritten);
  });
});
