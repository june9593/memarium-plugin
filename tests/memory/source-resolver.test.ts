import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergeIndexById, resolveMemoryView } from "../../src/memory/source-resolver.js";
import { saveMemoryIndex } from "../../src/memory/index-store.js";
import { emptyMemoryIndex, type MemoryEntry, type MemoryIndex } from "../../src/memory/types.js";

function mem(over: Partial<MemoryEntry> & { id: string }): MemoryEntry {
  return {
    type: "semantic", scope: "project:p", project: "p",
    title: over.id, summary: "s", path: `memory/semantic/p/${over.id.split("/").pop()}.md`,
    status: "active", confidence: 0.9, importance: 3,
    createdAt: "2026-06-01", updatedAt: "2026-06-01", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
    entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  } as MemoryEntry;
}
function idx(...entries: MemoryEntry[]): MemoryIndex {
  const i = emptyMemoryIndex();
  for (const e of entries) i.entries[e.id] = e;
  return i;
}

describe("mergeIndexById", () => {
  it("unions local-only and overlay-only entries, tagging source", () => {
    const r = mergeIndexById(
      { "semantic/p/a": mem({ id: "semantic/p/a" }) },
      { "semantic/p/b": mem({ id: "semantic/p/b" }) },
    );
    expect(Object.keys(r.entries).sort()).toEqual(["semantic/p/a", "semantic/p/b"]);
    expect(r.sources["semantic/p/a"]).toBe("local");
    expect(r.sources["semantic/p/b"]).toBe("overlay");
  });

  it("same id: latest updatedAt wins", () => {
    const local = { "x": mem({ id: "x", updatedAt: "2026-06-01", summary: "old-local" }) };
    const overlay = { "x": mem({ id: "x", updatedAt: "2026-06-10", summary: "new-overlay" }) };
    const r = mergeIndexById(local, overlay);
    expect(r.entries["x"].summary).toBe("new-overlay");
    expect(r.sources["x"]).toBe("overlay");
  });

  it("same id, EQUAL updatedAt: local wins (own-device authority, NOT CI parity)", () => {
    const local = { "x": mem({ id: "x", updatedAt: "2026-06-05", summary: "local" }) };
    const overlay = { "x": mem({ id: "x", updatedAt: "2026-06-05", summary: "overlay" }) };
    const r = mergeIndexById(local, overlay);
    expect(r.entries["x"].summary).toBe("local");
    expect(r.sources["x"]).toBe("local");
  });

  it("same id, local strictly newer: local wins", () => {
    const local = { "x": mem({ id: "x", updatedAt: "2026-06-10", summary: "local-new" }) };
    const overlay = { "x": mem({ id: "x", updatedAt: "2026-06-01", summary: "overlay-old" }) };
    expect(mergeIndexById(local, overlay).entries["x"].summary).toBe("local-new");
  });

  // Round-31: the winner is picked CHRONOLOGICALLY (shared `epochMs`), not by
  // comparing the raw strings. A raw compare is not chronological for valid mixed
  // ISO forms, so the read view could hand consumers the OLDER copy — and worse,
  // disagree with the write guard (`isOverlayConflict`), which orders
  // chronologically since round-30.
  it("mixed ISO forms: overlay chronologically NEWER but lexically SMALLER wins", () => {
    // overlay 2026-05-05T23:00:00-10:00 === 2026-05-06T09:00Z (NEWER)
    // local   2026-05-06T01:00:00Z      === 2026-05-06T01:00Z (older)
    // ...yet lexically "2026-05-06T01:00:00Z" > "2026-05-05T23:00:00-10:00".
    const local = { "x": mem({ id: "x", updatedAt: "2026-05-06T01:00:00Z", summary: "local-older" }) };
    const overlay = { "x": mem({ id: "x", updatedAt: "2026-05-05T23:00:00-10:00", summary: "overlay-newer" }) };
    const r = mergeIndexById(local, overlay);
    expect(r.entries["x"].summary).toBe("overlay-newer");
    expect(r.sources["x"]).toBe("overlay");
  });

  it("mixed ISO forms: overlay chronologically OLDER but lexically LARGER loses", () => {
    // overlay 2026-05-06T01:00:00+14:00 === 2026-05-05T11:00Z (older)
    // local   2026-05-06                === 2026-05-06T00:00Z (NEWER)
    // ...yet lexically "2026-05-06" < "2026-05-06T01:00:00+14:00" (prefix).
    const local = { "x": mem({ id: "x", updatedAt: "2026-05-06", summary: "local-newer" }) };
    const overlay = { "x": mem({ id: "x", updatedAt: "2026-05-06T01:00:00+14:00", summary: "overlay-older" }) };
    const r = mergeIndexById(local, overlay);
    expect(r.entries["x"].summary).toBe("local-newer");
    expect(r.sources["x"]).toBe("local");
  });

  it("unreadable OVERLAY stamp never beats a valid local one", () => {
    for (const bad of ["not-a-date", "", undefined as unknown as string]) {
      const local = { "x": mem({ id: "x", updatedAt: "2026-06-01", summary: "local" }) };
      const overlay = { "x": mem({ id: "x", updatedAt: bad, summary: "overlay-corrupt" }) };
      const r = mergeIndexById(local, overlay);
      expect(r.entries["x"].summary).toBe("local");
      expect(r.sources["x"]).toBe("local");
    }
  });

  it("unreadable LOCAL stamp never beats a valid overlay one", () => {
    for (const bad of ["not-a-date", "", undefined as unknown as string]) {
      const local = { "x": mem({ id: "x", updatedAt: bad, summary: "local-corrupt" }) };
      const overlay = { "x": mem({ id: "x", updatedAt: "2026-06-01", summary: "overlay" }) };
      const r = mergeIndexById(local, overlay);
      expect(r.entries["x"].summary).toBe("overlay");
      expect(r.sources["x"]).toBe("overlay");
    }
  });

  it("BOTH stamps unreadable: falls back to the local-wins tie", () => {
    const local = { "x": mem({ id: "x", updatedAt: "garbage", summary: "local" }) };
    const overlay = { "x": mem({ id: "x", updatedAt: "also-garbage", summary: "overlay" }) };
    const r = mergeIndexById(local, overlay);
    expect(r.entries["x"].summary).toBe("local");
    expect(r.sources["x"]).toBe("local");
  });

  it("equal instant expressed in DIFFERENT zones is a tie → local wins", () => {
    // 2026-06-05T12:00:00Z === 2026-06-05T14:00:00+02:00 (same instant)
    const local = { "x": mem({ id: "x", updatedAt: "2026-06-05T12:00:00Z", summary: "local" }) };
    const overlay = { "x": mem({ id: "x", updatedAt: "2026-06-05T14:00:00+02:00", summary: "overlay" }) };
    const r = mergeIndexById(local, overlay);
    expect(r.entries["x"].summary).toBe("local");
    expect(r.sources["x"]).toBe("local");
  });

  it("keeps superseded entries (does NOT pre-filter status)", () => {
    const local = { "x": mem({ id: "x", status: "superseded", updatedAt: "2026-06-09" }) };
    const overlay = {};
    const r = mergeIndexById(local, overlay);
    expect(r.entries["x"].status).toBe("superseded");
  });
});

