import { describe, it, expect } from "vitest";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function entry(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "procedural/code-demo/add-source-adapter", type: "procedural",
    scope: "project:code-demo", project: "code-demo",
    title: "Add a source adapter", summary: "extend Tool union, register, write parser",
    path: "memory/procedural/code-demo/add-source-adapter.md",
    status: "active", confidence: 0.9, importance: 4,
    createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
    sourceSessions: ["abc12345"], sourceCommits: [], sourceFiles: ["src/sources/base.ts"],
    supersedes: null, entities: ["Tool", "SourceAdapter"], originDevice: "mac", accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("renderMemoryMarkdown", () => {
  it("renders YAML frontmatter + body", () => {
    const md = renderMemoryMarkdown(entry(), "Writer needs zero changes.");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("id: procedural/code-demo/add-source-adapter");
    expect(md).toContain("type: procedural");
    expect(md).toContain("scope: project:code-demo");
    expect(md).toContain("status: active");
    expect(md).toContain("entities: [Tool, SourceAdapter]");
    expect(md).toContain("sourceSessions: [abc12345]");
    expect(md).toContain("sourceFiles: [src/sources/base.ts]");
    expect(md).toContain("\n---\n\n# Add a source adapter\n");
    expect(md.trimEnd().endsWith("Writer needs zero changes.")).toBe(true);
  });

  it("emits empty arrays as []", () => {
    const md = renderMemoryMarkdown(entry({ entities: [], sourceSessions: [] }), "body");
    expect(md).toContain("entities: []");
    expect(md).toContain("sourceSessions: []");
  });

  it("omits null optional scalars cleanly (validTo, supersedes)", () => {
    const md = renderMemoryMarkdown(entry({ validTo: null, supersedes: null }), "body");
    expect(md).toContain("validTo: null");
    expect(md).toContain("supersedes: null");
  });

  it("renders trust; absent → unknown (#23)", () => {
    expect(renderMemoryMarkdown(entry({ trust: "untrusted" }), "body")).toContain("trust: untrusted");
    expect(renderMemoryMarkdown(entry({ trust: undefined }), "body")).toContain("trust: unknown");
  });

  it("does not throw when array fields are undefined; renders [] (#37)", () => {
    for (const f of ["sourceSessions", "sourceCommits", "sourceFiles", "entities"] as const) {
      const md = renderMemoryMarkdown(entry({ [f]: undefined }), "body");
      expect(md).toContain(`${f}: []`);
    }
    // all arrays + summary undefined at once → still renders, no undefined.length throw
    const thin = renderMemoryMarkdown(
      entry({ sourceSessions: undefined, sourceCommits: undefined, sourceFiles: undefined, entities: undefined, summary: undefined }),
      "body",
    );
    expect(thin).toContain("sourceSessions: []");
    expect(thin).toContain("entities: []");
    expect(thin).toContain("summary: \n"); // empty summary, no "undefined"
    expect(thin).not.toContain("undefined");
  });
});

describe("trust round-trip + legacy derivation (#23)", () => {
  it("round-trips an explicit trust value through render → parse", () => {
    for (const t of ["trusted", "untrusted", "unknown"] as const) {
      const back = parseMemoryMarkdown(renderMemoryMarkdown(entry({ trust: t }), "body"));
      expect(back?.trust).toBe(t);
    }
  });

  it("legacy md with NO trust line: own-provenance + project-scoped → derived trusted", () => {
    // Hand-authored legacy frontmatter (pre-feature: no `trust:` line) with a sourceSession.
    const md = [
      "---", "id: semantic/p/legacy", "type: semantic", "scope: project:p", "project: p",
      "title: Legacy fact", "summary: s", "sourceSessions: [s1]", "---", "", "# Legacy fact", "body",
    ].join("\n");
    expect(parseMemoryMarkdown(md)?.trust).toBe("trusted");
  });

  it("legacy md with NO trust line and NO provenance → unknown", () => {
    const md = [
      "---", "id: semantic/p/orphan", "type: semantic", "scope: project:p", "project: p",
      "title: Orphan fact", "summary: s", "sourceSessions: []", "sourceCommits: []", "---", "", "# Orphan", "body",
    ].join("\n");
    expect(parseMemoryMarkdown(md)?.trust).toBe("unknown");
  });
});

describe("renderMemoryMarkdown — round-32 (SECURITY): frontmatter is LINE-ORIENTED", () => {
  // Defense in depth for the round-32 gate fix. YAML frontmatter here is emitted
  // as plain `key: value` LINES, so a CONTROL CHARACTER — above all a NEWLINE —
  // inside a scalar emits EXTRA lines that `parseMemoryMarkdown` reads back as
  // REAL FIELDS. A crafted id like `semantic/p\nstatus: active` therefore FORGES
  // frontmatter (e.g. silently un-archiving an entry). The archival rewrite gate
  // now rejects such a row before it can get here, but the renderer is the
  // serialization boundary EVERY caller shares — `applyMemoryItems`
  // (memory-write / memory-approve) derives the .md path from the id's SLUG and
  // never validated the whole id either — so it refuses on its own too.
  //
  // SCOPE: the IDENTIFIER-ish scalars only — id / type / scope / status /
  // project. Those are schema-constrained (an id is `<type>/<project>/<slug>`, a
  // status is one of four literals, a project is a single path segment), so a
  // control character in them is always corruption. `title` / `summary` are free
  // prose and are deliberately NOT touched: refusing or rewriting them would
  // change behavior for legitimate authored content.
  const IDENT_FIELDS = ["id", "type", "scope", "status", "project"] as const;

  it("refuses a NEWLINE in any identifier field instead of forging a frontmatter line", () => {
    for (const field of IDENT_FIELDS) {
      const poisoned = entry({ [field]: `${String(entry()[field])}\nforged: value` } as Partial<MemoryEntry>);
      expect(() => renderMemoryMarkdown(poisoned, "body")).toThrow(/control character|refusing/i);
    }
  });

  it("refuses CR / NUL / other control characters too (character-class rule, not just \\n)", () => {
    for (const ch of ["\r", "\u0000", "\u0007", "\u001f", "\u007f"]) {
      expect(() => renderMemoryMarkdown(entry({ id: `semantic/p${ch}x/y` }), "body")).toThrow(/control character|refusing/i);
    }
  });

  it("the forged line never reaches the document — nothing is emitted at all", () => {
    const poisoned = entry({ id: "semantic/p\nstatus: active/safe" });
    let md: string | null = null;
    try { md = renderMemoryMarkdown(poisoned, "body"); } catch { md = null; }
    expect(md).toBeNull(); // refused outright — no document, so no forged key
  });

  it("legitimate entries — multi-line BODY, dotted segments, null project — still render (regression lock)", () => {
    const md = renderMemoryMarkdown(
      entry({ project: "my.proj-1", id: "semantic/my.proj-1/a.b-c" }),
      "line 1\nline 2\n\nline 3",
    );
    expect(md).toContain("id: semantic/my.proj-1/a.b-c");
    expect(md).toContain("project: my.proj-1");
    expect(md).toContain("line 1\nline 2");
    expect(parseMemoryMarkdown(md)?.id).toBe("semantic/my.proj-1/a.b-c");
    // a null project (global entries) still serializes as the YAML literal null
    expect(renderMemoryMarkdown(entry({ project: null }), "b")).toContain("project: null");
  });
});
