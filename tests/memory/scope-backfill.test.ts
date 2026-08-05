import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMemoryMarkdown, normalizeMemoryEntryForWrite } from "../../src/memory/render.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import { deriveMemoryScope, deriveMemoryIdentity, isUnrepresentableProject } from "../../src/memory/gate.js";
import { missingRewriteField } from "../../src/memory/apply.js";
import type { MemoryEntry } from "../../src/memory/types.js";

// An entry as an authored write produces it — optional fields simply absent.
// Cast through unknown so TypeScript lets us omit `scope` (mirrors runtime JSON).
function authored(over: Record<string, unknown> = {}): MemoryEntry {
  return {
    id: "semantic/code-demo/a-fact", type: "semantic",
    scope: "project:code-demo", project: "code-demo",
    title: "A fact", summary: "s",
    status: "active", confidence: 0.8, importance: 3,
    createdAt: "2026-08-03", updatedAt: "2026-08-03",
    sourceSessions: [], sourceCommits: [], sourceFiles: [], entities: [],
    ...over,
  } as unknown as MemoryEntry;
}

describe("scope backfill — an entry can no longer be persisted without a scope", () => {
  it("deriveMemoryScope: project → project:<slug>; null/_global → global", () => {
    expect(deriveMemoryScope({ id: "semantic/code-demo/x", project: "code-demo" })).toBe("project:code-demo");
    expect(deriveMemoryScope({ id: "semantic/_global/x", project: null })).toBe("global");
    // project absent but the id's middle segment names one → recovered from the id
    expect(deriveMemoryScope({ id: "semantic/code-demo/x", project: null })).toBe("project:code-demo");
    // two-segment id (e.g. core/user-workflow) has no project segment at all
    expect(deriveMemoryScope({ id: "core/user-workflow", project: null })).toBe("global");
  });

  it("normalize backfills a missing scope: global when project is null", () => {
    const e = authored({ id: "semantic/_global/anthropic-access", scope: undefined, project: null });
    normalizeMemoryEntryForWrite(e);
    expect(e.scope).toBe("global");
  });

  it("normalize backfills a missing scope: project:<p> when the entry has a project", () => {
    const e = authored({ scope: undefined });
    normalizeMemoryEntryForWrite(e);
    expect(e.scope).toBe("project:code-demo");
  });

  it("normalize repairs a legacy literal \"undefined\"/\"null\"/blank scope", () => {
    for (const bad of ["undefined", "null", "", "   "]) {
      const e = authored({ scope: bad, project: null, id: "semantic/_global/x" });
      normalizeMemoryEntryForWrite(e);
      expect(e.scope).toBe("global");
    }
  });

  it("normalize NEVER clobbers an existing valid scope (user / global / project:x)", () => {
    for (const scope of ["user", "global", "project:other"]) {
      // project deliberately disagrees with the scope — the existing scope wins.
      const e = authored({ scope, project: null, id: "semantic/_global/x" });
      normalizeMemoryEntryForWrite(e);
      expect(e.scope).toBe(scope);
    }
    // "user" scope on a project-less entry is the case a naive backfill would eat
    const user = authored({ scope: "user", project: null, id: "core/user-workflow" });
    normalizeMemoryEntryForWrite(user);
    expect(user.scope).toBe("user");
  });

  it("the rendered .md carries the backfilled scope and NO literal \"scope: undefined\"", () => {
    const global = authored({ id: "semantic/_global/x", scope: undefined, project: null });
    const md = renderMemoryMarkdown(normalizeMemoryEntryForWrite(global), "body");
    expect(md).not.toContain("scope: undefined");
    expect(md).toContain("scope: global");
    expect(md).toContain("project: null");

    const scoped = renderMemoryMarkdown(normalizeMemoryEntryForWrite(authored({ scope: undefined })), "body");
    expect(scoped).toContain("scope: project:code-demo");
  });

  it("round-trip: write → parse gives back the backfilled scope, not null/\"undefined\"", () => {
    const e = authored({ id: "semantic/_global/x", scope: undefined, project: null });
    const back = parseMemoryMarkdown(renderMemoryMarkdown(normalizeMemoryEntryForWrite(e), "b"))!;
    expect(back.scope).toBe("global");
    // and the row is no longer "malformed" to the archival row-shape gate
    expect(missingRewriteField({ ...back, path: "p" } as MemoryEntry)).toBeNull();
  });
});

