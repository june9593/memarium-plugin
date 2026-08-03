import { describe, it, expect } from "vitest";
import { renderEntityMarkdown } from "../../src/entity/render.js";
import { parseEntityMarkdown } from "../../src/entity/parse.js";
import type { EntityPage } from "../../src/entity/types.js";

function page(over: Partial<EntityPage> = {}): EntityPage {
  return {
    id: "entity/code-demo/source-adapter",
    kind: "symbol",
    scope: "project:code-demo",
    project: "code-demo",
    title: "SourceAdapter",
    aliases: ["source adapter", "adapter"],
    sourceMemoryIds: ["procedural/code-demo/add-source-adapter"],
    sourceSessions: ["abc12345"],
    sourceFiles: ["src/sources/base.ts"],
    relatedEntities: ["entity/code-demo/tool"],
    path: "memory/entities/code-demo/source-adapter.md",
    createdAt: "2026-06-09",
    updatedAt: "2026-06-09",
    ...over,
  };
}

describe("renderEntityMarkdown", () => {
  it("renders YAML frontmatter + body", () => {
    const md = renderEntityMarkdown(page(), "The base interface for all source adapters.");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("id: entity/code-demo/source-adapter");
    expect(md).toContain("kind: symbol");
    expect(md).toContain("scope: project:code-demo");
    expect(md).toContain("project: code-demo");
    expect(md).toContain("title: SourceAdapter");
    expect(md).toContain("\n---\n\n# SourceAdapter\n");
    expect(md.trimEnd().endsWith("The base interface for all source adapters.")).toBe(true);
  });

  it("renders inline arrays with values as JSON", () => {
    const md = renderEntityMarkdown(page(), "body");
    expect(md).toContain(`aliases: ["source adapter","adapter"]`);
    expect(md).toContain(`sourceMemoryIds: ["procedural/code-demo/add-source-adapter"]`);
    expect(md).toContain(`sourceSessions: ["abc12345"]`);
    expect(md).toContain(`sourceFiles: ["src/sources/base.ts"]`);
    expect(md).toContain(`relatedEntities: ["entity/code-demo/tool"]`);
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

describe("renderEntityMarkdown — round-34 (SECURITY): no value can inject a line", () => {
  const fmLines = (md: string, key: string) =>
    md.match(/^---\n([\s\S]*?)\n---/)![1].split("\n").filter((l) => l.startsWith(`${key}:`));

  it("a NEWLINE in the free-text `title` cannot forge a second `id:` line", () => {
    const md = renderEntityMarkdown(page({ title: "X\nid: entity/other/forged" }), "body");
    expect(fmLines(md, "id")).toEqual(["id: entity/code-demo/source-adapter"]);
    expect(parseEntityMarkdown(md)?.id).toBe("entity/code-demo/source-adapter");
  });

  it("a NEWLINE in a raw scalar (`kind`, the dates) cannot forge a line either", () => {
    const md = renderEntityMarkdown(page({ kind: "symbol\nproject: other" as never, updatedAt: "2026-06-09\nscope: global" }), "body");
    expect(fmLines(md, "project")).toEqual(["project: code-demo"]);
    expect(fmLines(md, "scope")).toEqual(["scope: project:code-demo"]);
  });

  it("REJECTS a document with a duplicated key rather than picking an occurrence (round-35)", () => {
    // Position cannot distinguish forged from legitimate: the renderer emits keys
    // in a fixed order, so a payload in an EARLY field (here `id`) forges its line
    // ABOVE the real line of a LATER field (`kind`), and first-wins would keep the
    // FORGED one. Each key is emitted exactly once, so a duplicate is corruption
    // or injection either way — refuse the document.
    const forgedBeforeReal = [
      "---", "id: entity/code-demo/real", "kind: concept",
      "scope: project:code-demo", "kind: symbol", "project: code-demo", "title: t",
      "---", "", "# t", "body",
    ].join("\n");
    expect(parseEntityMarkdown(forgedBeforeReal)).toBeNull();

    const forgedAfterReal = [
      "---", "id: entity/code-demo/real", "kind: symbol", "scope: project:code-demo",
      "project: code-demo", "title: t", "id: entity/other/forged", "project: other",
      "---", "", "# t", "body",
    ].join("\n");
    expect(parseEntityMarkdown(forgedAfterReal)).toBeNull();
  });

  it("a normal, singly-keyed page still parses and round-trips byte-identically", () => {
    const md = renderEntityMarkdown(page(), "Regression lock.");
    const keys = md.match(/^---\n([\s\S]*?)\n---/)![1]
      .split("\n").map((l) => l.slice(0, l.indexOf(":")).trim());
    expect(new Set(keys).size).toBe(keys.length);
    const back = parseEntityMarkdown(md);
    expect(back).not.toBeNull();
    expect(renderEntityMarkdown({ ...back!, path: page().path }, "Regression lock.")).toBe(md);
  });

  it("PAIRING: a control character in a value produces NO duplicate key, so a NEW file never trips the rejection", () => {
    const md = renderEntityMarkdown(
      page({ title: "X\nid: entity/other/forged", aliases: ["a\nkind: concept"], updatedAt: "2026-06-09\nscope: global" }),
      "body",
    );
    const keys = md.match(/^---\n([\s\S]*?)\n---/)![1]
      .split("\n").map((l) => l.slice(0, l.indexOf(":")).trim()).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
    const back = parseEntityMarkdown(md);
    expect(back).not.toBeNull();
    expect(back!.id).toBe("entity/code-demo/source-adapter");
    expect(back!.kind).toBe("symbol");
    expect(back!.scope).toBe("project:code-demo");
  });

  it("a clean page is unchanged (no format drift)", () => {
    const md = renderEntityMarkdown(page(), "body");
    expect(md).toContain("id: entity/code-demo/source-adapter");
    expect(md).toContain("title: SourceAdapter");
    expect(md).toContain(`aliases: ["source adapter","adapter"]`);
    expect(md).toContain("\n---\n\n# SourceAdapter\n");
  });
});
