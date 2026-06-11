import { describe, it, expect } from "vitest";
import { renderQaMarkdown } from "../../src/qa/render.js";
import type { QaEntry } from "../../src/qa/types.js";

function entry(over: Partial<QaEntry> = {}): QaEntry {
  return { id: "qa/edge-memvc/how-to-build-abc12345", scope: "project:edge-memvc",
    project: "edge-memvc", question: "How do I build the project?",
    answerSummary: "Run npm run build.", kind: "operational", tags: ["build"],
    sources: ["chronicle:xyz"], sourceMemoryIds: ["procedural/edge-memvc/build"],
    sourceSessions: ["abc12345"], relatedEntities: ["entity/edge-memvc/build-script"],
    path: "memory/qa/edge-memvc/how-to-build-abc12345.md",
    createdAt: "2026-06-11", updatedAt: "2026-06-11", ...over };
}

describe("renderQaMarkdown", () => {
  it("renders frontmatter + # question heading + verbatim body", () => {
    const md = renderQaMarkdown(entry(), "Full multi-line\nanswer body.");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("id: qa/edge-memvc/how-to-build-abc12345");
    expect(md).toContain("question: How do I build the project?");
    expect(md).toContain("answerSummary: Run npm run build.");
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
});
