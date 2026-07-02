import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryWriteCmd", () => {
  let fakeHome: string;
  let repo: string;
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memw-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("writes md + updates index.memory.json", async () => {
    const input = join(fakeHome, "mem.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "semantic/edge-memvc/spool-format", type: "semantic",
        scope: "project:edge-memvc", project: "edge-memvc",
        title: "Spool is single .md per session", summary: "since 0.6.0",
        status: "active", confidence: 0.9, importance: 4,
        createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
        sourceSessions: ["abc"], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: ["spool"], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "Each session renders to one markdown file.",
    }]));

    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    const report = await memoryWriteCmd({ inputPath: input });

    expect(report.written).toBe(1);
    const mdPath = join(repo, "memory/semantic/edge-memvc/spool-format.md");
    expect(existsSync(mdPath)).toBe(true);
    expect(readFileSync(mdPath, "utf8")).toContain("title: Spool is single .md per session");

    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["semantic/edge-memvc/spool-format"].path)
      .toBe("memory/semantic/edge-memvc/spool-format.md");
  });

  it("marks supersedes target as superseded", async () => {
    const seed = join(fakeHome, "seed.json");
    writeFileSync(seed, JSON.stringify([{
      entry: { id: "semantic/p/old", type: "semantic", scope: "project:p", project: "p",
        title: "old fact", summary: "x", status: "active", confidence: 0.8, importance: 2,
        createdAt: "2026-01-01", updatedAt: "2026-01-01", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
        entities: [], originDevice: null, accessCount: 0, lastAccess: null }, body: "old" },
    ]));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    await memoryWriteCmd({ inputPath: seed });

    const replace = join(fakeHome, "new.json");
    writeFileSync(replace, JSON.stringify([{
      entry: { id: "semantic/p/new", type: "semantic", scope: "project:p", project: "p",
        title: "new fact", summary: "y", status: "active", confidence: 0.9, importance: 3,
        createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: "semantic/p/old",
        entities: [], originDevice: null, accessCount: 0, lastAccess: null }, body: "new" },
    ]));
    await memoryWriteCmd({ inputPath: replace });

    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["semantic/p/old"].status).toBe("superseded");
    expect(idx.entries["semantic/p/new"].status).toBe("active");
  });

  it("persists superseded status to the target md frontmatter", async () => {
    const seed = join(fakeHome, "seed2.json");
    writeFileSync(seed, JSON.stringify([{
      entry: { id: "semantic/p/stale", type: "semantic", scope: "project:p", project: "p",
        title: "stale fact", summary: "s", status: "active", confidence: 0.8, importance: 2,
        createdAt: "2026-01-01", updatedAt: "2026-01-01", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
        entities: [], originDevice: null, accessCount: 0, lastAccess: null }, body: "stale" },
    ]));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    await memoryWriteCmd({ inputPath: seed });

    const staleMdPath = join(repo, "memory/semantic/p/stale.md");
    expect(existsSync(staleMdPath)).toBe(true);
    // Verify md currently says status: active
    expect(readFileSync(staleMdPath, "utf8")).toContain("status: active");

    const replace2 = join(fakeHome, "new2.json");
    writeFileSync(replace2, JSON.stringify([{
      entry: { id: "semantic/p/fresh", type: "semantic", scope: "project:p", project: "p",
        title: "fresh fact", summary: "f", status: "active", confidence: 0.9, importance: 3,
        createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: "semantic/p/stale",
        entities: [], originDevice: null, accessCount: 0, lastAccess: null }, body: "fresh" },
    ]));
    await memoryWriteCmd({ inputPath: replace2 });

    // The superseded target's md file must now contain "status: superseded"
    expect(readFileSync(staleMdPath, "utf8")).toContain("status: superseded");
    expect(readFileSync(staleMdPath, "utf8")).not.toContain("status: active");
  });

  it("throws on path traversal attempt", async () => {
    const input = join(fakeHome, "evil.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "semantic/p/evil", type: "semantic", scope: "project:p", project: "p",
        title: "evil", summary: "e", status: "active", confidence: 0.5, importance: 1,
        createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
        entities: [], originDevice: null, accessCount: 0, lastAccess: null,
        // crafted path that escapes out of memory/
        path: "../../escape.md",
      },
      body: "bad",
    }]));

    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    // canonical-path check fires first (path mismatch), but the traversal is also blocked
    await expect(memoryWriteCmd({ inputPath: input })).rejects.toThrow(/does not match canonical|refusing to write outside memory\//);
    // must not have created the file at the escaping path
    expect(existsSync(join(repo, "../../escape.md"))).toBe(false);
  });

  it("rejects a gated entry (core) — directs to memory-propose, writes nothing", async () => {
    const input = join(fakeHome, "g.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "core/yue-workflow", type: "core", scope: "global", project: null,
        title: "wf", summary: "s", status: "active", confidence: 0.9, importance: 5,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "b",
    }]));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    await expect(memoryWriteCmd({ inputPath: input })).rejects.toThrow(/memory-propose/);
    expect(existsSync(join(repo, "memory/core/_global/yue-workflow.md"))).toBe(false);
  });

  it("rejects a non-gated entry that supersedes a gated id (bypass closed)", async () => {
    const idxPath = join(repo, ".memarium/index.memory.json");
    writeFileSync(idxPath, JSON.stringify({ version: 1, entries: { "core/y": {
      id: "core/y", type: "core", scope: "global", project: null, title: "y", summary: "s",
      path: "memory/core/_global/y.md", status: "active", confidence: 1, importance: 5,
      createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
      originDevice: null, accessCount: 0, lastAccess: null } } }));
    const input = join(fakeHome, "s.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "semantic/p/z", type: "semantic", scope: "project:p", project: "p",
        title: "z", summary: "s", status: "active", confidence: 0.5, importance: 1,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: "core/y", entities: [], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "b",
    }]));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    await expect(memoryWriteCmd({ inputPath: input })).rejects.toThrow(/memory-propose/);
  });

  it("rejects a non-gated entry whose path points under memory/core/", async () => {
    const input = join(fakeHome, "p.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "semantic/p/z", type: "semantic", scope: "project:p", project: "p",
        title: "z", summary: "s", path: "memory/core/_global/yue-workflow.md",
        status: "active", confidence: 0.5, importance: 1,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "evil",
    }]));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    await expect(memoryWriteCmd({ inputPath: input })).rejects.toThrow(/does not match canonical/);
  });

  it("rejects a non-gated entry whose type traverses into core/ (no bypass via memory-write)", async () => {
    const input = join(fakeHome, "trav.json");
    writeFileSync(input, JSON.stringify([{ entry: {
      id: "x/yue-workflow", type: "semantic/../core", scope: "global", project: null,
      title: "t", summary: "s", status: "active", confidence: 0.5, importance: 1,
      createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    }, body: "evil" }]));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    await expect(memoryWriteCmd({ inputPath: input })).rejects.toThrow(/invalid type/i);
    expect(existsSync(join(repo, "memory/core/_global/yue-workflow.md"))).toBe(false);
  });

  it("gated-change error names the canonical target key for supersede cases", async () => {
    // gated (core) entry that supersedes another id → targetKey is the superseded id
    const input = join(fakeHome, "rep.json");
    writeFileSync(input, JSON.stringify([{ entry: {
      id: "core/new", type: "core", scope: "global", project: null,
      title: "t", summary: "s", status: "active", confidence: 1, importance: 5,
      createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [],
      supersedes: "semantic/p/old", entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    }, body: "b" }]));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    await expect(memoryWriteCmd({ inputPath: input })).rejects.toThrow(/semantic\/p\/old/);
  });
});
