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

describe("sameMemoryContent — a differing `id` is DIVERGENCE (round-21)", () => {
  // Neither index loader checks that a row's MAP KEY agrees with the row's own
  // `id` (loadMemoryIndexStrict validates only the top-level `entries` map), so
  // the overlay row fetched under the LOCAL key can carry a DIFFERENT `id`.
  // Omitting `id` from the substantive comparison made two rows that name
  // different records read as "an already-synced copy" — and the cross-device
  // guard then waved through a write whose .md path is derived from `entry.id`,
  // i.e. against a record the comparison never looked at.
  it("two copies identical in every OTHER compared field but with different ids are NOT equivalent", () => {
    expect(sameMemoryContent(entry({ id: "semantic/p/x" }), entry({ id: "semantic/p/victim" }))).toBe(false);
  });

  it("…including the shape whose FINAL PATH SEGMENT (and canonical .md path) still matches", () => {
    // canonicalMemoryPath keys off {type, project, LAST segment of id}, so these
    // two DIFFERENT ids derive the SAME .md path — the body check cannot see the
    // difference either. Only comparing `id` catches it.
    expect(sameMemoryContent(entry({ id: "semantic/p/x" }), entry({ id: "semantic/q/x" }))).toBe(false);
  });

  it("equal ids stay equivalent (regression lock — no new false divergence)", () => {
    expect(sameMemoryContent(entry(), entry())).toBe(true);
    expect(sameMemoryContent(entry({ id: "procedural/p/y" }), entry({ id: "procedural/p/y" }))).toBe(true);
  });
});

