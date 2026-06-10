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
    mkdirSync(join(repo, "memory/entities/edge-memvc"), { recursive: true });
    mkdirSync(join(repo, "memory/entities/_global"), { recursive: true });
    // write the spool-writer entity md file so matchedEntities can read its body
    writeFileSync(
      join(repo, "memory/entities/edge-memvc/spool-writer.md"),
      "---\nid: entity/edge-memvc/spool-writer\nkind: symbol\n---\n\n# SpoolWriter\n\nWrites spool files.\n",
    );
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
        // superseded entry — must be excluded from referencingMemories
        "semantic/edge-memvc/spool-superseded": {
          id: "semantic/edge-memvc/spool-superseded",
          type: "semantic",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "Old SpoolWriter note",
          summary: "superseded old note",
          path: "memory/semantic/edge-memvc/spool-superseded.md",
          status: "superseded",
          confidence: 0.5,
          importance: 2,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          validFrom: null,
          validTo: null,
          sourceSessions: [],
          sourceCommits: [],
          sourceFiles: [],
          supersedes: null,
          entities: ["SpoolWriter"],
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
        },
        // other-project entry — must be excluded from referencingMemories when cwd project is set
        "semantic/other-proj/spool-note": {
          id: "semantic/other-proj/spool-note",
          type: "semantic",
          scope: "project:other-proj",
          project: "other-proj",
          title: "SpoolWriter in other project",
          summary: "from a different project",
          path: "memory/semantic/other-proj/spool-note.md",
          status: "active",
          confidence: 0.8,
          importance: 3,
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
          validFrom: null,
          validTo: null,
          sourceSessions: [],
          sourceCommits: [],
          sourceFiles: [],
          supersedes: null,
          entities: ["SpoolWriter"],
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

  it("without --entity, matchedEntities is absent", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.matchedEntities).toBeUndefined();
  });

  it("--entity returns matchedEntities with entry + body when md exists (title match)", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "SpoolWriter" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
    const match = payload.matchedEntities.find((x: any) => x.entry.id === "entity/edge-memvc/spool-writer");
    expect(match).toBeDefined();
    expect(match.entry.title).toBe("SpoolWriter");
    expect(typeof match.body).toBe("string");
    expect(match.body).toContain("SpoolWriter");
    expect(match.body).toContain("Writes spool files.");
  });

  it("--entity returns matchedEntities via alias match (case-insensitive)", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    // "writer" is an alias of spool-writer
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "writer" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.matchedEntities.map((x: any) => x.entry.id);
    expect(ids).toContain("entity/edge-memvc/spool-writer");
  });

  it("--entity returns empty matchedEntities when no entity page matches", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "nonexistent-thing" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
    expect(payload.matchedEntities).toHaveLength(0);
  });

  it("--entity still returns referencingMemories alongside matchedEntities", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "SpoolWriter" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.referencingMemories)).toBe(true);
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
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

  it("--entity with missing/undefined entities field does not throw and only matches on title", async () => {
    // Overwrite memory index with an entry that has NO entities field (corrupted/older index)
    writeFileSync(join(repo, ".vibebook/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "semantic/edge-memvc/no-entities": {
          id: "semantic/edge-memvc/no-entities",
          type: "semantic",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "entry without entities field",
          summary: "older entry",
          path: "memory/semantic/edge-memvc/no-entities.md",
          status: "active",
          confidence: 0.9,
          importance: 3,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          validFrom: null,
          validTo: null,
          sourceSessions: [],
          sourceCommits: [],
          sourceFiles: [],
          supersedes: null,
          // entities field intentionally absent (simulates corrupted/older index)
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
        },
        "semantic/edge-memvc/title-match": {
          id: "semantic/edge-memvc/title-match",
          type: "semantic",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "spoolwriter design note",
          summary: "matches via title only",
          path: "memory/semantic/edge-memvc/title-match.md",
          status: "active",
          confidence: 0.9,
          importance: 3,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          validFrom: null,
          validTo: null,
          sourceSessions: [],
          sourceCommits: [],
          sourceFiles: [],
          supersedes: null,
          // entities also absent
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
        },
      },
    }));
    vi.resetModules();
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    // must not throw even though entities field is missing
    await expect(entityQueryCmd({ cwd: "/work/edge-memvc", entity: "spoolwriter" })).resolves.not.toThrow();
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // no-entities entry has no title match → not in results
    expect(ids).not.toContain("semantic/edge-memvc/no-entities");
    // title-match entry matches via title → in results
    expect(ids).toContain("semantic/edge-memvc/title-match");
  });

  // Fix 1: eligibility filtering tests
  it("referencingMemories excludes superseded memories even when they mention the entity", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // superseded entry has entities: ["SpoolWriter"] and title "Old SpoolWriter note" — must be excluded
    expect(ids).not.toContain("semantic/edge-memvc/spool-superseded");
    // eligible same-project entry IS included
    expect(ids).toContain("semantic/edge-memvc/spool");
  });

  it("referencingMemories excludes other-project memories when cwd project is set", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // other-project entry (scope: "project:other-proj") must be excluded when cwd is edge-memvc
    expect(ids).not.toContain("semantic/other-proj/spool-note");
    // global-scope entry IS included
    expect(ids).toContain("core/g/workflow");
  });

  it("referencingMemories excludes expired memories (validTo <= today)", async () => {
    // Overwrite memory index with an expired entry
    writeFileSync(join(repo, ".vibebook/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "semantic/edge-memvc/expired": {
          id: "semantic/edge-memvc/expired",
          type: "semantic",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "SpoolWriter expired note",
          summary: "this expired yesterday",
          path: "memory/semantic/edge-memvc/expired.md",
          status: "active",
          confidence: 0.9,
          importance: 3,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          validFrom: null,
          validTo: "2000-01-01",  // unconditionally in the past → always expired (clock-independent)
          sourceSessions: [],
          sourceCommits: [],
          sourceFiles: [],
          supersedes: null,
          entities: ["SpoolWriter"],
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
        },
        "semantic/edge-memvc/active": {
          id: "semantic/edge-memvc/active",
          type: "semantic",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "SpoolWriter active note",
          summary: "still valid",
          path: "memory/semantic/edge-memvc/active.md",
          status: "active",
          confidence: 0.9,
          importance: 3,
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
          validFrom: null,
          validTo: null,
          sourceSessions: [],
          sourceCommits: [],
          sourceFiles: [],
          supersedes: null,
          entities: ["SpoolWriter"],
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
        },
      },
    }));
    vi.resetModules();
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    expect(ids).not.toContain("semantic/edge-memvc/expired");
    expect(ids).toContain("semantic/edge-memvc/active");
  });

  // Fix 2: path-traversal guard tests
  it("matchedEntities with path outside memory/entities/ yields body: '' and does not read the file", async () => {
    // Create a secret file outside memory/entities/
    const secretPath = join(repo, "secret.md");
    writeFileSync(secretPath, "super secret content");
    // Add an entity index entry with a traversal path
    writeFileSync(join(repo, ".vibebook/index.entity.json"), JSON.stringify({
      version: 1, entries: {
        "entity/edge-memvc/evil": {
          id: "entity/edge-memvc/evil",
          kind: "symbol",
          scope: "project:edge-memvc",
          project: "edge-memvc",
          title: "TraversalTarget",
          aliases: [],
          sourceMemoryIds: [],
          sourceSessions: [],
          sourceFiles: [],
          relatedEntities: [],
          // traversal path: ../../secret.md resolves outside memory/entities/
          path: "memory/entities/../../secret.md",
          createdAt: "2026-06-09",
          updatedAt: "2026-06-09",
        },
      },
    }));
    vi.resetModules();
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/edge-memvc", entity: "traversaltarget" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
    const match = payload.matchedEntities.find((x: any) => x.entry.id === "entity/edge-memvc/evil");
    expect(match).toBeDefined();
    // body must be empty — file outside memory/entities/ must not be read
    expect(match.body).toBe("");
  });
});
