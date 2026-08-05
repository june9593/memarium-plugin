import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMemoryMarkdown, normalizeMemoryEntryForWrite } from "../../src/memory/render.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import { deriveMemoryScope } from "../../src/memory/gate.js";
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

describe("identLine refuses an UNSET required identifier (same class as #54)", () => {
  it("throws for an undefined id / type / scope / status", () => {
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
});
