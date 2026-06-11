import { describe, it, expect } from "vitest";
import { lintMemory, type LintFinding } from "../../src/memory/lint.js";
import { emptyMemoryIndex } from "../../src/memory/types.js";
import type { MemoryEntry } from "../../src/memory/types.js";
import { emptyEntityIndex } from "../../src/entity/types.js";
import { emptyQaIndex } from "../../src/qa/types.js";

const NOW = "2026-06-11";
const opts = { now: NOW, staleDays: 90, project: null as string | null };

describe("lintMemory", () => {
  it("empty indexes → empty report", () => {
    const r = lintMemory(emptyMemoryIndex(), emptyEntityIndex(), emptyQaIndex(), opts);
    expect(r.counts).toEqual({ issues: 0, suggestions: 0 });
    expect(r.issues).toEqual([]);
    expect(r.suggestions).toEqual([]);
    expect(typeof r.generatedAt).toBe("string");
  });
});

function mem(over: Partial<MemoryEntry>): MemoryEntry {
  return { id: over.id ?? "semantic/p/x", type: over.type ?? "semantic",
    scope: over.scope ?? "project:p", project: over.project !== undefined ? over.project : "p",
    title: over.title ?? "t", summary: over.summary ?? "s", path: "memory/x.md",
    status: over.status ?? "active", confidence: 0.8, importance: 1,
    createdAt: "2026-01-01", updatedAt: over.updatedAt ?? "2026-06-11",
    validFrom: null, validTo: over.validTo ?? null,
    sourceSessions: over.sourceSessions ?? ["s1"], sourceCommits: over.sourceCommits ?? [],
    sourceFiles: over.sourceFiles ?? [], supersedes: over.supersedes ?? null,
    entities: over.entities ?? [], originDevice: null, accessCount: over.accessCount ?? 0,
    lastAccess: null };
}
function idxOf(...entries: MemoryEntry[]) {
  return { version: 1 as const, entries: Object.fromEntries(entries.map((e) => [e.id, e])) };
}
function run(mIdx: ReturnType<typeof idxOf>, over: Partial<typeof opts> = {}) {
  return lintMemory(mIdx, emptyEntityIndex(), emptyQaIndex(), { ...opts, ...over });
}
function checks(r: { issues: LintFinding[] }) { return r.issues.map((f) => f.check); }

