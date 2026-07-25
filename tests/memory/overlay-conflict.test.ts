import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("two copies differing ONLY in createdAt are NOT equivalent (divergent)", () => {
    // createdAt is substantive lifecycle metadata, not mergeable provenance:
    // two equal-updatedAt copies born at different times are different records,
    // and treating them as equivalent lets archival restamp the local copy and
    // overwrite the sibling's value on the next merge.
    const a = entry({ createdAt: "2026-01-01" });
    const b = entry({ createdAt: "2026-02-02" });
    expect(sameMemoryContent(a, b)).toBe(false);
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

  it("equal updatedAt, differing createdAt → conflict (skipped rather than restamped)", () => {
    // Discriminating fixture: BOTH trees hold a readable .md with an IDENTICAL
    // body, so the body check alone would say "not a conflict". The only thing
    // that can flip this to `true` is `createdAt` being compared as substantive
    // metadata — proving the guard, not an unreadable-body fallback.
    const root = mkdtempSync(join(tmpdir(), "vbp-ovl-created-"));
    try {
      const local = entry({ createdAt: "2026-01-01" });
      const overlay = entry({ createdAt: "2026-02-02" });
      const body = "# T\n\nSame body on both devices.\n";
      for (const tree of ["local", "overlay"]) {
        const p = join(root, tree, "memory/semantic/p");
        mkdirSync(p, { recursive: true });
        writeFileSync(join(p, "x.md"), `---\nid: semantic/p/x\n---\n\n${body}`);
      }
      const roots = { local: join(root, "local"), overlay: join(root, "overlay") };
      // control: identical createdAt + identical body → NOT a conflict
      expect(isOverlayConflict(entry(), entry(), roots)).toBe(false);
      // createdAt is the ONLY difference → conflict
      expect(isOverlayConflict(local, overlay, roots)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
