import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadMemoryIndex, saveMemoryIndex, upsertMemory, MEMORY_INDEX_REL,
} from "../../src/memory/index-store.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function entry(id: string, over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id, type: "semantic", scope: "project:edge-memvc", project: "edge-memvc",
    title: "t", summary: "s", path: `memory/semantic/edge-memvc/${id.split("/").pop()}.md`,
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
    upsertMemory(idx, entry("semantic/edge-memvc/spool-format"));
    saveMemoryIndex(repo, idx);
    expect(existsSync(join(repo, MEMORY_INDEX_REL))).toBe(true);
    const reloaded = loadMemoryIndex(repo);
    expect(Object.keys(reloaded.entries)).toEqual(["semantic/edge-memvc/spool-format"]);
    expect(reloaded.entries["semantic/edge-memvc/spool-format"].title).toBe("t");
  });

  it("upsert overwrites by id", () => {
    const idx = loadMemoryIndex(repo);
    upsertMemory(idx, entry("a", { title: "first" }));
    upsertMemory(idx, entry("a", { title: "second" }));
    expect(Object.keys(idx.entries)).toEqual(["a"]);
    expect(idx.entries["a"].title).toBe("second");
  });
});