describe("round-38 — scope and project are backfilled TOGETHER, never patched apart", () => {
  it("deriveMemoryIdentity returns BOTH fields from one source of truth", () => {
    // a real project on the entry decides both
    expect(deriveMemoryIdentity({ id: "semantic/code-demo/x", project: "code-demo" }))
      .toEqual({ scope: "project:code-demo", project: "code-demo" });
    // project genuinely unset → the id's middle segment decides BOTH
    expect(deriveMemoryIdentity({ id: "semantic/code-demo/x", project: null }))
      .toEqual({ scope: "project:code-demo", project: "code-demo" });
    // the _global bucket, from either witness → global + no project
    expect(deriveMemoryIdentity({ id: "semantic/_global/x", project: null }))
      .toEqual({ scope: "global", project: null });
    expect(deriveMemoryIdentity({ id: "semantic/code-demo/x", project: "_global" }))
      .toEqual({ scope: "global", project: "_global" });
    // two-segment id has no project segment at all
    expect(deriveMemoryIdentity({ id: "core/user-workflow", project: null }))
      .toEqual({ scope: "global", project: null });
    // a derivation can NEVER manufacture an unrepresentable project (see round-38)
    for (const bad of ["null", "undefined"]) {
      expect(deriveMemoryIdentity({ id: `semantic/${bad}/x`, project: null }))
        .toEqual({ scope: "global", project: null });
    }
  });

  it("ID-FALLBACK backfill sets project too — the two fields AGREE in the .md", () => {
    const e = authored({ id: "semantic/code-demo/x", scope: undefined, project: null });
    normalizeMemoryEntryForWrite(e);
    expect(e.scope).toBe("project:code-demo");
    expect(e.project).toBe("code-demo"); // pre-fix: stayed null while scope said project:code-demo

    const md = renderMemoryMarkdown(e, "b");
    expect(md).toContain("scope: project:code-demo");
    expect(md).toContain("project: code-demo");
    expect(md).not.toContain("project: null");
    // and a rebuild-from-md reads back the SAME pair
    const back = parseMemoryMarkdown(md)!;
    expect(back.scope).toBe("project:code-demo");
    expect(back.project).toBe("code-demo");
  });

  it("never overwrites an EXISTING valid project (or an existing valid scope)", () => {
    // scope unset, project real → project untouched, scope derived from it
    const a = authored({ id: "semantic/code-demo/x", scope: undefined, project: "other-proj" });
    normalizeMemoryEntryForWrite(a);
    expect(a.project).toBe("other-proj");
    expect(a.scope).toBe("project:other-proj");
    // scope present → NOTHING is derived, project stays exactly as authored
    const b = authored({ id: "semantic/code-demo/x", scope: "user", project: null });
    normalizeMemoryEntryForWrite(b);
    expect(b.scope).toBe("user");
    expect(b.project).toBeNull();
  });
});

describe("round-38 — a project slug the frontmatter cannot represent is REFUSED", () => {
  it("isUnrepresentableProject: the bare tokens only — a real slug and `null` are fine", () => {
    for (const bad of ["null", "undefined", "", "  "]) expect(isUnrepresentableProject(bad)).toBe(true);
    for (const ok of ["code-demo", "nullable", "undefined-thing", "my project"]) {
      expect(isUnrepresentableProject(ok)).toBe(false);
    }
    expect(isUnrepresentableProject(null)).toBe(false); // the legitimate "no project"
  });

  it("normalize THROWS rather than persist scope: project:null", () => {
    for (const bad of ["null", "undefined"]) {
      // with a missing scope (the backfill path that would have derived project:null)
      expect(() => normalizeMemoryEntryForWrite(authored({ scope: undefined, project: bad })))
        .toThrow(/refusing to persist project/);
      // and with a scope already present — the record is just as unround-trippable
      expect(() => normalizeMemoryEntryForWrite(authored({ scope: `project:${bad}`, project: bad })))
        .toThrow(/refusing to persist project/);
    }
  });

  it("the archival row-shape gate reports it as unsafe project (skip, not abort)", async () => {
    const { missingRewriteField } = await import("../../src/memory/apply.js");
    for (const bad of ["null", "undefined", ""]) {
      expect(missingRewriteField(authored({ project: bad, path: "p" }))).toBe("unsafe project");
    }
    // regression lock: a normal slug is still a perfectly rewritable row
    expect(missingRewriteField(authored({ path: "memory/semantic/code-demo/a-fact.md" }))).toBeNull();
  });
});

describe("identLine refuses an UNSET required identifier (same class as #54)", () => {  it("throws for an undefined id / type / scope / status", () => {
    expect(() => renderMemoryMarkdown(authored({ id: undefined }), "b")).toThrow(/required field id/);
    expect(() => renderMemoryMarkdown(authored({ type: undefined }), "b")).toThrow(/required field type/);
    // scope bypassing the normalizer must fail LOUDLY rather than persist "undefined"
    expect(() => renderMemoryMarkdown(authored({ scope: undefined }), "b")).toThrow(/required field scope/);
    expect(() => renderMemoryMarkdown(authored({ scope: "null" }), "b")).toThrow(/required field scope/);
    expect(() => renderMemoryMarkdown(authored({ status: "undefined" }), "b")).toThrow(/required field status/);
  });

  it("does NOT break project's legitimate literal null, nor a normal entry", () => {
    const md = renderMemoryMarkdown(authored({ scope: "global", project: null }), "b");
    expect(md).toContain("project: null");
    expect(md).toContain("scope: global");
    // an omitted status still falls back to active via req(), not a throw
    expect(renderMemoryMarkdown(authored({ status: undefined }), "b")).toContain("status: active");
  });
});

