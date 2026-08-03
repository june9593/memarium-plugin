import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
import { renderEntityMarkdown } from "../../src/entity/render.js";
import { renderQaMarkdown } from "../../src/qa/render.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function entry(): MemoryEntry {
  return { id: "semantic/code-demo/spool", type: "semantic", scope: "project:code-demo",
    project: "code-demo", title: "Spool single md", summary: "since 0.6.0",
    path: "memory/semantic/code-demo/spool.md", status: "active", confidence: 0.9, importance: 4,
    createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
    sourceSessions: ["abc"], sourceCommits: [], sourceFiles: ["src/writer.ts"], supersedes: null,
    entities: ["spool", "writer"], originDevice: null, accessCount: 0, lastAccess: null };
}

describe("memoryIndexCmd (rebuild from md)", () => {
  let fakeHome: string, repo: string;
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memidx2-"));
    vi.stubEnv("HOME", fakeHome); vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
    const e = entry();
    const abs = join(repo, e.path);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, renderMemoryMarkdown(e, "Each session renders to one md."));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("rebuilds index from md frontmatter (round-trips renderer)", async () => {
    const { memoryIndexCmd } = await import("../../src/commands/memory-index.js");
    const report = await memoryIndexCmd();
    expect(report.indexed).toBe(1);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    const e = idx.entries["semantic/code-demo/spool"];
    expect(e.title).toBe("Spool single md");
    expect(e.importance).toBe(4);
    expect(e.entities).toEqual(["spool", "writer"]);
    expect(e.sourceFiles).toEqual(["src/writer.ts"]);
    expect(e.validTo).toBeNull();
  });
  it("skips + counts a legacy duplicate-key .md instead of crashing or indexing the forgery (round-35)", async () => {
    // The shape a pre-hardening `title` carrying "\nstatus: active" left behind:
    // a forged `status:` ABOVE the real one. The parser now refuses the whole
    // document, so the rebuild must degrade past it — the clean entry from
    // beforeEach still indexes, and the bad file is REPORTED, not silent.
    const bad = join(repo, "memory/semantic/code-demo/poisoned.md");
    writeFileSync(bad, [
      "---",
      "id: semantic/code-demo/poisoned", "type: semantic", "scope: project:code-demo",
      "project: code-demo", "title: x", "status: active",
      "summary: s", "status: archived",
      "---", "", "# x", "body", "",
    ].join("\n"));
    const { memoryIndexCmd } = await import("../../src/commands/memory-index.js");
    const report = await memoryIndexCmd();
    expect(report.indexed).toBe(1);
    expect(report.skipped).toBe(1);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["semantic/code-demo/spool"]).toBeTruthy();
    expect(idx.entries["semantic/code-demo/poisoned"]).toBeUndefined();
  });
});

describe("memoryIndexCmd — symlink guard (the heal step writes md)", () => {
  let home: string, repo: string;
  const trySymlink = (t: string, l: string) => { try { symlinkSync(t, l); return true; } catch { return false; } };
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-memidx-sym-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(repo, { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("refuses to index/heal through a symlinked memory/ leaf", async () => {
    const target = join(home, "outside-dir"); mkdirSync(target, { recursive: true });
    if (!trySymlink(target, join(repo, "memory"))) return; // symlinks unsupported here — skip
    const { memoryIndexCmd } = await import("../../src/commands/memory-index.js");
    await expect(memoryIndexCmd()).rejects.toThrow(/symlink/);
  });
});

/**
 * ROUND-37 (regression fix) — round 34 added the `skipped` counter for documents
 * `parseMemoryMarkdown` refuses, but the walk still descended into
 * `memory/entities/` and `memory/qa/`. Those DERIVED layers intentionally carry
 * no memory `type`/`id` frontmatter, so EVERY healthy entity and Q&A page was
 * counted as malformed — a false-positive storm that buries the one genuinely
 * corrupt file the counter exists to surface.
 */
describe("memoryIndexCmd — derived entity/qa pages are not memory documents (round-37)", () => {
  let fakeHome: string, repo: string;
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memidx37-"));
    vi.stubEnv("HOME", fakeHome); vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
    // two real memories
    for (const slug of ["spool", "writer"]) {
      const e = { ...entry(), id: `semantic/code-demo/${slug}`, path: `memory/semantic/code-demo/${slug}.md` };
      mkdirSync(join(repo, "memory/semantic/code-demo"), { recursive: true });
      writeFileSync(join(repo, e.path), renderMemoryMarkdown(e, "body"));
    }
    // …plus HEALTHY derived pages, exactly as entity-write / qa-write render them
    mkdirSync(join(repo, "memory/entities/_global"), { recursive: true });
    mkdirSync(join(repo, "memory/qa/_global"), { recursive: true });
    mkdirSync(join(repo, "memory/_primer"), { recursive: true });
    writeFileSync(join(repo, "memory/entities/_global/widget.md"), renderEntityMarkdown({
      id: "entity/_global/widget", kind: "tool", scope: "global", project: null, title: "Widget",
      aliases: [], sourceMemoryIds: [], sourceSessions: [], sourceFiles: [], relatedEntities: [],
      path: "", createdAt: "2026-07-01", updatedAt: "2026-07-01",
    }, "an entity page"));
    writeFileSync(join(repo, "memory/qa/_global/how-to-build.md"), renderQaMarkdown({
      id: "qa/_global/how-to-build", scope: "global", project: null, question: "How do I build?",
      answerSummary: "npm run build", kind: "operational", tags: [], sources: [],
      sourceMemoryIds: [], sourceSessions: [], relatedEntities: [], path: "",
      createdAt: "2026-07-01", updatedAt: "2026-07-01",
    }, "a qa page"));
    writeFileSync(join(repo, "memory/_primer/code-demo.md"), "# primer\n\nnot a memory\n");
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("reports skipped: 0 and still indexes every real memory", async () => {
    const { memoryIndexCmd } = await import("../../src/commands/memory-index.js");
    const report = await memoryIndexCmd();
    expect(report.skipped).toBe(0);   // pre-fix: 2 (the healthy entity + qa pages)
    expect(report.indexed).toBe(2);   // both real memories still indexed
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(Object.keys(idx.entries).sort()).toEqual([
      "semantic/code-demo/spool", "semantic/code-demo/writer",
    ]);
  });

  it("a genuinely corrupt MEMORY document is still counted (the counter keeps its job)", async () => {
    writeFileSync(join(repo, "memory/semantic/code-demo/broken.md"), "no frontmatter here\n");
    const { memoryIndexCmd } = await import("../../src/commands/memory-index.js");
    const report = await memoryIndexCmd();
    expect(report.skipped).toBe(1);
    expect(report.indexed).toBe(2);
  });
});
