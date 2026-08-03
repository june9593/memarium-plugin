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
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));

    // session index so cwd resolves to project "code-demo"
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: {
        "claude:s1": {
          sessionId: "s1", shortId: "s1", tool: "claude", project: "code-demo",
          projectRaw: "/work/code-demo", startedAt: "2026-01-01T00:00:00Z",
          endedAt: "2026-01-01T00:00:00Z", nameSlug: "x", displayName: "x",
          relativePath: "raw_sessions/claude/code-demo/2026-01-01/x__s1.md",
          sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x",
        },
      },
    }));

    // seed entity index with two entities
    mkdirSync(join(repo, "memory/entities/code-demo"), { recursive: true });
    mkdirSync(join(repo, "memory/entities/_global"), { recursive: true });
    // write the spool-writer entity md file so matchedEntities can read its body
    writeFileSync(
      join(repo, "memory/entities/code-demo/spool-writer.md"),
      "---\nid: entity/code-demo/spool-writer\nkind: symbol\n---\n\n# SpoolWriter\n\nWrites spool files.\n",
    );
    writeFileSync(join(repo, ".memarium/index.entity.json"), JSON.stringify({
      version: 1, entries: {
        "entity/code-demo/spool-writer": {
          id: "entity/code-demo/spool-writer",
          kind: "symbol",
          scope: "project:code-demo",
          project: "code-demo",
          title: "SpoolWriter",
          aliases: ["writer"],
          sourceMemoryIds: [],
          sourceSessions: ["s1"],
          sourceFiles: ["src/writer.ts"],
          relatedEntities: [],
          path: "memory/entities/code-demo/spool-writer.md",
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
        // Entity with the SAME title/alias as spool-writer but belonging to a DIFFERENT project
        "entity/other-proj/spool-writer": {
          id: "entity/other-proj/spool-writer",
          kind: "symbol",
          scope: "project:other-proj",
          project: "other-proj",
          title: "SpoolWriter",
          aliases: ["writer"],
          sourceMemoryIds: [],
          sourceSessions: [],
          sourceFiles: [],
          relatedEntities: [],
          path: "memory/entities/other-proj/spool-writer.md",
          createdAt: "2026-06-09",
          updatedAt: "2026-06-09",
        },
        // Global-scoped entity that shares the alias "writer" — should always appear
        "entity/_global/writer-global": {
          id: "entity/_global/writer-global",
          kind: "concept",
          scope: "global",
          project: null,
          title: "WriterGlobal",
          aliases: ["writer"],
          sourceMemoryIds: [],
          sourceSessions: [],
          sourceFiles: [],
          relatedEntities: [],
          path: "memory/entities/_global/writer-global.md",
          createdAt: "2026-06-01",
          updatedAt: "2026-06-01",
        },
      },
    }));

    // seed memory index for reverse lookup
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "semantic/code-demo/spool": {
          id: "semantic/code-demo/spool",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "Spool single md",
          summary: "since 0.6.0",
          path: "memory/semantic/code-demo/spool.md",
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
        "semantic/code-demo/spool-superseded": {
          id: "semantic/code-demo/spool-superseded",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "Old SpoolWriter note",
          summary: "superseded old note",
          path: "memory/semantic/code-demo/spool-superseded.md",
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
    await entityQueryCmd({ cwd: "/work/code-demo" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.project).toBe("code-demo");
    expect(Array.isArray(payload.entities)).toBe(true);
    const ids = payload.entities.map((x: any) => x.entry.id);
    expect(ids).toContain("entity/code-demo/spool-writer");
    // global entity also included
    expect(ids).toContain("entity/_global/typescript");
  });

  it("filters by kind when --kind is provided", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", kind: "symbol" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.entities.map((x: any) => x.entry.id);
    expect(ids).toContain("entity/code-demo/spool-writer");
    expect(ids).not.toContain("entity/_global/typescript");
  });

  it("scores higher for text match against title/aliases", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", q: "writer" });
    const payload = JSON.parse(stdout.join(""));
    // spool-writer should be ranked first due to title/alias match
    expect(payload.entities[0].entry.id).toBe("entity/code-demo/spool-writer");
  });

  it("--entity adds referencingMemories (entities[] match, case-insensitive)", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.referencingMemories)).toBe(true);
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // "semantic/code-demo/spool" has entities: ["SpoolWriter", "spool"]
    expect(ids).toContain("semantic/code-demo/spool");
  });

  it("--entity also matches memories whose title contains the entity name", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // "core/g/workflow" has title "SpoolWriter workflow note" which contains "spoolwriter" (case-insensitive)
    expect(ids).toContain("core/g/workflow");
  });

  it("without --entity, referencingMemories is absent", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.referencingMemories).toBeUndefined();
  });

  it("without --entity, matchedEntities is absent", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo" });
    const payload = JSON.parse(stdout.join(""));
    expect(payload.matchedEntities).toBeUndefined();
  });

  it("--entity returns matchedEntities with entry + body when md exists (title match)", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "SpoolWriter" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
    const match = payload.matchedEntities.find((x: any) => x.entry.id === "entity/code-demo/spool-writer");
    expect(match).toBeDefined();
    expect(match.entry.title).toBe("SpoolWriter");
    expect(typeof match.body).toBe("string");
    expect(match.body).toContain("SpoolWriter");
    expect(match.body).toContain("Writes spool files.");
  });

  it("--entity returns matchedEntities via alias match (case-insensitive)", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    // "writer" is an alias of spool-writer
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "writer" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.matchedEntities.map((x: any) => x.entry.id);
    expect(ids).toContain("entity/code-demo/spool-writer");
  });

  it("--entity returns empty matchedEntities when no entity page matches", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "nonexistent-thing" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
    expect(payload.matchedEntities).toHaveLength(0);
  });

  it("--entity still returns referencingMemories alongside matchedEntities", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "SpoolWriter" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.referencingMemories)).toBe(true);
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
  });

  it("referencingMemories items have expected fields", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "SpoolWriter" });
    const payload = JSON.parse(stdout.join(""));
    const mem = payload.referencingMemories.find((x: any) => x.id === "semantic/code-demo/spool");
    expect(mem).toBeDefined();
    expect(mem.title).toBe("Spool single md");
    expect(mem.type).toBe("semantic");
    expect(Array.isArray(mem.sourceSessions)).toBe(true);
  });

  it("--entity with missing/undefined entities field does not throw and only matches on title", async () => {
    // Overwrite memory index with an entry that has NO entities field (corrupted/older index)
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "semantic/code-demo/no-entities": {
          id: "semantic/code-demo/no-entities",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "entry without entities field",
          summary: "older entry",
          path: "memory/semantic/code-demo/no-entities.md",
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
        "semantic/code-demo/title-match": {
          id: "semantic/code-demo/title-match",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "spoolwriter design note",
          summary: "matches via title only",
          path: "memory/semantic/code-demo/title-match.md",
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
    await expect(entityQueryCmd({ cwd: "/work/code-demo", entity: "spoolwriter" })).resolves.not.toThrow();
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // no-entities entry has no title match → not in results
    expect(ids).not.toContain("semantic/code-demo/no-entities");
    // title-match entry matches via title → in results
    expect(ids).toContain("semantic/code-demo/title-match");
  });

  // Fix 1: eligibility filtering tests
  it("referencingMemories excludes superseded memories even when they mention the entity", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // superseded entry has entities: ["SpoolWriter"] and title "Old SpoolWriter note" — must be excluded
    expect(ids).not.toContain("semantic/code-demo/spool-superseded");
    // eligible same-project entry IS included
    expect(ids).toContain("semantic/code-demo/spool");
  });

  it("referencingMemories excludes other-project memories when cwd project is set", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    // other-project entry (scope: "project:other-proj") must be excluded when cwd is code-demo
    expect(ids).not.toContain("semantic/other-proj/spool-note");
    // global-scope entry IS included
    expect(ids).toContain("core/g/workflow");
  });

  it("referencingMemories excludes archived memories even when they reference the entity", async () => {
    // Overwrite memory index with an archived entry (referencing the entity) + an active control.
    // The archival invariant ("archived is out of recall") must keep it out of referencingMemories.
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "semantic/code-demo/archived-ref": {
          id: "semantic/code-demo/archived-ref",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "Archived SpoolWriter note",
          summary: "archived, still references the entity",
          path: "memory/semantic/code-demo/archived-ref.md",
          status: "archived",
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
          entities: ["SpoolWriter"],
          originDevice: null,
          accessCount: 0,
          lastAccess: null,
          archivedAt: "2026-05-01",
          archivedReason: "unused-low-value",
        },
        "semantic/code-demo/active-ref": {
          id: "semantic/code-demo/active-ref",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "Active SpoolWriter note",
          summary: "still active",
          path: "memory/semantic/code-demo/active-ref.md",
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
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    expect(ids).not.toContain("semantic/code-demo/archived-ref"); // archived excluded
    expect(ids).toContain("semantic/code-demo/active-ref");       // active control included
  });

  it("referencingMemories excludes expired memories (validTo <= today)", async () => {
    // Overwrite memory index with an expired entry
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({
      version: 1, entries: {
        "semantic/code-demo/expired": {
          id: "semantic/code-demo/expired",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "SpoolWriter expired note",
          summary: "this expired yesterday",
          path: "memory/semantic/code-demo/expired.md",
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
        "semantic/code-demo/active": {
          id: "semantic/code-demo/active",
          type: "semantic",
          scope: "project:code-demo",
          project: "code-demo",
          title: "SpoolWriter active note",
          summary: "still valid",
          path: "memory/semantic/code-demo/active.md",
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
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "spoolwriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.referencingMemories.map((x: any) => x.id);
    expect(ids).not.toContain("semantic/code-demo/expired");
    expect(ids).toContain("semantic/code-demo/active");
  });

  // Fix 3: scope-filter on matchedEntities — no cross-project leakage
  it("--entity matchedEntities includes only cwd-project and global entities, not other-project entities with the same title/alias", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    // "SpoolWriter" is shared by entity/code-demo/spool-writer (scope: project:code-demo)
    // AND entity/other-proj/spool-writer (scope: project:other-proj).
    // Cwd resolves to "code-demo" — so only the cwd-project page and global ones may appear.
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "SpoolWriter" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.matchedEntities.map((x: any) => x.entry.id);
    // cwd-project page MUST be present
    expect(ids).toContain("entity/code-demo/spool-writer");
    // other-project page with the same title MUST be absent
    expect(ids).not.toContain("entity/other-proj/spool-writer");
  });

  it("--entity matchedEntities includes a global-scoped entity whose alias matches even from another scope", async () => {
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    // "writer" is an alias of both cwd-project spool-writer AND global writer-global
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "writer" });
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.matchedEntities.map((x: any) => x.entry.id);
    expect(ids).toContain("entity/code-demo/spool-writer");
    expect(ids).toContain("entity/_global/writer-global");
    expect(ids).not.toContain("entity/other-proj/spool-writer");
  });

  // Fix 2: path-traversal guard tests
  it("matchedEntities with path outside memory/entities/ yields body: '' and does not read the file", async () => {
    // Create a secret file outside memory/entities/
    const secretPath = join(repo, "secret.md");
    writeFileSync(secretPath, "super secret content");
    // Add an entity index entry with a traversal path
    writeFileSync(join(repo, ".memarium/index.entity.json"), JSON.stringify({
      version: 1, entries: {
        "entity/code-demo/evil": {
          id: "entity/code-demo/evil",
          kind: "symbol",
          scope: "project:code-demo",
          project: "code-demo",
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
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "traversaltarget" });
    const payload = JSON.parse(stdout.join(""));
    expect(Array.isArray(payload.matchedEntities)).toBe(true);
    const match = payload.matchedEntities.find((x: any) => x.entry.id === "entity/code-demo/evil");
    expect(match).toBeDefined();
    // body must be empty — file outside memory/entities/ must not be read
    expect(match.body).toBe("");
  });

  // Fix 2: aliases non-array guard
  it("--entity with missing/non-array aliases on entity does not throw and skips alias match", async () => {
    // Overwrite entity index with an entry that has no aliases field (corrupted/older index)
    writeFileSync(join(repo, ".memarium/index.entity.json"), JSON.stringify({
      version: 1, entries: {
        "entity/code-demo/no-aliases": {
          id: "entity/code-demo/no-aliases",
          kind: "symbol",
          scope: "project:code-demo",
          project: "code-demo",
          title: "NoAliasEntity",
          // aliases intentionally absent — simulates corrupted index
          sourceMemoryIds: [],
          sourceSessions: [],
          sourceFiles: [],
          relatedEntities: [],
          path: "memory/entities/code-demo/no-aliases.md",
          createdAt: "2026-06-09",
          updatedAt: "2026-06-09",
        },
        "entity/code-demo/alias-match": {
          id: "entity/code-demo/alias-match",
          kind: "symbol",
          scope: "project:code-demo",
          project: "code-demo",
          title: "HasAlias",
          aliases: ["noaliasalias"],
          sourceMemoryIds: [],
          sourceSessions: [],
          sourceFiles: [],
          relatedEntities: [],
          path: "memory/entities/code-demo/alias-match.md",
          createdAt: "2026-06-09",
          updatedAt: "2026-06-09",
        },
      },
    }));
    vi.resetModules();
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    // must not throw even when aliases field is absent
    await expect(entityQueryCmd({ cwd: "/work/code-demo", entity: "noaliasalias" })).resolves.not.toThrow();
    const payload = JSON.parse(stdout.join(""));
    const ids = payload.matchedEntities.map((x: any) => x.entry.id);
    // no-aliases entity should NOT match on alias (aliases missing → treated as [])
    expect(ids).not.toContain("entity/code-demo/no-aliases");
    // alias-match entity DOES match via alias
    expect(ids).toContain("entity/code-demo/alias-match");
  });

  // Fix 4: symlink-safe read guard
  it("--entity with a symlinked path outside memory/entities/ yields body: '' (symlink guard)", async () => {
    const { symlinkSync, mkdirSync: fsMkdir } = await import("node:fs");
    // Create a secret file outside the repo
    const secretContent = "TOP SECRET via symlink";
    const secretFile = join(fakeHome, "secret-outside.md");
    writeFileSync(secretFile, secretContent);

    // Create a symlink INSIDE memory/entities/ that points to the secret file
    fsMkdir(join(repo, "memory/entities/code-demo"), { recursive: true });
    const symlinkPath = join(repo, "memory/entities/code-demo/symlinked.md");
    try {
      symlinkSync(secretFile, symlinkPath);
    } catch {
      // skip if symlinks not supported
      return;
    }

    writeFileSync(join(repo, ".memarium/index.entity.json"), JSON.stringify({
      version: 1, entries: {
        "entity/code-demo/symlinked": {
          id: "entity/code-demo/symlinked",
          kind: "symbol",
          scope: "project:code-demo",
          project: "code-demo",
          title: "SymlinkedSecret",
          aliases: [],
          sourceMemoryIds: [],
          sourceSessions: [],
          sourceFiles: [],
          relatedEntities: [],
          path: "memory/entities/code-demo/symlinked.md",
          createdAt: "2026-06-09",
          updatedAt: "2026-06-09",
        },
      },
    }));
    vi.resetModules();
    const { entityQueryCmd } = await import("../../src/commands/entity-query.js");
    await entityQueryCmd({ cwd: "/work/code-demo", entity: "symlinkedsecret" });
    const payload = JSON.parse(stdout.join(""));
    const match = payload.matchedEntities.find((x: any) => x.entry.id === "entity/code-demo/symlinked");
    expect(match).toBeDefined();
    // body must be empty — symlink points outside memory/entities/
    expect(match.body).toBe("");
    // must not disclose secret content
    expect(JSON.stringify(payload)).not.toContain(secretContent);
  });
});
