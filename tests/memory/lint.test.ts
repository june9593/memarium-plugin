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
    scope: over.scope ?? "project:p", project: over.project ?? "p",
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
  it("does NOT flag low-overlap or different type", () => {
    const a = mem({ id: "semantic/p/a", title: "Spool format", summary: "one md per session" });
    const b = mem({ id: "semantic/p/b", title: "Encryption toggle", summary: "git filter scrubs raw" });
    expect(checks(run(idxOf(a, b)))).not.toContain("duplicate-like");
    const c = mem({ id: "procedural/p/c", type: "procedural", title: "Spool format single md", summary: "one md per session with manifest" });
    const d = mem({ id: "semantic/p/d", type: "semantic", title: "Spool format single md", summary: "one md per session with manifest" });
    expect(checks(run(idxOf(c, d)))).not.toContain("duplicate-like");
  });
});