describe("regression lock — a normal entry renders byte-identically", () => {
  it("frontmatter + heading + body are unchanged", () => {
    const entry = authored({
      supersedes: null, validFrom: null, validTo: null, originDevice: null,
      archivedAt: null, archivedReason: null,
      sourceSessions: ["sess-1"], sourceCommits: ["abc123"], sourceFiles: ["src/a.ts"],
      entities: ["Tab"], trust: "trusted",
    });
    expect(renderMemoryMarkdown(entry, "the body")).toBe([
      "---",
      "id: semantic/code-demo/a-fact",
      "type: semantic",
      "scope: project:code-demo",
      "project: code-demo",
      "title: A fact",
      "summary: s",
      "status: active",
      "confidence: 0.8",
      "importance: 3",
      "createdAt: 2026-08-03",
      "updatedAt: 2026-08-03",
      "validFrom: null",
      "validTo: null",
      "supersedes: null",
      "originDevice: null",
      "archivedAt: null",
      "archivedReason: null",
      "sourceSessions: [sess-1]",
      "sourceCommits: [abc123]",
      "sourceFiles: [src/a.ts]",
      "entities: [Tab]",
      "trust: trusted",
      "---",
      "",
      "# A fact",
      "",
      "the body",
      "",
    ].join("\n"));
  });
});

describe("the write path persists a backfilled scope to BOTH stores", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-scope-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("a scope-less global entry lands as scope: global in the .md AND the index", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    applyMemoryItems(repo, [{
      entry: authored({ id: "semantic/_global/anthropic-access", scope: undefined, project: null }),
      body: "the fact",
    }]);

    const md = readFileSync(join(repo, "memory/semantic/_global/anthropic-access.md"), "utf8");
    expect(md).not.toContain("scope: undefined");
    expect(md).toContain("scope: global");

    const row = loadMemoryIndex(repo).entries["semantic/_global/anthropic-access"];
    expect(row.scope).toBe("global");
    // the archival row-shape gate no longer counts it malformed ("skipped N malformed index row(s)")
    expect(missingRewriteField(row)).toBeNull();
  });

  it("a scope-less project entry lands as scope: project:<p> in both stores", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    applyMemoryItems(repo, [{ entry: authored({ scope: undefined }), body: "b" }]);

    const md = readFileSync(join(repo, "memory/semantic/code-demo/a-fact.md"), "utf8");
    expect(md).toContain("scope: project:code-demo");
    expect(loadMemoryIndex(repo).entries["semantic/code-demo/a-fact"].scope).toBe("project:code-demo");
  });

  it("round-38: an ID-FALLBACK backfill agrees on scope AND project in the index AND the .md", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    const { missingRewriteField } = await import("../../src/memory/apply.js");
    // neither scope NOR project set — only the id knows which bucket this is
    applyMemoryItems(repo, [{
      entry: authored({ id: "semantic/code-demo/from-id", scope: undefined, project: null }),
      body: "b",
    }]);

    // the canonical path follows the recovered project, not the _global bucket
    const md = readFileSync(join(repo, "memory/semantic/code-demo/from-id.md"), "utf8");
    expect(md).toContain("scope: project:code-demo");
    expect(md).toContain("project: code-demo");
    expect(md).not.toContain("project: null");

    const row = loadMemoryIndex(repo).entries["semantic/code-demo/from-id"];
    expect(row.scope).toBe("project:code-demo");
    expect(row.project).toBe("code-demo"); // pre-fix: null, disagreeing with its own scope
    expect(row.path).toBe("memory/semantic/code-demo/from-id.md");
    expect(missingRewriteField(row)).toBeNull();
  });

  it("round-38: a project slug of \"null\"/\"undefined\" never lands — the write is refused", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    for (const bad of ["null", "undefined"]) {
      expect(() => applyMemoryItems(repo, [{
        entry: authored({ id: `semantic/${bad}/x`, scope: undefined, project: bad }),
        body: "b",
      }])).toThrow(/refusing to persist project/);
    }
    // nothing persisted to EITHER store — no `scope: project:null` record exists
    expect(Object.keys(loadMemoryIndex(repo).entries)).toHaveLength(0);
    for (const bad of ["null", "undefined"]) {
      expect(existsSync(join(repo, `memory/semantic/${bad}`))).toBe(false);
    }
  });
});
