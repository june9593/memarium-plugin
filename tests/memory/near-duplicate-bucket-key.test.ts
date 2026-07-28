import { describe, it, expect } from "vitest";
import { nearDuplicatePairs } from "../../src/memory/lint.js";
import { planArchival, ARCHIVE_DEFAULTS } from "../../src/memory/archive.js";
import type { MemoryEntry } from "../../src/memory/types.js";

const row = (id: string, scope: string, project: string | null): MemoryEntry => ({
  id, type: "semantic", scope: scope as MemoryEntry["scope"], project,
  title: "cache warmup", summary: "warm the cache on boot",
  path: "", status: "active",
  confidence: 0.5, importance: 5, createdAt: "2026-07-01", updatedAt: "2026-07-01",
  validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
  supersedes: null, entities: [], trust: "unknown", originDevice: null,
  accessCount: 3, lastAccess: "2026-07-01", archivedAt: null, archivedReason: null,
});

const opts = { ...ARCHIVE_DEFAULTS, now: "2026-07-10", knownSessions: undefined };

/**
 * ROUND-38 — the near-duplicate bucket key was built by CONCATENATING
 * `${type} ${scope} ${project}` with SPACES. Scope/project values may
 * legitimately contain spaces (`projectSlugFromPath` does not sanitize, so a
 * checkout at `~/code/my project` yields project `code-my project`), so two
 * DIFFERENT (scope, project) combinations could join to the SAME key and land in
 * the same bucket. Entries from unrelated projects were then compared as
 * near-duplicates — and `planArchival` ARCHIVES the losing side of a pair.
 */
describe("nearDuplicatePairs — bucket key ambiguity (round-38)", () => {
  // Both space-join to "semantic project:a b c".
  const a = row("semantic/b c/a", "project:a", "b c");
  const b = row("semantic/c/b", "project:a b", "c");

  it("entries whose (scope, project) differ but whose joined key collides are NOT paired", () => {
    // Pre-fix: identical title/summary ⇒ jaccard 1.0 in a shared bucket ⇒ paired.
    expect(nearDuplicatePairs([a, b], 0.8)).toEqual([]);
  });

  it("neither side is archived as a near-duplicate of the other", () => {
    // Pre-fix: the pair ranked by importance (tied) then recency (tied `<=`),
    // so `a` fell out as the loser and was archived off an unrelated project's entry.
    const plan = planArchival([a, b], {}, opts);
    expect(plan.archive).toEqual([]);
  });

  it("still pairs two genuinely same-bucket duplicates (regression lock)", () => {
    const x = row("semantic/b c/x", "project:a", "b c");
    const y = row("semantic/b c/y", "project:a", "b c");
    expect(nearDuplicatePairs([x, y], 0.8)).toEqual([["semantic/b c/x", "semantic/b c/y"]]);
  });

  it("null project still buckets with an explicit _global project (semantics unchanged)", () => {
    const g1 = { ...row("semantic/_global/g1", "global", null) };
    const g2 = { ...row("semantic/_global/g2", "global", "_global") };
    expect(nearDuplicatePairs([g1, g2], 0.8)).toEqual([["semantic/_global/g1", "semantic/_global/g2"]]);
  });

  it("different types never bucket together (semantics unchanged)", () => {
    const s = row("semantic/b c/s", "project:a", "b c");
    const p = { ...row("procedural/b c/p", "project:a", "b c"), type: "procedural" as const };
    expect(nearDuplicatePairs([s, p], 0.8)).toEqual([]);
  });
});
