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
  repo = join(home, ".memarium", "session-repo");
  mkdirSync(repo, { recursive: true });
  vi.stubEnv("HOME", home);
  out = [];
  vi.spyOn(process.stdout, "write").mockImplementation((s: string) => { out.push(String(s)); return true; });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

describe("qaQueryCmd", () => {
  it("emits ranked metadata (question/answerSummary/path), not the body", async () => {
    const idx = emptyQaIndex();
    upsertQa(idx, entry({ id: "qa/p/build", question: "How do I build", answerSummary: "npm build",
      tags: ["build"], path: "memory/qa/p/build.md" }));
    saveQaIndex(repo, idx);
    await qaQueryCmd({ cwd: "/whatever/p", q: "build" });
    const payload = JSON.parse(out.join(""));
    expect(payload.qa[0].entry.id).toBe("qa/p/build");
    expect(payload.qa[0].entry.answerSummary).toBe("npm build");
    expect(payload.qa[0].entry.path).toBe("memory/qa/p/build.md");
    expect(payload.qa[0].entry).not.toHaveProperty("body");
    // Compact projection must not include heavy fields
    expect(payload.qa[0].entry).not.toHaveProperty("sources");
    expect(payload.qa[0].entry).not.toHaveProperty("sourceMemoryIds");
    expect(payload.qa[0].entry).not.toHaveProperty("tags");
    expect(payload.qa[0].entry).not.toHaveProperty("sourceSessions");
    expect(payload.qa[0].entry).not.toHaveProperty("relatedEntities");
    expect(payload.qa[0].entry).not.toHaveProperty("createdAt");
    expect(payload.qa[0].entry).not.toHaveProperty("updatedAt");
  });

  it("kind filter: returns only entries matching requested kind", async () => {
    const idx = emptyQaIndex();
    upsertQa(idx, entry({ id: "qa/p/decided", kind: "decision", question: "Which DB",
      answerSummary: "postgres", path: "memory/qa/p/decided.md" }));
    upsertQa(idx, entry({ id: "qa/p/broken", kind: "troubleshooting", question: "Why crash",
      answerSummary: "oom", path: "memory/qa/p/broken.md" }));
    saveQaIndex(repo, idx);
    await qaQueryCmd({ cwd: "/whatever/p", kind: "decision" });
    const payload = JSON.parse(out.join(""));
    expect(payload.qa).toHaveLength(1);
    expect(payload.qa[0].entry.id).toBe("qa/p/decided");
    expect(payload.qa[0].entry.kind).toBe("decision");
  });

  it("no index file: does not throw and emits empty qa array", async () => {
    // repo exists but no index.qa.json was ever written
    await expect(qaQueryCmd({ cwd: "/whatever/p" })).resolves.toBeUndefined();
    const payload = JSON.parse(out.join(""));
    expect(Array.isArray(payload.qa)).toBe(true);
    expect(payload.qa).toHaveLength(0);
  });
});
