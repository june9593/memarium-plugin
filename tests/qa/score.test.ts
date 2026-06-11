import { describe, it, expect } from "vitest";
import { scoreQa } from "../../src/qa/score.js";
import type { QaEntry } from "../../src/qa/types.js";

function e(over: Partial<QaEntry>): QaEntry {
  return { id: over.id ?? "qa/p/x", scope: over.scope ?? "project:p", project: over.project ?? "p",
    question: over.question ?? "q", answerSummary: over.answerSummary ?? "a", kind: over.kind ?? "operational",
    tags: over.tags ?? [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
    path: "memory/qa/p/x.md", createdAt: "2026-06-11", updatedAt: over.updatedAt ?? "2026-06-11" };
}

describe("scoreQa", () => {
  const now = "2026-06-11";

  it("matches on question + answerSummary + tags overlap", () => {
    const hit = e({ id: "qa/p/build", question: "How do I build the project", answerSummary: "run npm build", tags: ["build"] });
    const miss = e({ id: "qa/p/test", question: "How do I test", answerSummary: "run vitest", tags: ["test"] });
    const out = scoreQa([hit, miss], { project: "p", text: "build", kind: null, now });
    expect(out[0].entry.id).toBe("qa/p/build");
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });

  it("excludes project-scoped entries from other projects when cwd project set", () => {
    const other = e({ id: "qa/q/x", scope: "project:q", project: "q" });
    const out = scoreQa([other], { project: "p", text: "", kind: null, now });
    expect(out).toHaveLength(0);
  });

  it("includes global/user scope regardless of project", () => {
    const g = e({ id: "qa/_global/g", scope: "global", project: null });
    const out = scoreQa([g], { project: "p", text: "", kind: null, now });
    expect(out).toHaveLength(1);
  });

  it("filters by kind when provided", () => {
    const a = e({ id: "qa/p/a", kind: "decision" });
    const b = e({ id: "qa/p/b", kind: "troubleshooting" });
    const out = scoreQa([a, b], { project: "p", text: "", kind: "decision", now });
    expect(out.map((x) => x.entry.id)).toEqual(["qa/p/a"]);
  });
});