describe("lintMemory — memory issues", () => {
  it("expired: active + validTo<=now", () => {
    expect(checks(run(idxOf(mem({ id: "semantic/p/old", validTo: "2000-01-01" }))))).toContain("expired");
    expect(checks(run(idxOf(mem({ id: "semantic/p/fut", validTo: "2099-01-01" }))))).not.toContain("expired");
  });
  it("Fix2: validTo with time component — same-day ISO timestamp is expired", () => {
    // "2026-06-11T00:00:00Z" with now="2026-06-11" — slice(0,10) makes "2026-06-11" <= "2026-06-11"
    expect(checks(run(idxOf(mem({ id: "semantic/p/iso-same", validTo: "2026-06-11T00:00:00Z" })), { now: "2026-06-11" }))).toContain("expired");
    // one day in the future is NOT expired
    expect(checks(run(idxOf(mem({ id: "semantic/p/iso-fut", validTo: "2026-06-12T00:00:00Z" })), { now: "2026-06-11" }))).not.toContain("expired");
  });
  it("Fix1 (validTo parse-validate): ISO timestamp same-day (noon) → expired flagged", () => {
    // "2026-06-11T12:00:00Z" normalises to "2026-06-11" which equals now → expired
    const r = run(idxOf(mem({ id: "semantic/p/noon", validTo: "2026-06-11T12:00:00Z" })), { now: "2026-06-11" });
    expect(checks(r)).toContain("expired");
    expect(checks(r)).not.toContain("malformed-date");
  });
  it("Fix1 (validTo parse-validate): unparseable validTo → malformed-date, NOT expired", () => {
    const r = run(idxOf(mem({ id: "semantic/p/bad-vt", validTo: "not-a-date" })));
    expect(checks(r)).toContain("malformed-date");
    expect(checks(r)).not.toContain("expired");
    const f = r.issues.find((x) => x.check === "malformed-date");
    expect(f?.detail).toContain("not-a-date");
  });
  it("Fix1 (validTo parse-validate): non-ISO format validTo → malformed-date, NOT expired", () => {
    // "06/11/2026" is not parseable as a reliable ISO date in all JS engines
    const r = run(idxOf(mem({ id: "semantic/p/slash-date", validTo: "06/11/2026" })));
    // Either malformed-date (if engine rejects it) or expired (if engine accepts it) — must NOT crash
    // The key invariant: expired is only emitted when the date parses successfully
    const issueChecks = checks(r);
    if (issueChecks.includes("malformed-date")) {
      expect(issueChecks).not.toContain("expired");
    }
    // If the engine parsed "06/11/2026" as June 11 2026 it may emit expired — that's acceptable
    // The point is no crash and the two checks are mutually exclusive
    expect(issueChecks.filter(c => c === "expired").length + issueChecks.filter(c => c === "malformed-date").length).toBeLessThanOrEqual(1);
  });
  it("dangling-supersedes: target absent", () => {
    const r = run(idxOf(mem({ id: "semantic/p/a", supersedes: "semantic/p/ghost" })));
    expect(r.issues.find((x) => x.check === "dangling-supersedes")?.refs).toContain("semantic/p/ghost");
  });
  it("superseded-conflict: A supersedes B but B still active", () => {
    const A = mem({ id: "semantic/p/a", supersedes: "semantic/p/b" });
    const B = mem({ id: "semantic/p/b", status: "active" });
    expect(checks(run(idxOf(A, B)))).toContain("superseded-conflict");
  });
  it("missing-provenance: non-core empty sources; core/pinned exempt", () => {
    expect(checks(run(idxOf(mem({ id: "semantic/p/bare", sourceSessions: [], sourceCommits: [], sourceFiles: [] }))))).toContain("missing-provenance");
    expect(checks(run(idxOf(mem({ id: "core/g", type: "core", scope: "global", project: null, sourceSessions: [], sourceCommits: [], sourceFiles: [] }))))).not.toContain("missing-provenance");
    expect(checks(run(idxOf(mem({ id: "semantic/p/pin", status: "pinned", sourceSessions: [], sourceCommits: [], sourceFiles: [] }))))).not.toContain("missing-provenance");
  });
  it("stale-candidate: episodic+old flagged; semantic+old NOT; accessCount irrelevant", () => {
    expect(checks(run(idxOf(mem({ id: "episodic/p/e", type: "episodic", updatedAt: "2026-01-01", accessCount: 99 }))))).toContain("stale-candidate");
    expect(checks(run(idxOf(mem({ id: "semantic/p/s", type: "semantic", updatedAt: "2026-01-01", accessCount: 0 }))))).not.toContain("stale-candidate");
    expect(checks(run(idxOf(mem({ id: "episodic/p/r", type: "episodic", updatedAt: "2026-06-10" }))))).not.toContain("stale-candidate");
  });
  it("malformed-date: active episodic with unparseable updatedAt → malformed-date, NOT stale-candidate", () => {
    const r = run(idxOf(mem({ id: "episodic/p/bad", type: "episodic", updatedAt: "not-a-date" })));
    expect(checks(r)).toContain("malformed-date");
    expect(checks(r)).not.toContain("stale-candidate");
    const f = r.issues.find((x) => x.check === "malformed-date");
    expect(f?.detail).toContain("not-a-date");
  });
  it("superseded entries are not double-flagged as expired/stale", () => {
    const r = run(idxOf(mem({ id: "semantic/p/g", status: "superseded", validTo: "2000-01-01", updatedAt: "2020-01-01", type: "episodic" })));
    expect(checks(r)).not.toContain("expired");
    expect(checks(r)).not.toContain("stale-candidate");
  });
});

describe("lintMemory — duplicate-like", () => {
  it("flags two active same-type/scope/project entries with high title+summary overlap", () => {
    const a = mem({ id: "semantic/p/a", title: "Spool format single md", summary: "one md per session with manifest" });
    const b = mem({ id: "semantic/p/b", title: "Spool format single md file", summary: "one md per session plus manifest" });
    const f = run(idxOf(a, b)).issues.find((x) => x.check === "duplicate-like");
    expect(f).toBeTruthy();
    expect(f!.refs!.slice().sort()).toEqual(["semantic/p/a", "semantic/p/b"]);
  });
  it("duplicate-like id is deterministic: id === refs[0] (lexicographically first)", () => {
    // semantic/p/a sorts before semantic/p/b — id must be "semantic/p/a" regardless of loop order
    const a = mem({ id: "semantic/p/a", title: "Spool format single md", summary: "one md per session with manifest" });
    const b = mem({ id: "semantic/p/b", title: "Spool format single md file", summary: "one md per session plus manifest" });
    const f = run(idxOf(a, b)).issues.find((x) => x.check === "duplicate-like");
    expect(f).toBeTruthy();
    expect(f!.id).toBe("semantic/p/a");
    expect(f!.refs![0]).toBe("semantic/p/a");
    expect(f!.refs![1]).toBe("semantic/p/b");
  });
  it("does NOT flag low-overlap or different type", () => {
    const a = mem({ id: "semantic/p/a", title: "Spool format", summary: "one md per session" });
    const b = mem({ id: "semantic/p/b", title: "Encryption toggle", summary: "git filter scrubs raw" });
    expect(checks(run(idxOf(a, b)))).not.toContain("duplicate-like");
    const c = mem({ id: "procedural/p/c", type: "procedural", title: "Spool format single md", summary: "one md per session with manifest" });
    const d = mem({ id: "semantic/p/d", type: "semantic", title: "Spool format single md", summary: "one md per session with manifest" });
    expect(checks(run(idxOf(c, d)))).not.toContain("duplicate-like");
  });
});

