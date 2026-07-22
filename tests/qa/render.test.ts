import { describe, it, expect } from "vitest";
import { renderQaMarkdown } from "../../src/qa/render.js";
import { parseQaMarkdown } from "../../src/qa/parse.js";
import type { QaEntry } from "../../src/qa/types.js";

function entry(over: Partial<QaEntry> = {}): QaEntry {
  return { id: "qa/code-demo/how-to-build-abc12345", scope: "project:code-demo",
    project: "code-demo", question: "How do I build the project?",
    answerSummary: "Run npm run build.", kind: "operational", tags: ["build"],
    sources: ["chronicle:xyz"], sourceMemoryIds: ["procedural/code-demo/build"],
    sourceSessions: ["abc12345"], relatedEntities: ["entity/code-demo/build-script"],
    path: "memory/qa/code-demo/how-to-build-abc12345.md",
    createdAt: "2026-06-11", updatedAt: "2026-06-11", ...over };
}

describe("renderQaMarkdown", () => {
  it("renders frontmatter + # question heading + verbatim body", () => {
    const md = renderQaMarkdown(entry(), "Full multi-line\nanswer body.");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("id: qa/code-demo/how-to-build-abc12345");
    expect(md).toContain(`question: "How do I build the project?"`);
    expect(md).toContain(`answerSummary: "Run npm run build."`);
    expect(md).toContain("kind: operational");
    expect(md).toContain(`tags: ["build"]`);
    expect(md).toContain(`sources: ["chronicle:xyz"]`);
    expect(md).toContain("\n---\n\n# How do I build the project?\n");
    expect(md.trimEnd().endsWith("answer body.")).toBe(true);
  });
  it("renders project: null literally for global scope", () => {
    const md = renderQaMarkdown(entry({ scope: "global", project: null }), "b");
    expect(md).toContain("project: null");
  });
  it("emits JSON-quoted form for question containing # (YAML-significant)", () => {
    const e = entry({ question: "How do I set # comments?", answerSummary: "- run npm build" });
    const md = renderQaMarkdown(e, "body");
    expect(md).toContain(`question: "How do I set # comments?"`);
    expect(md).toContain(`answerSummary: "- run npm build"`);
  });
  it("round-trips question with # and answerSummary starting with - via parse", () => {
    const e = entry({ question: "How do I set # comments?", answerSummary: "- run npm build" });
    const parsed = parseQaMarkdown(renderQaMarkdown(e, "body"));
    expect(parsed).not.toBeNull();
    expect(parsed!.question).toBe("How do I set # comments?");
    expect(parsed!.answerSummary).toBe("- run npm build");
  });
  it("round-trips question containing a colon (JSON-quoted scalar)", () => {
    const e = entry({ question: "How do I configure X: the sequel?", answerSummary: "Use config: { key: val }" });
    const parsed = parseQaMarkdown(renderQaMarkdown(e, "body"));
    expect(parsed).not.toBeNull();
    expect(parsed!.question).toBe("How do I configure X: the sequel?");
    expect(parsed!.answerSummary).toBe("Use config: { key: val }");
  });
  it('round-trips project named "null" (string) — frontmatter must be quoted, not bare null', () => {
    const e = entry({ scope: "project:null", project: "null",
      id: "qa/null/q-deadbeef", path: "memory/qa/null/q-deadbeef.md" });
    const md = renderQaMarkdown(e, "body");
    // Must be quoted in the rendered frontmatter
    expect(md).toContain(`project: "null"`);
    expect(md).not.toMatch(/^project: null$/m);
    // Must parse back to the STRING "null", not null
    const parsed = parseQaMarkdown(md);
    expect(parsed).not.toBeNull();
    expect(parsed!.project).toBe("null");        // string, not null
    expect(parsed!.scope).toBe("project:null");
  });
  it("round-trips a genuinely-null project (global scope) — renders bare null, parses to null", () => {
    const e = entry({ scope: "global", project: null,
      id: "qa/_global/q-deadbeef", path: "memory/qa/_global/q-deadbeef.md" });
    const md = renderQaMarkdown(e, "body");
    expect(md).toContain("project: null");
    const parsed = parseQaMarkdown(md);
    expect(parsed).not.toBeNull();
    expect(parsed!.project).toBeNull();          // actual null
  });
});
