import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qaWriteCmd } from "../../src/commands/qa-write.js";
import { qaIndexCmd } from "../../src/commands/qa-index.js";
import { saveQaIndex, loadQaIndex } from "../../src/qa/index-store.js";
import { emptyQaIndex } from "../../src/qa/types.js";

let home: string, repo: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "qa-index-"));
  repo = join(home, ".vibebook", "session-repo");
  mkdirSync(repo, { recursive: true });
  vi.stubEnv("HOME", home);
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

describe("qaIndexCmd", () => {
  it("rebuilds index.qa.json from memory/qa/ markdown", async () => {
    const inputPath = join(home, "in.json");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(inputPath, JSON.stringify([{ entry: { scope: "project:p", project: "p",
      question: "How do I build?", answerSummary: "npm build", kind: "operational", tags: [],
      sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]));
    await qaWriteCmd({ inputPath });
    saveQaIndex(repo, emptyQaIndex());
    const r = await qaIndexCmd();
    expect(r.indexed).toBe(1);
    const idx = loadQaIndex(repo);
    const e = Object.values(idx.entries)[0];
    expect(e.question).toBe("How do I build?");
    expect(e.path.startsWith("memory/qa/p/")).toBe(true);
  });
});
