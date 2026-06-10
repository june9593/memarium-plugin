import { describe, it, expect } from "vitest";
import { renderEntityMarkdown } from "../../src/entity/render.js";
import { parseEntityMarkdown } from "../../src/entity/parse.js";
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
    updatedAt: "2026-06-10",
    ...over,
  };
}

describe("parseEntityMarkdown", () => {
  it("round-trips all fields through render → parse", () => {
    const orig = page();
    const md = renderEntityMarkdown(orig, "Some body text.");
    const parsed = parseEntityMarkdown(md);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(parsed.id).toBe(orig.id);
    expect(parsed.kind).toBe(orig.kind);
    expect(parsed.scope).toBe(orig.scope);
    expect(parsed.project).toBe(orig.project);
    expect(parsed.title).toBe(orig.title);
    expect(parsed.aliases).toEqual(orig.aliases);
    expect(parsed.sourceMemoryIds).toEqual(orig.sourceMemoryIds);
    expect(parsed.sourceSessions).toEqual(orig.sourceSessions);
    expect(parsed.sourceFiles).toEqual(orig.sourceFiles);
    expect(parsed.relatedEntities).toEqual(orig.relatedEntities);
    expect(parsed.createdAt).toBe(orig.createdAt);
    expect(parsed.updatedAt).toBe(orig.updatedAt);
    // path is left "" by parser (filled by caller)
    expect(parsed.path).toBe("");
  });

  it("parses null project correctly", () => {
    const orig = page({ project: null, scope: "global" });
    const parsed = parseEntityMarkdown(renderEntityMarkdown(orig, "body"));
    expect(parsed?.project).toBeNull();
  });

  it("parses empty arrays correctly", () => {
    const orig = page({ aliases: [], relatedEntities: [], sourceMemoryIds: [] });
    const parsed = parseEntityMarkdown(renderEntityMarkdown(orig, "body"));
    expect(parsed?.aliases).toEqual([]);
    expect(parsed?.relatedEntities).toEqual([]);
    expect(parsed?.sourceMemoryIds).toEqual([]);
  });

  it("returns null when frontmatter is missing", () => {
    expect(parseEntityMarkdown("# No frontmatter here")).toBeNull();
  });

  it("returns null when id is missing", () => {
    const md = "---\nkind: symbol\n---\n\n# Title\n";
    expect(parseEntityMarkdown(md)).toBeNull();
  });

  it("returns null when kind is missing", () => {
    const md = "---\nid: entity/foo/bar\n---\n\n# Title\n";
    expect(parseEntityMarkdown(md)).toBeNull();
  });
});
