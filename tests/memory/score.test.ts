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