describe("isOverlayConflict — an overlay row whose `id` disagrees is a CONFLICT (round-21)", () => {
  /** Write `<tree>/memory/semantic/p/<slug>.md` with a body identical in BOTH
   *  trees, for every slug asked for — so every body comparison the guard can
   *  reach answers "equivalent". The ONLY thing that can flip these cases to
   *  `true` is `id` being compared, not an unreadable-body fallback. */
  function withBodies(slugs: string[], fn: (roots: { local: string; overlay: string }) => void) {
    const root = mkdtempSync(join(tmpdir(), "vbp-ovl-r21-"));
    try {
      for (const tree of ["local", "overlay"]) {
        const p = join(root, tree, "memory/semantic/p");
        mkdirSync(p, { recursive: true });
        for (const slug of slugs) {
          writeFileSync(join(p, `${slug}.md`), `---\nid: semantic/p/${slug}\n---\n\n# T\n\nSame body on both devices.\n`);
        }
      }
      fn({ local: join(root, "local"), overlay: join(root, "overlay") });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("equal updatedAt + identical readable body, but the overlay row carries a DIFFERENT id → conflict", () => {
    // The overlay id's canonical .md EXISTS in the overlay tree with the very
    // same body, so pre-fix this compared as an equivalent synced copy and the
    // archival write went through against a record it never compared.
    withBodies(["x", "victim"], (roots) => {
      expect(isOverlayConflict(entry(), entry(), roots)).toBe(false);                      // control
      expect(isOverlayConflict(entry(), entry({ id: "semantic/p/victim" }), roots)).toBe(true);
    });
  });

  it("a differing id that derives the SAME canonical .md path is a conflict too (body check can't see it)", () => {
    // `semantic/p/x` vs `semantic/q/x`: same type/project/slug → both bodies
    // resolve to memory/semantic/p/x.md, one per tree, and match. Divergent
    // identity is invisible to every other comparison in the module.
    withBodies(["x"], (roots) => {
      expect(isOverlayConflict(entry(), entry(), roots)).toBe(false);                      // control
      expect(isOverlayConflict(entry(), entry({ id: "semantic/q/x" }), roots)).toBe(true);
    });
  });

  it("an overlay row with a missing / non-string id is a CONFLICT (uncomparable identity)", () => {
    withBodies(["x"], (roots) => {
      expect(isOverlayConflict(entry(), { ...entry(), id: undefined } as unknown, roots)).toBe(true);
      expect(isOverlayConflict(entry(), { ...entry(), id: 7 } as unknown, roots)).toBe(true);
    });
  });
});

describe("isOverlayConflict — fails CLOSED on an overlay row it cannot compare", () => {
  const roots = { local: "/nonexistent", overlay: "/nonexistent" };

  it("a genuinely ABSENT overlay row is NOT a conflict (the normal local-only path)", () => {
    // No sibling copy at all → local is authoritative → archival/unarchival proceeds.
    expect(isOverlayConflict(entry(), undefined, roots)).toBe(false);
    expect(isOverlayConflict(entry(), null, roots)).toBe(false);
  });

  it("a PRESENT but non-object overlay row is a CONFLICT (state could not be compared)", () => {
    // Round-16: this used to return false — "no conflict" — so archive/unarchive
    // would restamp the local copy even though the sibling's state was never
    // actually compared, permitting exactly the clobbering write the guard exists
    // to prevent. A row that EXISTS but is unusable must fail CLOSED.
    for (const bad of ["not-an-object", 42, true, ["a"], [] as unknown]) {
      expect(isOverlayConflict(entry(), bad, roots)).toBe(true);
    }
  });

  it("a present overlay row with a missing / non-string / empty updatedAt is a CONFLICT", () => {
    // A missing updatedAt used to compare as "" — i.e. strictly OLDER than local —
    // so the guard waved it through as "local wins" when in truth the two copies
    // were never comparable at all.
    expect(isOverlayConflict(entry(), { ...entry(), updatedAt: undefined }, roots)).toBe(true);
    expect(isOverlayConflict(entry(), { ...entry(), updatedAt: null }, roots)).toBe(true);
    expect(isOverlayConflict(entry(), { ...entry(), updatedAt: 20260505 }, roots)).toBe(true);
    expect(isOverlayConflict(entry(), { ...entry(), updatedAt: "" }, roots)).toBe(true);
  });

  it("a comparable, strictly-OLDER overlay row is still NOT a conflict (control)", () => {
    expect(isOverlayConflict(entry({ updatedAt: "2026-05-05" }), entry({ updatedAt: "2026-01-01" }), roots)).toBe(false);
  });
});

describe("isOverlayConflict — updatedAt is ordered CHRONOLOGICALLY, not lexically (round-30)", () => {
  const blindRoots = { local: "/nonexistent", overlay: "/nonexistent" };

  /** Both trees hold the row's canonical .md with an IDENTICAL body, so every
   *  comparison the TIE branch can reach answers "equivalent" — the fixture can
   *  never manufacture a conflict on its own. */
  function withBodies(fn: (roots: { local: string; overlay: string }) => void) {
    const root = mkdtempSync(join(tmpdir(), "vbp-ovl-r30-"));
    try {
      for (const tree of ["local", "overlay"]) {
        const p = join(root, tree, "memory/semantic/p");
        mkdirSync(p, { recursive: true });
        writeFileSync(join(p, "x.md"), `---\nid: semantic/p/x\n---\n\n# T\n\nSame body on both devices.\n`);
      }
      fn({ local: join(root, "local"), overlay: join(root, "overlay") });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("a mixed-form overlay that LEXICALLY sorts older is no longer waved through as 'older'", () => {
    // THE REVIEWER'S CASE. `2026-05-05T23:00:00-10:00` is 2026-05-06T09:00:00Z —
    // NINE HOURS NEWER than local `2026-05-06` (00:00:00Z) — yet the raw strings
    // sort the other way ("2026-05-05T…" < "2026-05-06"). The old code took that
    // lexical `<` as "strictly older, local authoritative" and returned false
    // WITHOUT COMPARING ANY STATE, permitting a write over a sibling copy it had
    // never looked at. Both are the SAME UTC calendar day, so the fixed guard
    // routes the pair to the TIE branch — where a divergent sibling is caught.
    const local = entry({ updatedAt: "2026-05-06" });
    const overlay = entry({ updatedAt: "2026-05-05T23:00:00-10:00", title: "sibling edited this title" });
    expect(isOverlayConflict(local, overlay, blindRoots)).toBe(true);
    // …and it is the DIVERGENCE that decides, not an unreadable-body fallback:
    // with real trees on disk the same divergent sibling still conflicts.
    withBodies((roots) => {
      expect(isOverlayConflict(local, overlay, roots)).toBe(true);
      // Control: the same mixed-form pair with a PROVABLY equivalent sibling
      // (identical metadata AND identical body) is safe to archive — there is
      // nothing to clobber. This is the round-7/8 same-day semantics, preserved.
      expect(isOverlayConflict(local, entry({ updatedAt: "2026-05-05T23:00:00-10:00" }), roots)).toBe(false);
    });
  });

  it("the mirror case: an overlay on an EARLIER UTC day is ordered as older (no false conflict)", () => {
    // `2026-05-06T01:00:00+14:00` is 2026-05-05T11:00:00Z — genuinely OLDER than
    // local `2026-05-06` — but sorts lexically GREATER, so the old code called it
    // a strictly-newer remote edit and blocked archival forever. Different UTC
    // calendar days → chronological order decides → older → local authoritative,
    // even though the sibling's metadata DIVERGES (no state check is needed).
    const local = entry({ updatedAt: "2026-05-06" });
    const overlay = entry({ updatedAt: "2026-05-06T01:00:00+14:00", title: "stale sibling title" });
    expect(isOverlayConflict(local, overlay, blindRoots)).toBe(false);
  });

  it("an overlay on a LATER UTC day is a conflict regardless of content (round-4, preserved)", () => {
    withBodies((roots) => {
      const local = entry({ updatedAt: "2026-05-06" });
      // Identical content + identical body, but a strictly later UTC day → the
      // newer remote edit still wins; ordering short-circuits before the diff.
      expect(isOverlayConflict(local, entry({ updatedAt: "2026-05-07" }), roots)).toBe(true);
      expect(isOverlayConflict(local, entry({ updatedAt: "2026-05-06T23:00:00-10:00" }), roots)).toBe(true); // = 05-07T09Z
    });
  });

  it("same UTC calendar day at DIFFERENT times stays the TIE branch (divergence decides)", () => {
    // Full precision must NOT turn a same-day pair into strictly newer/older:
    // memarium writes `updatedAt` day-granular, so a same-day pair is exactly the
    // "indistinguishable at the granularity we store" case rounds 7/8 route to the
    // substantive divergence check. Both directions are asserted.
    withBodies((roots) => {
      const local = entry({ updatedAt: "2026-05-06" });
      // equivalent synced copy → archivable
      expect(isOverlayConflict(local, entry({ updatedAt: "2026-05-06T10:00:00Z" }), roots)).toBe(false);
      // divergent same-day sibling edit → conflict
      expect(isOverlayConflict(local, entry({ updatedAt: "2026-05-06T10:00:00Z", summary: "sibling" }), roots)).toBe(true);
    });
  });

  it("an UNPARSEABLE updatedAt on EITHER side is a CONFLICT, never 'older' (fail-closed)", () => {
    withBodies((roots) => {
      // overlay unparseable: lexically "2026-05-06" < "not-a-date", so the old
      // code read the garbage row as strictly NEWER — right answer, wrong reason.
      expect(isOverlayConflict(entry({ updatedAt: "2026-05-06" }), entry({ updatedAt: "not-a-date" }), roots)).toBe(true);
      // LOCAL unparseable: the old code compared the overlay's valid date against
      // the garbage string and got `<` — "strictly older, local wins" — permitting
      // the write off a local stamp it could not read.
      expect(isOverlayConflict(entry({ updatedAt: "not-a-date" }), entry({ updatedAt: "2026-05-06" }), roots)).toBe(true);
      expect(isOverlayConflict(entry({ updatedAt: "garbage" }), entry({ updatedAt: "garbage" }), roots)).toBe(true);
      // a MISSING local updatedAt is uncomparable too (it used to coerce to "").
      expect(isOverlayConflict({ ...entry(), updatedAt: undefined } as unknown as MemoryEntry,
        entry({ updatedAt: "2026-05-06" }), roots)).toBe(true);
    });
  });

  it("plain equal `YYYY-MM-DD` pairs behave exactly as before (regression lock)", () => {
    withBodies((roots) => {
      // equal day + equivalent copy → archivable; equal day + divergent → conflict.
      expect(isOverlayConflict(entry({ updatedAt: "2026-05-05" }), entry({ updatedAt: "2026-05-05" }), roots)).toBe(false);
      expect(isOverlayConflict(entry({ updatedAt: "2026-05-05" }),
        entry({ updatedAt: "2026-05-05", importance: 4 }), roots)).toBe(true);
      // strictly older / strictly newer day-only pairs keep their verdicts.
      expect(isOverlayConflict(entry({ updatedAt: "2026-05-05" }), entry({ updatedAt: "2026-01-01" }), roots)).toBe(false);
      expect(isOverlayConflict(entry({ updatedAt: "2026-05-05" }), entry({ updatedAt: "2026-06-01" }), roots)).toBe(true);
    });
  });
});

describe("sameMemoryContent — a malformed COLLECTION field is uncomparable, never a throw (round-17)", () => {
  it("a non-array `entities` on either side is NOT equivalent (and does not throw)", () => {
    // Round-17: `sameStringSet` spread its arguments (`[...(b ?? [])]`), so a
    // parseable-but-malformed `entities: {}` threw "is not iterable" instead of
    // being reported as non-equivalent. The throw escaped isOverlayConflict and
    // ABORTED the unattended `memory-archive --apply` digest consolidation.
    for (const bad of [{}, "e1", 42, true]) {
      expect(() => sameMemoryContent(entry(), { ...entry(), entities: bad } as unknown as MemoryEntry)).not.toThrow();
      expect(sameMemoryContent(entry(), { ...entry(), entities: bad } as unknown as MemoryEntry)).toBe(false);
      // …and symmetrically when the LOCAL row is the malformed one.
      expect(() => sameMemoryContent({ ...entry(), entities: bad } as unknown as MemoryEntry, entry())).not.toThrow();
      expect(sameMemoryContent({ ...entry(), entities: bad } as unknown as MemoryEntry, entry())).toBe(false);
    }
  });

  it("an ABSENT `entities` still compares equal to [] (no new false divergence)", () => {
    // undefined/null mean "never set" — the renderer emits [] for them — so they
    // must stay equivalent to an explicit empty array, or every legacy row would
    // suddenly read as a cross-device conflict.
    expect(sameMemoryContent(entry(), { ...entry(), entities: undefined } as unknown as MemoryEntry)).toBe(true);
    expect(sameMemoryContent(entry(), { ...entry(), entities: null } as unknown as MemoryEntry)).toBe(true);
  });

  it("equal, non-empty `entities` in a DIFFERENT order stay equivalent (regression)", () => {
    const a = entry({ entities: ["b", "a"] });
    const b = entry({ entities: ["a", "b"] });
    expect(sameMemoryContent(a, b)).toBe(true);
  });
});

describe("isOverlayConflict — an UNCOMPARABLE overlay row is a CONFLICT, never a throw (round-17)", () => {
  /** Both trees hold a readable .md with an IDENTICAL body, so the body check
   *  alone would answer "not a conflict" — the ONLY thing that can flip these to
   *  `true` is the malformed-field handling under test. */
  function withBodyRoots(fn: (roots: { local: string; overlay: string }) => void) {
    const root = mkdtempSync(join(tmpdir(), "vbp-ovl-r17-"));
    try {
      for (const tree of ["local", "overlay"]) {
        const p = join(root, tree, "memory/semantic/p");
        mkdirSync(p, { recursive: true });
        writeFileSync(join(p, "x.md"), `---\nid: semantic/p/x\n---\n\n# T\n\nSame body on both devices.\n`);
      }
      fn({ local: join(root, "local"), overlay: join(root, "overlay") });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("an overlay row whose `entities` is a non-array object → CONFLICT, no exception", () => {
    withBodyRoots((roots) => {
      // control: the SAME row with a well-formed entities is NOT a conflict, so
      // the `true` below is caused by the malformed field, not the fixture.
      expect(isOverlayConflict(entry(), entry(), roots)).toBe(false);
      const overlay = { ...entry(), entities: {} } as unknown;
      expect(() => isOverlayConflict(entry(), overlay, roots)).not.toThrow();
      expect(isOverlayConflict(entry(), overlay, roots)).toBe(true);
    });
  });

  it("an overlay row whose `sourceSessions` is a bare string → CONFLICT, no exception", () => {
    withBodyRoots((roots) => {
      // A structurally corrupt collection field makes the whole row untrustworthy,
      // even though sourceSessions itself is union-able provenance we don't diff.
      const partial = { updatedAt: entry().updatedAt, sourceSessions: "s1" } as unknown;
      expect(() => isOverlayConflict(entry(), partial, roots)).not.toThrow();
      expect(isOverlayConflict(entry(), partial, roots)).toBe(true);
      const full = { ...entry(), sourceSessions: "s1" } as unknown;
      expect(() => isOverlayConflict(entry(), full, roots)).not.toThrow();
      expect(isOverlayConflict(entry(), full, roots)).toBe(true);
    });
  });

  it("an overlay row whose field ACCESS throws is a CONFLICT, not a crash (defensive backstop)", () => {
    withBodyRoots((roots) => {
      const row: Record<string, unknown> = { ...entry() };
      Object.defineProperty(row, "title", {
        get() { throw new Error("boom: exploding accessor"); },
        enumerable: true, configurable: true,
      });
      expect(() => isOverlayConflict(entry(), row, roots)).not.toThrow();
      expect(isOverlayConflict(entry(), row, roots)).toBe(true);
    });
  });
});
