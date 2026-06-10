import { describe, it, expect } from "vitest";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
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
});