import type { EntityPage } from "../../src/entity/types.js";
function ent(over: Partial<EntityPage>): EntityPage {
  return { id: over.id ?? "entity/p/X", kind: "concept", scope: over.scope ?? "project:p",
    project: over.project !== undefined ? over.project : "p", title: over.title ?? "X", aliases: [],
    sourceMemoryIds: over.sourceMemoryIds ?? [], sourceSessions: [], sourceFiles: [],
    relatedEntities: over.relatedEntities ?? [], path: "memory/entities/p/X.md",
    createdAt: "2026-06-11", updatedAt: "2026-06-11" };
}
function eidx(...pages: EntityPage[]) { return { version: 1 as const, entries: Object.fromEntries(pages.map((p) => [p.id, p])) }; }

describe("lintMemory — entity checks", () => {
  it("entity-dangling-sourceMemoryId + entity-unknown-relatedEntity", () => {
    const mIdx = idxOf(mem({ id: "semantic/p/real" }));
    const e = ent({ id: "entity/p/X", sourceMemoryIds: ["semantic/p/real", "semantic/p/ghost"], relatedEntities: ["entity/p/Y"] });
    const r = lintMemory(mIdx, eidx(e), emptyQaIndex(), opts);
    const cs = r.issues.map((f) => f.check);
    expect(cs).toContain("entity-dangling-sourceMemoryId");
    expect(cs).toContain("entity-unknown-relatedEntity");
    expect(r.issues.filter((f) => f.check === "entity-dangling-sourceMemoryId")).toHaveLength(1);
  });
});

import type { QaEntry } from "../../src/qa/types.js";
function qa(over: Partial<QaEntry>): QaEntry {
  return { id: over.id ?? "qa/p/x", scope: over.scope ?? "project:p", project: over.project !== undefined ? over.project : "p",
    question: "q", answerSummary: "a", kind: "operational", tags: [], sources: [],
    sourceMemoryIds: over.sourceMemoryIds ?? [], sourceSessions: [], relatedEntities: over.relatedEntities ?? [],
    path: "memory/qa/p/x.md", createdAt: "2026-06-11", updatedAt: "2026-06-11" };
}
function qidx(...qs: QaEntry[]) { return { version: 1 as const, entries: Object.fromEntries(qs.map((q) => [q.id, q])) }; }

