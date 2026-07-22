import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderMemoryMarkdown } from "../../src/memory/render.js";
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
