import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { qaWriteCmd } from "../../src/commands/qa-write.js";
import { loadQaIndex } from "../../src/qa/index-store.js";

/** Create a symlink; return false (so the test can early-return/skip) when the
 *  platform/permissions don't allow symlink creation (e.g. Windows w/o Dev Mode). */
function trySymlink(target: string, linkPath: string): boolean {
  try { symlinkSync(target, linkPath); return true; }
  catch { return false; }
}

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
    expect(md).toContain(`question: "How do I build?"`);
    expect(md).toContain(`answerSummary: "Run npm build."`);
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

  it("refuses to write when a malicious scope escapes memory/qa (derived-path traversal via scope)", async () => {
    // scope is authoritative: project is derived from scope, so the escape vector
    // must be in scope. "project:../../etc" → derived project = "../../etc" → slug validation
    // fires first (contains "/") before the path-traversal guard is reached.
    const inputPath = writeInput([{ entry: { scope: "project:../../etc", project: "anything",
      question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/invalid project slug/);
  });

  it("rejects malformed project slug: empty (scope: 'project:')", async () => {
    const inputPath = writeInput([{ entry: { scope: "project:", project: "",
      question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/invalid project slug/);
  });

  it("rejects malformed project slug: path separator (scope: 'project:a/b')", async () => {
    const inputPath = writeInput([{ entry: { scope: "project:a/b", project: "a/b",
      question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/invalid project slug/);
  });

  it("rejects malformed project slug: dot-dot segment (scope: 'project:..')", async () => {
    const inputPath = writeInput([{ entry: { scope: "project:..", project: "..",
      question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/invalid project slug/);
  });

  it("accepts a normal project slug and writes under memory/qa/<project>/ (scope: 'project:edge-memvc')", async () => {
    const inputPath = writeInput([{ entry: {
      scope: "project:edge-memvc", project: "edge-memvc",
      question: "How do I build edge-memvc?", answerSummary: "npm run build", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    const r = await qaWriteCmd({ inputPath });
    expect(r.written).toBe(1);
    expect(r.paths[0].startsWith("memory/qa/edge-memvc/")).toBe(true);
  });

  it("overrides any agent-provided id/path with the value derived from the question", async () => {
    const inputPath = writeInput([{ entry: { id: "qa/p/STALE", path: "memory/qa/p/STALE.md",
      scope: "project:p", project: "p", question: "How do I build the project?", answerSummary: "npm build",
      kind: "operational", tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    const r = await qaWriteCmd({ inputPath });
    // path is the derived one, not the provided STALE one
    expect(r.paths[0]).not.toContain("STALE");
    expect(r.paths[0]).toMatch(/^memory\/qa\/p\/.+\.md$/);
    const idx = loadQaIndex(repo);
    const ids = Object.keys(idx.entries);
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toBe("qa/p/STALE");           // derived id, not the stale one
    expect(ids[0].startsWith("qa/p/")).toBe(true);
  });

  it("scope is authoritative: inconsistent scope/project → project derived from scope", async () => {
    // Case 1: scope=global, project="p" → derived project=null, id/path under _global
    const input1 = writeInput([{ entry: {
      scope: "global", project: "p",
      question: "What is the meaning of life?", answerSummary: "42", kind: "decision",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    const r1 = await qaWriteCmd({ inputPath: input1 });
    expect(r1.paths[0].startsWith("memory/qa/_global/")).toBe(true);
    const idx1 = loadQaIndex(repo);
    const id1 = Object.keys(idx1.entries)[0];
    expect(id1.startsWith("qa/_global/")).toBe(true);
    expect(idx1.entries[id1].project).toBeNull();

    // Case 2: scope="project:p", project="q" → derived project="p", id/path under p, not q
    const input2 = writeInput([{ entry: {
      scope: "project:p", project: "q",
      question: "How do I build?", answerSummary: "npm run build", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    const r2 = await qaWriteCmd({ inputPath: input2 });
    expect(r2.paths[0].startsWith("memory/qa/p/")).toBe(true);
    expect(r2.paths[0]).not.toContain("/q/");
    const idx2 = loadQaIndex(repo);
    const ids2 = Object.keys(idx2.entries);
    // Find the entry we just wrote (the one for "How do I build?")
    const id2 = ids2.find((id) => id.startsWith("qa/p/"))!;
    expect(id2).toBeDefined();
    expect(idx2.entries[id2].project).toBe("p");
    expect(idx2.entries[id2].project).not.toBe("q");
  });

  it("refuses to write through a symlinked qa dir (symlink guard)", async () => {
    const evil = join(home, "evil"); mkdirSync(evil, { recursive: true });
    mkdirSync(join(repo, "memory"), { recursive: true });
    if (!trySymlink(evil, join(repo, "memory", "qa"))) return; // symlinks unsupported here — skip
    const inputPath = writeInput([{ entry: {
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/symlink guard/);
    expect(existsSync(join(evil, "p", "q-8e35c2cd.md"))).toBe(false);
  });

  it("refuses to write through a broken symlink on qa dir (symlink guard)", async () => {
    const nonExistent = join(home, "no-such-target");
    mkdirSync(join(repo, "memory"), { recursive: true });
    if (!trySymlink(nonExistent, join(repo, "memory", "qa"))) return; // symlinks unsupported here — skip
    const inputPath = writeInput([{ entry: {
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/symlink guard/);
    expect(existsSync(nonExistent)).toBe(false);
  });

  it("refuses to write when memory/ ancestor is a symlink (symlink guard)", async () => {
    const evil = join(home, "evil-ancestor"); mkdirSync(evil, { recursive: true });
    if (!trySymlink(evil, join(repo, "memory"))) return; // symlinks unsupported here — skip
    const inputPath = writeInput([{ entry: {
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/symlink guard/);
    expect(existsSync(join(evil, "qa"))).toBe(false);
  });

  it("refuses to write through a symlinked scope subdir memory/qa/<scope> (symlink guard)", async () => {
    const external = join(home, "external-scope"); mkdirSync(external, { recursive: true });
    mkdirSync(join(repo, "memory", "qa"), { recursive: true });
    if (!trySymlink(external, join(repo, "memory", "qa", "p"))) return; // symlinks unsupported here — skip
    const inputPath = writeInput([{ entry: {
      scope: "project:p", project: "p", question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/symlink guard/);
    expect(existsSync(join(external, "q-8e35c2cd.md"))).toBe(false);
  });

  it("trims leading/trailing space from scope-derived project: 'project: p' → slug 'p'", async () => {
    const inputPath = writeInput([{ entry: {
      scope: "project: p", project: " p",
      question: "What is the build command?", answerSummary: "npm run build", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    const r = await qaWriteCmd({ inputPath });
    expect(r.written).toBe(1);
    // After trim, the project slug is "p", so the file lives under memory/qa/p/
    expect(r.paths[0].startsWith("memory/qa/p/")).toBe(true);
    // Must NOT be under the untrimmed " p" directory
    expect(r.paths[0]).not.toContain("/ p/");
    const idx = loadQaIndex(repo);
    const ids = Object.keys(idx.entries);
    expect(ids).toHaveLength(1);
    expect(idx.entries[ids[0]].project).toBe("p");
  });

  it("rejects internal-space project slug: 'project:a b' (space not trimmed away)", async () => {
    const inputPath = writeInput([{ entry: {
      scope: "project:a b", project: "a b",
      question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/invalid project slug/);
  });

  it("rejects Windows-invalid '*' in project slug: 'project:a*b'", async () => {
    const inputPath = writeInput([{ entry: {
      scope: "project:a*b", project: "a*b",
      question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/invalid project slug/);
  });

  it("rejects colon in project slug: 'project:a:b'", async () => {
    const inputPath = writeInput([{ entry: {
      scope: "project:a:b", project: "a:b",
      question: "q", answerSummary: "a", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "b" }]);
    await expect(qaWriteCmd({ inputPath })).rejects.toThrow(/invalid project slug/);
  });

  it("refuses to write when the target .md already exists as a symlink (leaf symlink guard)", async () => {
    const mkInput = () => writeInput([{ entry: { scope: "project:p", project: "p",
      question: "How do I build the project?", answerSummary: "npm build", kind: "operational",
      tags: [], sources: [], sourceMemoryIds: [], sourceSessions: [], relatedEntities: [],
      createdAt: "2026-06-11", updatedAt: "2026-06-11" }, body: "first" }]);
    // First write creates the real .md and tells us its derived path.
    const r1 = await qaWriteCmd({ inputPath: mkInput() });
    const abs = join(repo, r1.paths[0]);
    // Replace it with a symlink to an external target.
    const evil = join(home, "evil-target.md");
    rmSync(abs);
    if (!trySymlink(evil, abs)) return; // symlinks unsupported → skip
    // Second write (upsert, same question → same derived path) must refuse.
    await expect(qaWriteCmd({ inputPath: mkInput() })).rejects.toThrow(/symlink guard/);
    expect(existsSync(evil)).toBe(false); // content was NOT written through the symlink
  });
});
