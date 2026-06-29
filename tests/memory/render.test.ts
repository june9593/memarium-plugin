import { describe, it, expect } from "vitest";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
import { parseMemoryMarkdown } from "../../src/memory/parse.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function entry(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "procedural/edge-memvc/add-source-adapter", type: "procedural",
    scope: "project:edge-memvc", project: "edge-memvc",
    title: "Add a source adapter", summary: "extend Tool union, register, write parser",
    path: "memory/procedural/edge-memvc/add-source-adapter.md",
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
    expect(md).toContain("id: procedural/edge-memvc/add-source-adapter");
    expect(md).toContain("type: procedural");
    expect(md).toContain("scope: project:edge-memvc");
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