describe("resolveMemoryView", () => {
  let home: string, repo: string, overlay: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-view-"));
    vi.stubEnv("HOME", home);
    repo = join(home, "session-repo");
    overlay = join(home, "aggregated");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("overlay absent → local-only, overlayPresent false", () => {
    saveMemoryIndex(repo, idx(mem({ id: "core/own" })));
    const v = resolveMemoryView(repo, overlay); // overlay dir has no index file
    expect(v.overlayPresent).toBe(false);
    expect(Object.keys(v.entries)).toEqual(["core/own"]);
    expect(v.roots.overlay).toBeNull();
  });

  it("merges local + overlay; sibling-only entries become visible", () => {
    saveMemoryIndex(repo, idx(mem({ id: "core/own" })));
    mkdirSync(join(overlay, ".memarium"), { recursive: true });
    saveMemoryIndex(overlay, idx(mem({ id: "core/own" }), mem({ id: "semantic/p/sibling" })));
    const v = resolveMemoryView(repo, overlay);
    expect(v.overlayPresent).toBe(true);
    expect(Object.keys(v.entries).sort()).toEqual(["core/own", "semantic/p/sibling"]);
    expect(v.sources["core/own"]).toBe("local");        // own wins on tie
    expect(v.sources["semantic/p/sibling"]).toBe("overlay");
    expect(v.roots.overlay).toBe(overlay);
  });

  it("overlayRoot=null forces local-only", () => {
    saveMemoryIndex(repo, idx(mem({ id: "core/own" })));
    const v = resolveMemoryView(repo, null);
    expect(v.overlayPresent).toBe(false);
    expect(Object.keys(v.entries)).toEqual(["core/own"]);
  });

  it("corrupt overlay index degrades to local-only entries (no throw)", () => {
    saveMemoryIndex(repo, idx(mem({ id: "core/own" })));
    mkdirSync(join(overlay, ".memarium"), { recursive: true });
    writeFileSync(join(overlay, ".memarium", "index.memory.json"), "{ not json");
    const v = resolveMemoryView(repo, overlay);
    // file exists → overlayPresent true, but loadMemoryIndex returns empty on parse error
    expect(v.overlayPresent).toBe(true);
    expect(Object.keys(v.entries)).toEqual(["core/own"]);
  });
});
