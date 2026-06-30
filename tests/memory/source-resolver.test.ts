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
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
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
    mkdirSync(join(overlay, ".vibebook"), { recursive: true });
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
    mkdirSync(join(overlay, ".vibebook"), { recursive: true });
    writeFileSync(join(overlay, ".vibebook", "index.memory.json"), "{ not json");
    const v = resolveMemoryView(repo, overlay);
    // file exists → overlayPresent true, but loadMemoryIndex returns empty on parse error
    expect(v.overlayPresent).toBe(true);
    expect(Object.keys(v.entries)).toEqual(["core/own"]);
  });
});
