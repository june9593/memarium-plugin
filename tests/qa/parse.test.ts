import { describe, it, expect } from "vitest";
import { renderQaMarkdown } from "../../src/qa/render.js";
import { parseQaMarkdown } from "../../src/qa/parse.js";
import type { QaEntry } from "../../src/qa/types.js";

function entry(over: Partial<QaEntry> = {}): QaEntry {
  return { id: "qa/_global/q-deadbeef", scope: "global", project: null,
    question: "How do I X?", answerSummary: "Do Y.", kind: "decision",
    tags: ["a", "b"], sources: [], sourceMemoryIds: ["m1"], sourceSessions: ["s1"],
    relatedEntities: ["entity/_global/e1"], path: "memory/qa/_global/q-deadbeef.md",
    createdAt: "2026-06-11", updatedAt: "2026-06-12", ...over };
}

describe("parseQaMarkdown", () => {
  it("is the inverse of renderQaMarkdown (frontmatter fields)", () => {
    const e = entry();
    const parsed = parseQaMarkdown(renderQaMarkdown(e, "body text"));
    expect(parsed).not.toBeNull();
    expect({ ...parsed!, path: e.path }).toEqual(e);
  });
  it("returns null when no frontmatter", () => {
    expect(parseQaMarkdown("# just a heading")).toBeNull();
  });
  it("parses legacy comma-array and empty arrays", () => {
    const md = renderQaMarkdown(entry({ tags: [] }), "b").replace(`tags: []`, `tags: [a, b]`);
    expect(parseQaMarkdown(md)!.tags).toEqual(["a", "b"]);
  });
});
