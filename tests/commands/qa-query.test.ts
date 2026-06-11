import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveQaIndex, upsertQa } from "../../src/qa/index-store.js";
import { emptyQaIndex, type QaEntry } from "../../src/qa/types.js";
import { qaQueryCmd } from "../../src/commands/qa-query.js";

let home: string, repo: string, out: string[];
function entry(over: Partial<QaEntry>): QaEntry {
  return { id: over.id ?? "qa/p/x", scope: over.scope ?? "project:p", project: over.project ?? "p",
    question: over.question ?? "q", answerSummary: over.answerSummary ?? "a", kind: over.kind ?? "operational",
    tags: over.tags ?? [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
    path: over.path ?? "memory/qa/p/x.md", createdAt: "2026-06-11", updatedAt: "2026-06-11" };
}
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "qa-query-"));
  repo = join(home, ".vibebook", "session-repo");
  mkdirSync(repo, { recursive: true });
  vi.stubEnv("HOME", home);
  out = [];
  vi.spyOn(process.stdout, "write").mockImplementation((s: string) => { out.push(String(s)); return true; });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

describe("qaQueryCmd", () => {
  it("emits ranked metadata (question/answerSummary/path), not the body", async () => {
    const idx = emptyQaIndex();
    upsertQa(idx, entry({ id: "qa/p/build", question: "How do I build", answerSummary: "npm build", tags: ["build"] }));
    saveQaIndex(repo, idx);
    await qaQueryCmd({ cwd: "/whatever/p", q: "build" });
    const payload = JSON.parse(out.join(""));
    expect(payload.qa[0].entry.id).toBe("qa/p/build");
    expect(payload.qa[0].entry.answerSummary).toBe("npm build");
    expect(payload.qa[0].entry.path).toBe("memory/qa/p/x.md");
    expect(payload.qa[0].entry).not.toHaveProperty("body");
  });
});
