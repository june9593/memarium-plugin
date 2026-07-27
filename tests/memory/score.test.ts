import { describe, it, expect } from "vitest";
import { scoreMemories, scoreArchived, type MemoryQuery } from "../../src/memory/score.js";
import type { MemoryEntry } from "../../src/memory/types.js";

function e(over: Partial<MemoryEntry>): MemoryEntry {
  return {
    id: over.id ?? "x", type: over.type ?? "semantic", scope: over.scope ?? "project:p",
    project: over.project ?? "p", title: over.title ?? "", summary: over.summary ?? "",
    path: "memory/x.md", status: over.status ?? "active",
    confidence: over.confidence ?? 0.5, importance: over.importance ?? 1,
    createdAt: "2026-01-01", updatedAt: over.updatedAt ?? "2026-01-01",
    validFrom: null, validTo: over.validTo ?? null,
    sourceSessions: [], sourceCommits: [], sourceFiles: over.sourceFiles ?? [],
    supersedes: null, entities: over.entities ?? [], originDevice: null,
    accessCount: over.accessCount ?? 0, lastAccess: null,
  };
}

const Q = (over: Partial<MemoryQuery> = {}): MemoryQuery => ({
  project: "p", text: "", type: null, now: "2026-06-09", ...over,
});

describe("scoreMemories", () => {
  it("excludes superseded and expired entries", () => {
    const entries = [
      e({ id: "ok", title: "auth crash" }),
      e({ id: "old", title: "auth crash", status: "superseded" }),
      e({ id: "expired", title: "auth crash", validTo: "2026-01-01" }),
    ];
    const r = scoreMemories(entries, Q({ text: "auth" }));
    expect(r.map((x) => x.entry.id)).toEqual(["ok"]);
  });

  it("keyword match in title/summary/entities raises score", () => {
    const entries = [
      e({ id: "match", title: "auth token crash", entities: ["AuthTokenView"] }),
      e({ id: "nomatch", title: "unrelated thing" }),
    ];
    const r = scoreMemories(entries, Q({ text: "auth crash" }));
    expect(r[0].entry.id).toBe("match");
    expect(r[0].whyRecalled).toContain("keyword");
  });

  it("same-project entries outrank other-project on equal text", () => {
    const entries = [
      e({ id: "mine", project: "p", scope: "project:p", title: "auth flow" }),
      e({ id: "theirs", project: "q", scope: "project:q", title: "auth flow" }),
    ];
    const r = scoreMemories(entries, Q({ project: "p", text: "auth" }));
    expect(r[0].entry.id).toBe("mine");
    expect(r[0].whyRecalled).toContain("scope");
  });

  it("global/user scope always eligible regardless of project", () => {
    const entries = [e({ id: "rule", scope: "global", project: null, title: "never npm publish" })];
    const r = scoreMemories(entries, Q({ project: "anything", text: "publish" }));
    expect(r.map((x) => x.entry.id)).toEqual(["rule"]);
  });

  it("file-path overlap with query files boosts + explains", () => {
    const entries = [
      e({ id: "f", title: "x", sourceFiles: ["src/sources/base.ts"] }),
      e({ id: "g", title: "x" }),
    ];
    const r = scoreMemories(entries, Q({ text: "", files: ["src/sources/base.ts"] }));
    expect(r[0].entry.id).toBe("f");
    expect(r[0].whyRecalled).toContain("file");
  });

  it("type filter restricts results", () => {
    const entries = [
      e({ id: "c", type: "core", title: "rule", scope: "global", project: null }),
      e({ id: "s", type: "semantic", title: "rule" }),
    ];
    const r = scoreMemories(entries, Q({ text: "rule", type: "core" }));
    expect(r.map((x) => x.entry.id)).toEqual(["c"]);
  });

  it("scores finite when optional numerics (accessCount/importance) are missing", () => {
    const bad = e({ id: "match", title: "auth token crash", entities: ["AuthTokenView"] });
    delete (bad as unknown as Record<string, unknown>).accessCount;
    delete (bad as unknown as Record<string, unknown>).importance;
    const r = scoreMemories([bad], Q({ text: "auth crash" }));
    expect(Number.isFinite(r[0].score)).toBe(true);
    expect(r[0].whyRecalled).toContain("keyword");
  });

  it("a missing-accessCount keyword match still outranks a non-match (NaN would scramble the sort)", () => {
    // Pre-fix, Math.min(undefined,5)=NaN poisoned `score`; NaN comparisons in the
    // sort dropped entries to insertion order, so a clear match could sink.
    const match = e({ id: "match", title: "auth crash", entities: ["X"] });
    delete (match as unknown as Record<string, unknown>).accessCount;
    const nomatch = e({ id: "nomatch", title: "totally unrelated topic" });
    const r = scoreMemories([nomatch, match], Q({ text: "auth crash" }));
    expect(r[0].entry.id).toBe("match");
    for (const s of r) expect(Number.isFinite(s.score)).toBe(true);
  });

  it("a keyword content match outranks a high-importance non-match (importance can't dominate)", () => {
    // Pre-fix, importance was added raw: importance:9 (+9) beat a single keyword
    // hit (+5). Capped at 3, a content match always wins.
    const hot = e({ id: "hot", title: "completely unrelated", importance: 9 });
    const match = e({ id: "match", title: "bookmark stuff", importance: 0 });
    const r = scoreMemories([hot, match], Q({ text: "bookmark" }));
    expect(r[0].entry.id).toBe("match");
  });

  it("caps the importance contribution at 3 (importance 10 scores the same as importance 3)", () => {
    const lo = e({ id: "imp3", importance: 3 });
    const hi = e({ id: "imp10", importance: 10 });
    const r = scoreMemories([lo, hi], Q());
    const sLo = r.find((x) => x.entry.id === "imp3")!.score;
    const sHi = r.find((x) => x.entry.id === "imp10")!.score;
    expect(sHi).toBe(sLo);
  });

  it("excludes archived from primary recall, but scoreArchived returns them", () => {
    const entries = [
      e({ id: "semantic/p/live", title: "vim keybindings", status: "active" }),
      e({ id: "semantic/p/cold", title: "vim keybindings", status: "archived" }),
    ];
    const q = Q({ text: "vim" });
    const primary = scoreMemories(entries, q);
    expect(primary.map((x) => x.entry.id)).toEqual(["semantic/p/live"]);
    const cold = scoreArchived(entries, q);
    expect(cold.map((x) => x.entry.id)).toEqual(["semantic/p/cold"]);
  });
});

