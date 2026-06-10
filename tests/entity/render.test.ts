import { describe, it, expect } from "vitest";
import { renderEntityMarkdown } from "../../src/entity/render.js";
import type { EntityPage } from "../../src/entity/types.js";

function page(over: Partial<EntityPage> = {}): EntityPage {
  return {
    id: "entity/edge-memvc/source-adapter",
    kind: "symbol",
    scope: "project:edge-memvc",
    project: "edge-memvc",
    title: "SourceAdapter",
    aliases: ["source adapter", "adapter"],
    sourceMemoryIds: ["procedural/edge-memvc/add-source-adapter"],
    sourceSessions: ["abc12345"],
    sourceFiles: ["src/sources/base.ts"],
    relatedEntities: ["entity/edge-memvc/tool"],
    path: "memory/entities/edge-memvc/source-adapter.md",
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
    ...over,
  };
}

describe("renderEntityMarkdown", () => {
  it("renders YAML frontmatter + body", () => {
    const md = renderEntityMarkdown(page(), "The base interface for all source adapters.");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("id: entity/edge-memvc/source-adapter");
    expect(md).toContain("kind: symbol");
    expect(md).toContain("scope: project:edge-memvc");
    expect(md).toContain("project: edge-memvc");
    expect(md).toContain("title: SourceAdapter");
    expect(md).toContain("\n---\n\n# SourceAdapter\n");
    expect(md.trimEnd().endsWith("The base interface for all source adapters.")).toBe(true);
  });

  it("renders inline arrays with values as JSON", () => {
    const md = renderEntityMarkdown(page(), "body");
    expect(md).toContain(`aliases: ["source adapter","adapter"]`);
    expect(md).toContain(`sourceMemoryIds: ["procedural/edge-memvc/add-source-adapter"]`);
    expect(md).toContain(`sourceSessions: ["abc12345"]`);
    expect(md).toContain(`sourceFiles: ["src/sources/base.ts"]`);
    expect(md).toContain(`relatedEntities: ["entity/edge-memvc/tool"]`);
  });

  it("emits empty arrays as []", () => {
    const md = renderEntityMarkdown(page({ aliases: [], relatedEntities: [] }), "body");
    expect(md).toContain("aliases: []");
    expect(md).toContain("relatedEntities: []");
  });

  it("renders null project as 'null'", () => {
    const md = renderEntityMarkdown(page({ project: null, scope: "global" }), "body");
    expect(md).toContain("project: null");
  });

  it("frontmatter key order: id, kind, scope, project, title, aliases, sourceMemoryIds, sourceSessions, sourceFiles, relatedEntities, createdAt, updatedAt", () => {
    const md = renderEntityMarkdown(page(), "body");
    const lines = md.split("\n");
    const idxOf = (key: string) => lines.findIndex((l) => l.startsWith(`${key}:`));
    expect(idxOf("id")).toBeLessThan(idxOf("kind"));
    expect(idxOf("kind")).toBeLessThan(idxOf("scope"));
    expect(idxOf("scope")).toBeLessThan(idxOf("project"));
    expect(idxOf("project")).toBeLessThan(idxOf("title"));
    expect(idxOf("title")).toBeLessThan(idxOf("aliases"));
    expect(idxOf("aliases")).toBeLessThan(idxOf("sourceMemoryIds"));
    expect(idxOf("sourceMemoryIds")).toBeLessThan(idxOf("sourceSessions"));
    expect(idxOf("sourceSessions")).toBeLessThan(idxOf("sourceFiles"));
    expect(idxOf("sourceFiles")).toBeLessThan(idxOf("relatedEntities"));
    expect(idxOf("relatedEntities")).toBeLessThan(idxOf("createdAt"));
    expect(idxOf("createdAt")).toBeLessThan(idxOf("updatedAt"));
  });
});
