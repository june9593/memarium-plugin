import { describe, it, expect } from "vitest";
import { nearDuplicatePairs } from "../../src/memory/lint.js";
import type { MemoryEntry } from "../../src/memory/types.js";

const row = (id: string, title: unknown, summary: unknown): MemoryEntry => ({
  id, type: "semantic", scope: "global", project: null,
  title: title as string, summary: summary as string, path: "", status: "active",
  confidence: 0.5, importance: 0, createdAt: "2026-07-01", updatedAt: "2026-07-01",
  validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
  supersedes: null, entities: [], trust: "unknown", originDevice: null,
  accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
});

/**
 * ROUND-36 / FINDING C — `title` / `summary` came from an UNTRUSTED index and
 * were interpolated into a template before the defensive `try`. Interpolation
 * COERCES: `String(["type","array","not","string"])` is `"type,array,not,string"`,
 * which tokenizes exactly like healthy prose, so a malformed row could pair as a
 * near-duplicate — and the archival pass ARCHIVES the losing side of a pair. The
 * `try` never fired, because coercion does not throw.
 */
describe("nearDuplicatePairs — malformed title/summary (round-36)", () => {
  it("a non-string summary does not participate in near-duplicate pairing, and does not throw", () => {
    // Both rows would tokenize to the same set under coercion: the healthy row's
    // prose and the malformed row's array elements are the same words.
    const healthy = row("semantic/_global/a", "cache", "type array not string");
    const malformed = row("semantic/_global/b", "cache", ["type", "array", "not", "string"]);

    let pairs: [string, string][] = [];
    expect(() => { pairs = nearDuplicatePairs([healthy, malformed], 0.8); }).not.toThrow();
    // Pre-fix this returned the pair (jaccard 1.0 — identical coerced tokens).
    expect(pairs).toEqual([]);
  });

  it("still pairs two genuinely near-duplicate rows (regression lock)", () => {
    const a = row("semantic/_global/a", "cache warmup", "warm the cache on boot");
    const b = row("semantic/_global/b", "cache warmup", "warm the cache on boot");
    expect(nearDuplicatePairs([a, b], 0.8)).toEqual([["semantic/_global/a", "semantic/_global/b"]]);
  });
});