// Round-19: the memory index is read LENIENTLY on every READ surface, so a
// parseable-but-malformed row (`entities: {}`, `sourceFiles: "x"`) reaches the
// ranker. `scoreArchived` feeds EVERY archived row straight in, so an unguarded
// `.join()`/`.filter()` meant ONE corrupt archived row could throw and break
// /memarium-recall + memory-query entirely — worse than the write-path cases,
// because recall is the primary user-facing read. Ranking must degrade, never abort.
describe("ranking tolerates malformed collection fields (read path never throws)", () => {
  const corrupt = (over: Partial<MemoryEntry>, bad: Record<string, unknown>): MemoryEntry => {
    const row = e(over);
    Object.assign(row as unknown as Record<string, unknown>, bad);
    return row;
  };

  it("scoreArchived ranks a corrupt archived row without throwing (entities:{} / sourceFiles:'x' / sourceCommits:5)", () => {
    const rows = [
      corrupt({ id: "semantic/p/bad-entities", title: "vim keybindings", status: "archived" }, { entities: {} }),
      corrupt({ id: "semantic/p/bad-files", title: "vim keybindings", status: "archived" }, { sourceFiles: "src/a.ts" }),
      corrupt({ id: "semantic/p/bad-commits", title: "vim keybindings", status: "archived" }, { sourceCommits: 5 }),
      corrupt({ id: "semantic/p/bad-missing", title: "vim keybindings", status: "archived" }, { entities: undefined, sourceFiles: null }),
      e({ id: "semantic/p/good", title: "vim keybindings", status: "archived" }),
    ];
    const q = Q({ text: "vim", files: ["src/a.ts"], commits: ["deadbeef"] });
    let cold: ReturnType<typeof scoreArchived> = [];
    expect(() => { cold = scoreArchived(rows, q); }).not.toThrow();
    // The well-formed archived row is still surfaced, and every score is finite.
    expect(cold.map((x) => x.entry.id)).toContain("semantic/p/good");
    for (const s of cold) expect(Number.isFinite(s.score)).toBe(true);
  });

  it("a row with no `id` at all cannot break the sort tiebreak", () => {
    // Equal-scoring rows fall through to the `id.localeCompare` tiebreak, which
    // throws on a row whose `id` key the lenient reader let through as missing.
    const rows = [
      e({ id: "semantic/p/good", title: "vim keybindings", status: "archived" }),
      corrupt({ title: "vim keybindings", status: "archived" }, { id: undefined }),
      e({ id: "semantic/p/also", title: "vim keybindings", status: "archived" }),
      e({ id: "semantic/p/third", title: "vim keybindings", status: "archived" }),
    ];
    expect(() => scoreArchived(rows, Q({ text: "vim" }))).not.toThrow();
  });

  it("scoreMemories is defensive the same way, and well-formed ordering/scores are UNCHANGED", () => {
    const a = e({ id: "a", title: "auth crash", sourceFiles: ["src/auth.ts"] });
    const b = e({ id: "b", title: "auth thing", entities: ["AuthTokenView"] });
    const c = e({ id: "c", title: "totally unrelated" });
    const q = Q({ text: "auth crash", files: ["src/auth.ts"] });

    const baseline = scoreMemories([a, b, c], q).map((x) => [x.entry.id, x.score, x.whyRecalled]);

    const bad = corrupt({ id: "zbad", title: "auth crash" }, { entities: {}, sourceCommits: "abc" });
    let mixed: ReturnType<typeof scoreMemories> = [];
    expect(() => { mixed = scoreMemories([a, b, c, bad], q); }).not.toThrow();

    // Same rows, same scores, same relative order — the guard is a pure widening.
    expect(mixed.filter((x) => x.entry.id !== "zbad").map((x) => [x.entry.id, x.score, x.whyRecalled]))
      .toEqual(baseline);
  });
});

