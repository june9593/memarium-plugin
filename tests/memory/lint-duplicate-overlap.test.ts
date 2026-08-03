import { describe, it, expect } from "vitest";
import { lintMemory, nearDuplicatePairs } from "../../src/memory/lint.js";
import { emptyEntityIndex } from "../../src/entity/types.js";
import { emptyQaIndex } from "../../src/qa/types.js";
import type { MemoryEntry } from "../../src/memory/types.js";

const row = (id: string, title: unknown, summary: unknown): MemoryEntry => ({
  id, type: "semantic", scope: "global", project: null,
  title: title as string, summary: summary as string, path: "", status: "active",
  confidence: 0.5, importance: 3, createdAt: "2026-07-01", updatedAt: "2026-07-01",
  validFrom: null, validTo: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
  supersedes: null, entities: [], trust: "unknown", originDevice: null,
  accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
});

const run = (...entries: MemoryEntry[]) =>
  lintMemory(
    { version: 1, entries: Object.fromEntries(entries.map((e) => [e.id, e])) },
    emptyEntityIndex(), emptyQaIndex(), { now: "2026-07-10", project: null },
  );

const overlapOf = (detail: string): number => {
  const m = /overlap ([0-9.]+)/.exec(detail);
  return m ? Number(m[1]) : NaN;
};

/**
 * ROUND-39 / FINDING 2 — the `duplicate-like` detail RECOMPUTED the overlap with
 * `tokenize(`${e.title} ${e.summary}`)`, i.e. the raw template-literal COERCION
 * that round-36 deliberately removed from `nearDuplicatePairs` (which type-guards
 * both fields and treats a non-string as EMPTY). So for a pair involving a
 * malformed row the number lint REPORTED was not the number the pairing DECISION
 * was made on. The fix is not "guard it in both places" but "compute it once":
 * `nearDuplicatePairs` now returns its own `similarity` and lint prints that.
 */
describe("lintMemory — duplicate-like reports the matcher's OWN overlap (round-39)", () => {
  // Guarded (matcher) text: both rows are exactly "cache warmup boot sequence"
  // ⇒ jaccard 1.00, which is what actually paired them.
  // Coerced (old detail) text: b's array summary stringifies to
  // "extra,coerced,tokens,here", adding 4 tokens to one side only ⇒ 4/8 = 0.50.
  const a = row("semantic/_global/a", "cache warmup boot sequence", "");
  const b = row("semantic/_global/b", "cache warmup boot sequence",
    ["extra", "coerced", "tokens", "here"]);

  it("a non-string summary no longer makes the reported overlap disagree with the decision", () => {
    const finding = run(a, b).issues.find((f) => f.check === "duplicate-like");
    expect(finding).toBeDefined();

    const decided = nearDuplicatePairs([a, b], 0.6);
    expect(decided).toHaveLength(1);
    expect(decided[0].similarity).toBe(1);

    // The load-bearing assertion: reported === decided. Pre-fix the detail said
    // "overlap 0.50" while the matcher had scored the pair 1.00.
    expect(overlapOf(finding!.detail)).toBe(decided[0].similarity);
    expect(finding!.detail).toContain("overlap 1.00");
  });

  it("a normal (all-string) pair's reported overlap is unchanged (regression lock)", () => {
    // 5 shared tokens / 7 union = 0.714… → "0.71", identical under both the old
    // recomputation and the new pass-through, since neither field is malformed.
    const x = row("semantic/_global/x", "cache warmup", "warm the cache on boot");
    const y = row("semantic/_global/y", "cache warmup", "warm the cache at boot");
    const finding = run(x, y).issues.find((f) => f.check === "duplicate-like");
    expect(finding?.detail).toBe("near-duplicate of semantic/_global/y (overlap 0.71)");
    expect(overlapOf(finding!.detail))
      .toBe(Number(nearDuplicatePairs([x, y], 0.6)[0].similarity.toFixed(2)));
  });
});
