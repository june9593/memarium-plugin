import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadQaIndex, saveQaIndex, upsertQa, QA_INDEX_REL } from "../../src/qa/index-store.js";
import { emptyQaIndex, type QaEntry } from "../../src/qa/types.js";

function entry(id: string): QaEntry {
  return { id, scope: "global", project: null, question: "q", answerSummary: "a",
    kind: "operational", tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [],
    relatedEntities: [], path: `memory/qa/_global/${id}.md`, createdAt: "2026-06-11", updatedAt: "2026-06-11" };
}

describe("qa index-store", () => {
  let repo: string;
  beforeEach(() => { repo = mkdtempSync(join(tmpdir(), "qa-idx-")); });

  it("loadQaIndex returns empty when file absent", () => {
    expect(loadQaIndex(repo)).toEqual(emptyQaIndex());
  });

  it("save → load round-trips; upsert replaces by id", () => {
    const idx = emptyQaIndex();
    upsertQa(idx, entry("qa/_global/x"));
    upsertQa(idx, entry("qa/_global/x"));
    upsertQa(idx, entry("qa/_global/y"));
    saveQaIndex(repo, idx);
    const back = loadQaIndex(repo);
    expect(Object.keys(back.entries).sort()).toEqual(["qa/_global/x", "qa/_global/y"]);
    expect(readFileSync(join(repo, QA_INDEX_REL), "utf8").endsWith("\n")).toBe(true);
  });

  it("returns empty on version mismatch / corrupt json", () => {
    saveQaIndex(repo, { version: 2 as unknown as 1, entries: {} });
    expect(loadQaIndex(repo)).toEqual(emptyQaIndex());
  });
});