// Round-20: round-19's leniency stopped malformed rows from THROWING, but it
// still RANKED a row whose `id` the lenient index reader let through as
// missing/empty. Such a row can never be acted on — `memory-unarchive <id>`
// needs an id, and every recall surface cites one — so in the cold path it
// would consume one of the three COLD_TOP_K slots, hide a valid archived match,
// and render a restore hint naming `undefined`. Id-less rows are now dropped
// from the ranked candidates on BOTH paths (an id-less hit is equally useless
// in primary recall). Still no throw.
describe("ranking drops rows with no usable id (round-20)", () => {
  const corrupt = (over: Partial<MemoryEntry>, bad: Record<string, unknown>): MemoryEntry => {
    const row = e(over);
    Object.assign(row as unknown as Record<string, unknown>, bad);
    return row;
  };
  const arch = (id: string) => e({ id, title: "vim keybindings", status: "archived" });

  it("scoreArchived EXCLUDES an id-less archived row and never throws", () => {
    const rows = [
      corrupt({ title: "vim keybindings", status: "archived" }, { id: undefined }),
      corrupt({ title: "vim keybindings", status: "archived" }, { id: "" }),
      corrupt({ title: "vim keybindings", status: "archived" }, { id: 7 }),
      arch("semantic/p/good"),
    ];
    let cold: ReturnType<typeof scoreArchived> = [];
    expect(() => { cold = scoreArchived(rows, Q({ text: "vim" })); }).not.toThrow();
    expect(cold.map((x) => x.entry.id)).toEqual(["semantic/p/good"]);
  });

  it("an id-less archived row cannot consume a cold-storage slot (valid matches still surface)", async () => {
    const { runColdPass, COLD_TOP_K } = await import("../../src/memory/cold-pass.js");
    // The malformed row scores identically to the valid ones; with the sort's
    // String(id ?? "") tiebreak, "" sorts FIRST — so pre-fix it took slot 1 and
    // pushed the third valid match out of the top-K window.
    const entries = [
      corrupt({ title: "vim keybindings", status: "archived" }, { id: undefined }),
      arch("semantic/p/a"), arch("semantic/p/b"), arch("semantic/p/c"),
    ];
    const q = Q({ text: "vim" });
    const cold = runColdPass({ entries, scored: [], query: q, sources: {} });
    expect(cold.length).toBe(COLD_TOP_K);
    expect(cold.map((c) => c.id)).toEqual(["semantic/p/a", "semantic/p/b", "semantic/p/c"]);
    for (const c of cold) expect(typeof c.id === "string" && c.id.length > 0).toBe(true);
  });

  it("scoreMemories drops an id-less ACTIVE row too, leaving healthy ranking untouched", () => {
    const a = e({ id: "a", title: "auth crash", sourceFiles: ["src/auth.ts"] });
    const b = e({ id: "b", title: "auth thing", entities: ["AuthTokenView"] });
    const q = Q({ text: "auth crash", files: ["src/auth.ts"] });
    const baseline = scoreMemories([a, b], q).map((x) => [x.entry.id, x.score, x.whyRecalled]);
    const idless = corrupt({ title: "auth crash" }, { id: "" });
    let mixed: ReturnType<typeof scoreMemories> = [];
    expect(() => { mixed = scoreMemories([a, b, idless], q); }).not.toThrow();
    expect(mixed.map((x) => [x.entry.id, x.score, x.whyRecalled])).toEqual(baseline);
  });
});
