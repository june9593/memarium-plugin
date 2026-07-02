import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qaWriteCmd } from "../../src/commands/qa-write.js";
import { qaIndexCmd } from "../../src/commands/qa-index.js";
import { saveQaIndex, loadQaIndex } from "../../src/qa/index-store.js";
import { emptyQaIndex } from "../../src/qa/types.js";

/** Create a symlink; return false (so the test can early-return/skip) when the
 *  platform/permissions don't allow symlink creation (e.g. Windows w/o Dev Mode). */
function trySymlink(target: string, linkPath: string): boolean {
  try { symlinkSync(target, linkPath); return true; }
  catch { return false; }
}

let home: string, repo: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "qa-index-"));
  repo = join(home, ".memarium", "session-repo");
  mkdirSync(repo, { recursive: true });
  vi.stubEnv("HOME", home);
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

describe("qaIndexCmd", () => {
  it("rebuilds index.qa.json from memory/qa/ markdown", async () => {
    const inputPath = join(home, "in.json");
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

  it("cold-start: memory/qa/ absent → indexed: 0, no throw", async () => {
    // Fresh repo: no memory/qa/ dir, no index written
    const home2 = mkdtempSync(join(tmpdir(), "qa-index-empty-"));
    const repo2 = join(home2, ".memarium", "session-repo");
    mkdirSync(repo2, { recursive: true });
    vi.stubEnv("HOME", home2);
    try {
      const r = await qaIndexCmd();
      expect(r.indexed).toBe(0);
      // Index file must exist and be an empty-index shape
      const idx = loadQaIndex(repo2);
      expect(Object.keys(idx.entries)).toHaveLength(0);
    } finally {
      vi.stubEnv("HOME", home); // restore outer beforeEach HOME
      rmSync(home2, { recursive: true, force: true });
    }
  });

  it("refuses to index through a symlinked memory/qa (symlink guard)", async () => {
    const target = join(home, "outside-dir");
    mkdirSync(target, { recursive: true });
    mkdirSync(join(repo, "memory"), { recursive: true });
    if (!trySymlink(target, join(repo, "memory", "qa"))) return; // symlinks unsupported here — skip
    await expect(qaIndexCmd()).rejects.toThrow(/symlink/);
  });

  it("refuses to index when memory/ ancestor is a symlink (symlink guard)", async () => {
    const evil = join(home, "evil-ancestor"); mkdirSync(evil, { recursive: true });
    if (!trySymlink(evil, join(repo, "memory"))) return; // symlinks unsupported here — skip
    await expect(qaIndexCmd()).rejects.toThrow(/symlink/);
  });
});
