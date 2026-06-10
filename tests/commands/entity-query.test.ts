import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("entityQueryCmd", () => {
  let fakeHome: string, repo: string, stdout: string[];

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-entq-"));
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
      version: 1, entries: {
        "claude:s1": {
          sessionId: "s1", shortId: "s1", tool: "claude", project: "edge-memvc",
          projectRaw: "/work/edge-memvc", startedAt: "2026-01-01T00:00:00Z",
          endedAt: "2026-01-01T00:00:00Z", nameSlug: "x", displayName: "x",
          relativePath: "raw_sessions/claude/edge-memvc/2026-01-01/x__s1.md",
          sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x",
        },
      },
    }));

    // seed entity index with two entities
    writeFileSync(join(repo, ".vibebook/index.entity.json"), JSON.stringify({
      version: 1, entries: {
        "entity/edge-memvc/spool-writer": {
          id: "entity/edge-memvc/spool-writer",
          kind: "symbol",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "SpoolWriter",
          aliases: ["writer"],
          sourceMemoryIds: [],
          sourceSessions: ["s1"],
          sourceFiles: ["src/writer.ts"],
          relatedEntities: [],
          path: "memory/entities/edge-memvc/spool-writer.md",
          createdAt: "2026-06-09",
          updatedAt: "2026-06-09",
        },
        "entity/_global/typescript": {
          id: "entity/_global/typescript",
          kind: "concept",
          scope: "global",
          project: null,
          title: "TypeScript",
          aliases: [],
          sourceMemoryIds: [],
          sourceSessions: [],
          sourceFiles: [],
          relatedEntities: [],
          path: "memory/entities/_global/typescript.md",
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
        },
      },
    }));

    // seed memory index for reverse lookup
    writeFileSync(join(repo, ".vibebook/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "semantic/edge-memvc/spool": {
          id: "semantic/edge-memvc/spool",
          type: "semantic",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "Spool single md",
          summary: "since 0.6.0",
          path: "memory/semantic/edge-memvc/spool.md",
          status: "active",
          confidence: 0.9,
          importance: 4,
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
          validFrom: null,
          validTo: null,
          sourceSessions: ["s1"],
          sourceCommits: [],
          sourceFiles: ["src/writer.ts"],
          supersedes: null,
          entities: ["SpoolWriter", "spool"],
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
        },
        "core/g/workflow": {
          id: "core/g/workflow",
          type: "core",
          scope: "global",
          project: null,
          title: "SpoolWriter workflow note",
          summary: "writer note",
          path: "memory/core/_global/workflow.md",
          status: "active",
          confidence: 1,
          importance: 5,
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
          validFrom: null,
          validTo: null,
          sourceSessions: [],
          sourceCommits: [],
          sourceFiles: [],
          supersedes: null,
          entities: [],
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
        },
      },
    }));

    stdout = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      stdout.push(typeof c === "string" ? c : Buffer.from(c).toString());
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("emits project + scored entities for cwd project", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.project).toBe("edge-memvc");
    expect(Array.isArray(payload.entities)).toBe(true);
    const ids = payload.entities.map((x: any) => x.entry.id);
    expect(ids).toContain("entity/edge-memvc/spool-writer");
    // global entity also included
    expect(ids).toContain("entity/_global/typescript");
  });

  it("filters by kind when --kind is provided", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", kind: "symbol" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.entities.map((x: any) => x.entry.id);
    expect(ids).toContain("entity/edge-memvc/spool-writer");
    expect(ids).not.toContain("entity/_global/typescript");
  });

  it("scores higher for text match against title/aliases", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", q: "writer" });
    const payload = JSON.parse(stdout.join(""));
    // spool-writer should be ranked first due to title/alias match
    expect(payload.entities[0].entry.id).toBe("entity/edge-memvc/spool-writer");
  });

  it("--entity adds referencingMemories (entities[] match, case-insensitive)", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.referencingMemories)).toBe(true);
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // "semantic/edge-memvc/spool" has entities: ["SpoolWriter", "spool"]
    expect(ids).toContain("semantic/edge-memvc/spool");
  });

  it("--entity also matches memories whose title contains the entity name", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // "core/g/workflow" has title "SpoolWriter workflow note" which contains "spoolwriter" (case-insensitive)
    expect(ids).toContain("core/g/workflow");
  });

  it("without --entity, referencingMemories is absent", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.referencingMemories).toBeUndefined();
  });

  it("referencingMemories items have expected fields", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "SpoolWriter" });
    const payload = JSON.parse(stdout.join(""));
    const mem = payload.referencingMemories.find((x: any) => x.id === "semantic/edge-memvc/spool");
    expect(mem).toBeDefined();
    expect(mem.title).toBe("Spool single md");
    expect(mem.type).toBe("semantic");
    expect(Array.isArray(mem.sourceSessions)).toBe(true);
  });
});