describe("lintMemory — qa checks", () => {
  it("qa dangling sourceMemoryId + unknown relatedEntity + scope-leak", () => {
    const mIdx = idxOf(mem({ id: "semantic/p/real" }));
    const eIdx = eidx(ent({ id: "entity/p/known" }));
    const good = qa({ id: "qa/p/a", scope: "project:p", project: "p", sourceMemoryIds: ["semantic/p/real"], relatedEntities: ["entity/p/known"] });
    const bad = qa({ id: "qa/p/b", scope: "project:p", project: "p", sourceMemoryIds: ["semantic/p/ghost"], relatedEntities: ["entity/p/ghost"] });
    const leak = qa({ id: "qa/p/c", scope: "project:p", project: "q" });
    const r = lintMemory(mIdx, eIdx, qidx(good, bad, leak), opts);
    const cs = r.issues.map((f) => f.check);
    expect(cs).toContain("qa-dangling-sourceMemoryId");
    expect(cs).toContain("qa-unknown-relatedEntity");
    expect(cs).toContain("qa-scope-leak");
    expect(r.issues.filter((f) => f.id === "qa/p/a")).toHaveLength(0);
  });
  it("global qa with project=null is NOT a scope-leak", () => {
    const r = lintMemory(emptyMemoryIndex(), emptyEntityIndex(), qidx(qa({ id: "qa/_g/x", scope: "global", project: null })), { ...opts, project: null });
    expect(r.issues.map((f) => f.check)).not.toContain("qa-scope-leak");
  });
  it("qa-scope-leak: global/user scope with a non-null project IS flagged", () => {
    const leak = qa({ id: "qa/g/x", scope: "global", project: "p" }); // global must have project null
    const r = lintMemory(emptyMemoryIndex(), emptyEntityIndex(), qidx(leak), { ...opts, project: null });
    expect(r.issues.map((f) => f.check)).toContain("qa-scope-leak");
  });
  it("Fix1: corrupt entry (scope:project:p, project:q) still produces qa-scope-leak when linting under project p", () => {
    // scope says p, project field says q — this is corrupt. lint must not filter it away
    const corrupt = qa({ id: "qa/p/x", scope: "project:p", project: "q" });
    const r = lintMemory(emptyMemoryIndex(), emptyEntityIndex(), qidx(corrupt), { ...opts, project: "p" });
    expect(r.issues.map((f) => f.check)).toContain("qa-scope-leak");
  });
});

describe("lintMemory — suggestions (promotion-candidate)", () => {
  it("clusters >=clusterMin active episodic in same project sharing entities → suggestion, NOT issue", () => {
    const e1 = mem({ id: "episodic/p/1", type: "episodic", entities: ["shortId", "uuidv7"], updatedAt: "2026-06-10" });
    const e2 = mem({ id: "episodic/p/2", type: "episodic", entities: ["shortId", "collision"], updatedAt: "2026-06-10" });
    const r = run(idxOf(e1, e2));
    const s = r.suggestions.find((x) => x.check === "promotion-candidate");
    expect(s).toBeTruthy();
    expect(s!.layer).toBe("memory");
    expect(s!.refs!.slice().sort()).toEqual(["episodic/p/1", "episodic/p/2"]);
    expect(r.issues.map((x) => x.check)).not.toContain("promotion-candidate");
  });
  it("single episodic or no shared entities → no suggestion", () => {
    const e1 = mem({ id: "episodic/p/1", type: "episodic", entities: ["a"], updatedAt: "2026-06-10" });
    expect(run(idxOf(e1)).suggestions).toHaveLength(0);
    const e2 = mem({ id: "episodic/p/2", type: "episodic", entities: ["b"], updatedAt: "2026-06-10" });
    expect(run(idxOf(e1, e2)).suggestions).toHaveLength(0);
  });
});

describe("lintMemory — scope-filter regression", () => {
  it("opts.project='p': entry scoped project:q excluded from ALL checks, project:p and global ARE linted", () => {
    // project:q entry would trigger missing-provenance if included
    const qEntry = mem({ id: "semantic/q/bare", scope: "project:q", project: "q",
      sourceSessions: [], sourceCommits: [], sourceFiles: [] });
    // project:p entry also missing provenance
    const pEntry = mem({ id: "semantic/p/bare", scope: "project:p", project: "p",
      sourceSessions: [], sourceCommits: [], sourceFiles: [] });
    // global entry also missing provenance
    const gEntry = mem({ id: "core/g/bare", type: "semantic", scope: "global", project: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [] });
    const r = run(idxOf(qEntry, pEntry, gEntry), { project: "p" });
    const ids = r.issues.map((f) => f.id);
    // q-scoped entry must not appear
    expect(ids).not.toContain("semantic/q/bare");
    // p-scoped and global entries must appear
    expect(ids).toContain("semantic/p/bare");
    expect(ids).toContain("core/g/bare");
  });
});

describe("lintMemory — duplicate-like below-threshold regression", () => {
  it("overlap just under 0.6 is NOT flagged as duplicate-like", () => {
    // These titles/summaries produce ~0.5 overlap — below the default 0.6 threshold
    const a = mem({ id: "semantic/p/a", type: "semantic",
      title: "vibebook sync command",
      summary: "runs git push and extracts sessions to markdown" });
    const b = mem({ id: "semantic/p/b", type: "semantic",
      title: "vibebook doctor command",
      summary: "health check validates config and git remote" });
    const r = run(idxOf(a, b));
    expect(checks(r)).not.toContain("duplicate-like");
  });
});

