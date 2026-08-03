import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadMemoryIndex, loadMemoryIndexStrict, saveMemoryIndex, upsertMemory, MEMORY_INDEX_REL,
} from "../../src/memory/index-store.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { MemoryEntry } from "../../src/memory/types.js";

function entry(id: string, over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id, type: "semantic", scope: "project:code-demo", project: "code-demo",
    title: "t", summary: "s", path: `memory/semantic/code-demo/${id.split("/").pop()}.md`,
    status: "active", confidence: 0.8, importance: 3,
    createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
    entities: [], originDevice: null, accessCount: 0, lastAccess: null, ...over,
  };
}

describe("memory index store", () => {
  let repo: string;
  beforeEach(() => { repo = mkdtempSync(join(tmpdir(), "vbp-memidx-")); });
  afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

  it("load returns empty index when file absent", () => {
    expect(loadMemoryIndex(repo)).toEqual({ version: 1, entries: {} });
  });

  it("upsert + save + load round-trips, keyed by id", () => {
    const idx = loadMemoryIndex(repo);
    upsertMemory(idx, entry("semantic/code-demo/spool-format"));
    saveMemoryIndex(repo, idx);
    expect(existsSync(join(repo, MEMORY_INDEX_REL))).toBe(true);
    const reloaded = loadMemoryIndex(repo);
    expect(Object.keys(reloaded.entries)).toEqual(["semantic/code-demo/spool-format"]);
    expect(reloaded.entries["semantic/code-demo/spool-format"].title).toBe("t");
  });

  it("upsert overwrites by id", () => {
    const idx = loadMemoryIndex(repo);
    upsertMemory(idx, entry("a", { title: "first" }));
    upsertMemory(idx, entry("a", { title: "second" }));
    expect(Object.keys(idx.entries)).toEqual(["a"]);
    expect(idx.entries["a"].title).toBe("second");
  });
});

describe("loadMemoryIndexStrict — absent vs corrupt (write-guard reads)", () => {
  // Read paths are happy collapsing "no index" and "broken index" into an empty
  // index. A write GUARD is not: a corrupt overlay index that reads as empty makes
  // every id look overlay-absent, so the cross-device clobber guard fails open.
  let repo: string;
  beforeEach(() => { repo = mkdtempSync(join(tmpdir(), "vbp-memidx-strict-")); });
  afterEach(() => { rmSync(repo, { recursive: true, force: true }); });

  const write = (raw: string) => {
    const p = join(repo, MEMORY_INDEX_REL);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, raw);
  };

  it("reports `absent` when there is no index file (the normal local-only case)", () => {
    expect(loadMemoryIndexStrict(repo)).toEqual({ kind: "absent" });
  });

  it("reports `ok` with the parsed index for a healthy v1 file", () => {
    const idx = loadMemoryIndex(repo);
    upsertMemory(idx, entry("semantic/p/a"));
    saveMemoryIndex(repo, idx);
    const loaded = loadMemoryIndexStrict(repo);
    expect(loaded.kind).toBe("ok");
    if (loaded.kind === "ok") expect(Object.keys(loaded.index.entries)).toEqual(["semantic/p/a"]);
  });

  it("reports `corrupt` (with a reason) for unparseable JSON, a non-object root, a bad version, or a non-map `entries`", () => {
    for (const raw of [
      "{ not json",
      '"a string"',
      "[1,2,3]",
      JSON.stringify({ version: 2, entries: {} }),
      JSON.stringify({ version: 1 }),
      JSON.stringify({ version: 1, entries: ["a"] }),
      JSON.stringify({ version: 1, entries: 5 }),
    ]) {
      write(raw);
      const loaded = loadMemoryIndexStrict(repo);
      expect(loaded.kind, raw).toBe("corrupt");
      if (loaded.kind === "corrupt") expect(loaded.reason.length).toBeGreaterThan(0);
      // the LENIENT reader keeps degrading to an empty index for read paths
      expect(loadMemoryIndex(repo)).toEqual({ version: 1, entries: {} });
    }
  });
});
