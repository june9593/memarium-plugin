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
          trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null },
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

  it("ignores a stale _primer file and renders live from the index (P0b)", async () => {
    // A stale/misleading _primer file must NOT be preferred — memory-primer
    // renders live from the (merged) memory view, so it can never serve
    // cross-device memory from a frozen local snapshot.
    const primerDir = join(repo, "memory", "_primer");
    mkdirSync(primerDir, { recursive: true });
    writeFileSync(join(primerDir, "edge-memvc.md"), "# STALE do not use\n\nold cached primer\n");

    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/edge-memvc" });
    const out = stdout.join("");
    expect(out).not.toContain("STALE do not use");
    expect(out).toContain("# Project memory: edge-memvc");
    expect(out).toContain("never npm publish"); // rendered from the index, not the file
  });

  it("includes sibling-device memory from the aggregated overlay (P0b cross-device)", async () => {
    // The npm CLI mounts origin/main at ~/.vibebook/aggregated; HOME is stubbed,
    // so write a sibling core memory into the overlay's memory index.
    const ovl = join(fakeHome, ".vibebook", "aggregated", ".vibebook");
    mkdirSync(ovl, { recursive: true });
    writeFileSync(join(ovl, "index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "core/sibling": { id: "core/sibling", type: "core", scope: "global", project: null,
          title: "sibling-device rule", summary: "from another machine", path: "memory/core/_global/sibling.md",
          status: "active", confidence: 1, importance: 5, createdAt: "2026-06-20",
          updatedAt: "2026-06-20", validFrom: null, validTo: null, sourceSessions: [],
          sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
          originDevice: "mac-mini-2", accessCount: 0, lastAccess: null },
      },
    }));
    const { memoryPrimerCmd } = await import("../../src/commands/memory-primer.js");
    await memoryPrimerCmd({ cwd: "/work/edge-memvc" });
    const out = stdout.join("");
    expect(out).toContain("never npm publish");      // local memory
    expect(out).toContain("sibling-device rule");    // overlay (sibling device) memory
  });
});
