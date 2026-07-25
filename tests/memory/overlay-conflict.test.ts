import { describe, it, expect } from "vitest";
import { sameMemoryContent, isOverlayConflict } from "../../src/memory/overlay-conflict.js";
import type { MemoryEntry } from "../../src/memory/types.js";

/** A fully-formed active memory; override just the fields under test. */
const entry = (over: Partial<MemoryEntry> = {}): MemoryEntry => ({
  id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p",
  title: "T", summary: "s", path: "memory/semantic/p/x.md", status: "active",
  confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-05-05",
  validFrom: null, validTo: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
  supersedes: null, entities: [], trust: "trusted", originDevice: null,
  accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null, ...over,
});

describe("sameMemoryContent — archival lifecycle fields count as divergence", () => {
  it("two archived copies differing ONLY in archivedReason are NOT equivalent (divergent)", () => {
    // local archived by the `expired` rule, overlay by `superseded-cleanup`:
    // same status ("archived"), same updatedAt — the ONLY difference is the
    // lifecycle reason, which unarchive reads to restore active-vs-superseded.
    const a = entry({ status: "archived", archivedAt: "2026-05-05", archivedReason: "expired" });
    const b = entry({ status: "archived", archivedAt: "2026-05-05", archivedReason: "superseded-cleanup" });
    expect(sameMemoryContent(a, b)).toBe(false);
  });

  it("two archived copies differing ONLY in archivedAt are NOT equivalent (divergent)", () => {
    const a = entry({ status: "archived", archivedReason: "expired", archivedAt: "2026-05-05" });
    const b = entry({ status: "archived", archivedReason: "expired", archivedAt: "2026-06-06" });
    expect(sameMemoryContent(a, b)).toBe(false);
  });

  it("identical archival fields stay equivalent (no false divergence)", () => {
    const a = entry({ status: "archived", archivedReason: "expired", archivedAt: "2026-05-05" });
    const b = entry({ status: "archived", archivedReason: "expired", archivedAt: "2026-05-05" });
    expect(sameMemoryContent(a, b)).toBe(true);
  });

  it("two active copies (archival fields both null) stay equivalent", () => {
    expect(sameMemoryContent(entry(), entry())).toBe(true);
  });
});

describe("isOverlayConflict — equal-updatedAt archival divergence is a conflict", () => {
  it("equal updatedAt, differing archivedReason → conflict (would clobber the sibling's lifecycle state)", () => {
    // Metadata divergence short-circuits to a conflict BEFORE any body read, so
    // the (nonexistent) roots are never touched.
    const local = entry({ status: "archived", archivedAt: "2026-05-05", archivedReason: "expired" });
    const overlay = entry({ status: "archived", archivedAt: "2026-05-05", archivedReason: "superseded-cleanup" });
    expect(isOverlayConflict(local, overlay, { local: "/nonexistent", overlay: "/nonexistent" })).toBe(true);
  });
});
