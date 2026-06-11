import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qaWriteCmd } from "../../src/commands/qa-write.js";
import { loadQaIndex } from "../../src/qa/index-store.js";

let home: string, repo: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "qa-write-home-"));
  repo = join(home, ".vibebook", "session-repo");
  mkdirSync(repo, { recursive: true });
  vi.stubEnv("HOME", home);
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

function writeInput(items: unknown): string {
  const p = join(home, "in.json");
  writeFileSync(p, JSON.stringify(items));
  return p;
}

describe("qaWriteCmd", () => {
  it("writes .md + index, derives id/path, normalizes single-line, body verbatim", async () => {
    const inputPath = writeInput([{
      entry: { scope: "project:p", project: "p", question: "How  do\nI build?",
        answerSummary: "Run\n npm build.", kind: "operational", tags: ["build"],
        sources: [], sourceMemoryIds: [], sourceSessions: ["s1"], relatedEntities: [],
        createdAt: "2026-06-11", updatedAt: "2026-06-11" },
      body: "Full answer\nwith multiple\nlines.",
    }]);
    const r = await qaWriteCmd({ inputPath });
    expect(r.written).toBe(1);
    const abs = join(repo, r.paths[0]);
    expect(r.paths[0].startsWith("memory/qa/p/")).toBe(true);
    const md = readFileSync(abs, "utf8");
    expect(md).toContain("question: How do I build?");
    expect(md).toContain("answerSummary: Run npm build.");
    expect(md).toContain("Full answer\nwith multiple\nlines.");
    const idx = loadQaIndex(repo);
    const ids = Object.keys(idx.entries);
    expect(ids).toHaveLength(1);
    expect(idx.entries[ids[0]].answerSummary).toBe("Run npm build.");
  });

  it("upserts: same question written twice → one entry", async () => {
    const mk = () => writeInput([{ entry: { scope: "project:p", project: "p",
      question: "How do I build?", answerSummary: "v", kind: "operational", tags: [],
      sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await qaWriteCmd({ inputPath: mk() });
    await qaWriteCmd({ inputPath: mk() });
    expect(Object.keys(loadQaIndex(repo).entries)).toHaveLength(1);
  });

  it("refuses to write outside memory/qa/ (path traversal)", async () => {
    const inputPath = writeInput([{ entry: { id: "qa/p/x", path: "../../escape.md",
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/outside memory\/qa/);
  });

  it("refuses to write through a symlinked qa dir (symlink guard)", async () => {
    const evil = join(home, "evil"); mkdirSync(evil, { recursive: true });
    mkdirSync(join(repo, "memory"), { recursive: true });
    symlinkSync(evil, join(repo, "memory", "qa"));
    const inputPath = writeInput([{ entry: { id: "qa/p/x", path: "memory/qa/p/x.md",
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/symlink guard/);
    expect(existsSync(join(evil, "p", "x.md"))).toBe(false);
  });

  it("refuses to write through a broken symlink on qa dir (symlink guard)", async () => {
    const nonExistent = join(home, "no-such-target");
    mkdirSync(join(repo, "memory"), { recursive: true });
    symlinkSync(nonExistent, join(repo, "memory", "qa"));
    const inputPath = writeInput([{ entry: { id: "qa/p/x", path: "memory/qa/p/x.md",
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/symlink guard/);
    expect(existsSync(nonExistent)).toBe(false);
  });

  it("refuses to write when memory/ ancestor is a symlink (symlink guard)", async () => {
    const evil = join(home, "evil-ancestor"); mkdirSync(evil, { recursive: true });
    symlinkSync(evil, join(repo, "memory"));
    const inputPath = writeInput([{ entry: { id: "qa/p/x", path: "memory/qa/p/x.md",
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/symlink guard/);
    expect(existsSync(join(evil, "qa"))).toBe(false);
  });
});
