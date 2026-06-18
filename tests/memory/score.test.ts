import { describe, it, expect } from "vitest";
import { scoreMemories, type MemoryQuery } from "../../src/memory/score.js";
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
      e({ id: "ok", title: "fullscreen crash" }),
      e({ id: "old", title: "fullscreen crash", status: "superseded" }),
      e({ id: "expired", title: "fullscreen crash", validTo: "2026-01-01" }),
    ];
    const r = scoreMemories(entries, Q({ text: "fullscreen" }));
    expect(r.map((x) => x.entry.id)).toEqual(["ok"]);
  });

  it("keyword match in title/summary/entities raises score", () => {
    const entries = [
      e({ id: "match", title: "bookmark bar crash", entities: ["BookmarkBarView"] }),
      e({ id: "nomatch", title: "unrelated thing" }),
    ];
    const r = scoreMemories(entries, Q({ text: "bookmark crash" }));
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
    const bad = e({ id: "match", title: "bookmark bar crash", entities: ["BookmarkBarView"] });
    delete (bad as unknown as Record<string, unknown>).accessCount;
    delete (bad as unknown as Record<string, unknown>).importance;
    const r = scoreMemories([bad], Q({ text: "bookmark crash" }));
    expect(Number.isFinite(r[0].score)).toBe(true);
    expect(r[0].whyRecalled).toContain("keyword");
  });

  it("a missing-accessCount keyword match still outranks a non-match (NaN would scramble the sort)", () => {
    // Pre-fix, Math.min(undefined,5)=NaN poisoned `score`; NaN comparisons in the
    // sort dropped entries to insertion order, so a clear match could sink.
    const match = e({ id: "match", title: "fullscreen crash", entities: ["X"] });
    delete (match as unknown as Record<string, unknown>).accessCount;
    const nomatch = e({ id: "nomatch", title: "totally unrelated topic" });
    const r = scoreMemories([nomatch, match], Q({ text: "fullscreen crash" }));
    expect(r[0].entry.id).toBe("match");
    for (const s of r) expect(Number.isFinite(s.score)).toBe(true);
  });
});
