import { describe, it, expect } from "vitest";
import { emptyQaIndex, qaKey, type QaEntry } from "../../src/qa/types.js";

function entry(over: Partial<QaEntry> = {}): QaEntry {
  return {
    id: "qa/edge-memvc/how-to-build-abc12345",
    scope: "project:edge-memvc",
    project: "edge-memvc",
    question: "How do I build the project?",
    answerSummary: "Run npm run build (clean rm -rf dist first).",
    kind: "operational",
    tags: ["build"],
    sources: ["chronicle:xyz"],
    sourceMemoryIds: ["procedural/edge-memvc/build"],
    sourceSessions: ["abc12345"],
    relatedEntities: ["entity/edge-memvc/build-script"],
    path: "memory/qa/edge-memvc/how-to-build-abc12345.md",
    createdAt: "2026-06-11",
    updatedAt: "2026-06-11",
    ...over,
  };
}

describe("qa types", () => {
  it("qaKey returns the id", () => {
    expect(qaKey(entry())).toBe("qa/edge-memvc/how-to-build-abc12345");
  });
  it("emptyQaIndex is version 1 with no entries", () => {
    expect(emptyQaIndex()).toEqual({ version: 1, entries: {} });
  });
});