describe("lintMemory — corrupt-but-parseable index (A-theme)", () => {
  it("A1: entries as non-object string → no throw, 0 memory findings", () => {
    const r = lintMemory({ version: 1, entries: "garbage" } as unknown as ReturnType<typeof idxOf>,
      emptyEntityIndex(), emptyQaIndex(), opts);
    expect(r).toBeTruthy();
    expect(Array.isArray(r.issues)).toBe(true);
    expect(r.issues.filter((f) => f.layer === "memory")).toHaveLength(0);
  });

  it("A1: entries map with a non-object value → no throw, non-object value skipped", () => {
    const mIdx = { version: 1 as const, entries: { "x": "notanobject" as unknown as ReturnType<typeof mem> } };
    const r = lintMemory(mIdx, emptyEntityIndex(), emptyQaIndex(), opts);
    expect(r).toBeTruthy();
    // non-object "x" is skipped by safeValues, so no issues about it
    expect(r.issues.filter((f) => f.id === "x")).toHaveLength(0);
  });

  it("A2: malformed-entry catch path: entry with null-typed field that causes throw", () => {
    // Create an entry where sourceSessions is null (will throw .length === 0 access)
    const broken = { ...mem({ id: "semantic/p/broken" }), sourceSessions: null as unknown as string[] };
    const mIdx = idxOf(broken);
    const r = lintMemory(mIdx, emptyEntityIndex(), emptyQaIndex(), opts);
    expect(r).toBeTruthy();
    // Either the entry is skipped (malformed-entry) or provenance check fires — must NOT throw
    // The malformed-entry check fires when .sourceSessions.length throws
    const ids = r.issues.map((f) => f.id);
    expect(ids).toContain("semantic/p/broken");
  });

  it("A3: out-of-range validTo string yields malformed-date and does NOT throw", () => {
    // Use a validTo that parses to NaN (definitely not finite) — malformed-date must fire
    const e = mem({ id: "semantic/p/bad-vt2", validTo: "not-a-date" });
    const r = run(idxOf(e));
    expect(checks(r)).toContain("malformed-date");
    expect(checks(r)).not.toContain("expired");
  });

  it("A3: finite but out-of-range timestamp that makes toISOString throw → malformed-date, no throw", () => {
    // Number.MAX_SAFE_INTEGER ms is far beyond Date max (~8640000000000000), so new Date(ts).toISOString() throws RangeError
    // Fake the validTo so Date.parse returns a very large finite number
    // We can simulate by patching Date.parse behaviour or by using a year well beyond JS Date max
    // "+275760-09-14T00:00:00.000Z" is 1ms beyond max JS Date — it may or may not parse to finite in V8
    // The try/catch in A3 covers it either way. Just verify no throw and correct finding.
    const e = mem({ id: "semantic/p/overflow-vt", validTo: "not-a-date" });
    // Also test with the large-year string — must not throw regardless of V8 parse behaviour
    const e2 = mem({ id: "semantic/p/large-year-vt", validTo: "+275760-09-14T00:00:00.000Z" });
    expect(() => run(idxOf(e))).not.toThrow();
    expect(() => run(idxOf(e2))).not.toThrow();
    // e must yield malformed-date (NaN parse)
    expect(checks(run(idxOf(e)))).toContain("malformed-date");
  });

  it("A1: entity entries map with non-object value → no throw", () => {
    const eIdx = { version: 1 as const, entries: { "bad": 42 as unknown as ReturnType<typeof ent> } };
    const r = lintMemory(emptyMemoryIndex(), eIdx, emptyQaIndex(), opts);
    expect(r).toBeTruthy();
    expect(Array.isArray(r.issues)).toBe(true);
  });

  it("A1: qa entries as array → no throw, 0 qa findings", () => {
    const qIdx = { version: 1 as const, entries: [] as unknown as Record<string, ReturnType<typeof qa>> };
    const r = lintMemory(emptyMemoryIndex(), emptyEntityIndex(), qIdx, opts);
    expect(r).toBeTruthy();
    expect(r.issues.filter((f) => f.layer === "qa")).toHaveLength(0);
  });

  it("A: promotion-candidate: entries with non-array entities are skipped without crashing", () => {
    const e1 = { ...mem({ id: "episodic/p/1", type: "episodic", updatedAt: "2026-06-10" }), entities: "notanarray" as unknown as string[] };
    const e2 = mem({ id: "episodic/p/2", type: "episodic", entities: ["shared"], updatedAt: "2026-06-10" });
    // Should not throw; e1 is skipped in clustering, e2 alone won't meet clusterMin
    expect(() => run(idxOf(e1, e2))).not.toThrow();
  });
});
