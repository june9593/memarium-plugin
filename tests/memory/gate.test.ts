import { describe, it, expect } from "vitest";
import { isGated, isGatedChange, targetKey, deriveAction, canonicalMemoryPath } from "../../src/memory/gate.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function mk(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p",
    title: "t", summary: "s", path: "", status: "active", confidence: 0.5, importance: 1,
    createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("isGated", () => {
  it("true for core/procedural/pinned", () => {
    expect(isGated(mk({ type: "core" }))).toBe(true);
    expect(isGated(mk({ type: "procedural" }))).toBe(true);
    expect(isGated(mk({ status: "pinned" }))).toBe(true);
  });
  it("false for ordinary semantic/episodic/working/artifact", () => {
    expect(isGated(mk({ type: "semantic" }))).toBe(false);
    expect(isGated(mk({ type: "episodic" }))).toBe(false);
  });
  it("false for undefined/non-object", () => {
    expect(isGated(undefined)).toBe(false);
    expect(isGated(null)).toBe(false);
    expect(isGated("nope" as unknown as MemoryEntry)).toBe(false);
  });
});

describe("isGatedChange", () => {
  it("gates a directly-gated proposed entry", () => {
    expect(isGatedChange(mk({ id: "core/y", type: "core" }), {})).toBe(true);
  });
  it("gates an in-place edit of an existing gated id", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(isGatedChange(mk({ id: "core/y", type: "semantic" }), live)).toBe(true);
  });
  it("gates a non-gated entry that supersedes a gated id (bypass case)", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(isGatedChange(mk({ id: "semantic/p/z", supersedes: "core/y" }), live)).toBe(true);
  });
  it("ignores a non-string supersedes", () => {
    expect(isGatedChange(mk({ supersedes: 123 as unknown as string }), {})).toBe(false);
  });
  it("ignores an empty-string supersedes", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(isGatedChange(mk({ id: "semantic/p/z", supersedes: "" }), live)).toBe(false);
  });
  it("false for a pure non-gated change", () => {
    expect(isGatedChange(mk({ id: "semantic/p/z" }), {})).toBe(false);
  });
});

describe("targetKey", () => {
  it("= id when no supersedes", () => {
    expect(targetKey(mk({ id: "core/y", supersedes: null }))).toBe("core/y");
  });
  it("= supersedes target when present", () => {
    expect(targetKey(mk({ id: "semantic/p/z", supersedes: "core/y" }))).toBe("core/y");
  });
  it("= id when supersedes is non-string", () => {
    expect(targetKey(mk({ id: "core/y", supersedes: 5 as unknown as string }))).toBe("core/y");
  });
  it("= id when supersedes is an empty string", () => {
    expect(targetKey(mk({ id: "core/y", supersedes: "" }))).toBe("core/y");
  });
});

describe("deriveAction", () => {
  it("replace when supersedes resolves live", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(deriveAction(mk({ id: "core/z", supersedes: "core/y" }), live)).toBe("replace");
  });
  it("update when id exists live", () => {
    const live = { "core/y": mk({ id: "core/y", type: "core" }) };
    expect(deriveAction(mk({ id: "core/y" }), live)).toBe("update");
  });
  it("create otherwise", () => {
    expect(deriveAction(mk({ id: "core/new" }), {})).toBe("create");
  });
});

describe("canonicalMemoryPath", () => {
  it("derives from type/project/id leaf", () => {
    expect(canonicalMemoryPath(mk({ id: "core/yue-workflow", type: "core", project: null })))
      .toBe("memory/core/_global/yue-workflow.md");
    expect(canonicalMemoryPath(mk({ id: "semantic/edge-memvc/spool", type: "semantic", project: "edge-memvc" })))
      .toBe("memory/semantic/edge-memvc/spool.md");
  });
  it("rejects an invalid type (closes the type-traversal bypass)", () => {
    expect(() => canonicalMemoryPath(mk({ type: "semantic/../core" as unknown as MemoryEntry["type"] })))
      .toThrow(/invalid type/i);
  });
  it("rejects unsafe project / slug segments", () => {
    expect(() => canonicalMemoryPath(mk({ project: "../escape" }))).toThrow(/unsafe project/i);
    expect(() => canonicalMemoryPath(mk({ id: "semantic/.." }))).toThrow(/unsafe slug/i);
  });
});
