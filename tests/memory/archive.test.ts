import { describe, it, expect } from "vitest";
import { planArchival, ARCHIVE_DEFAULTS } from "../../src/memory/archive.js";
import type { MemoryEntry } from "../../src/memory/types.js";

const NOW = "2026-07-24";
const daysAgo = (n: number) => new Date(Date.parse(NOW) - n * 864e5).toISOString().slice(0, 10);
const e = (o: Partial<MemoryEntry>): MemoryEntry => ({
  id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p", title: "T",
  summary: "s", path: "memory/semantic/p/x.md", status: "active", confidence: 0.5,
  importance: 3, createdAt: daysAgo(200), updatedAt: daysAgo(200), validFrom: null,
  validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
  entities: [], trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null,
  archivedAt: null, archivedReason: null, ...o,
});
const opts = { now: NOW, ...ARCHIVE_DEFAULTS, knownSessions: undefined as Set<string> | undefined };
const ids = (p: ReturnType<typeof planArchival>) => p.archive.map((a) => a.id).sort();

it("never archives core or pinned, even if stale/unused/expired", () => {
  const es = [
    e({ id: "core/g/rule", type: "core", validTo: daysAgo(1) }),
    e({ id: "semantic/p/pin", status: "pinned", accessCount: 0, importance: 0, updatedAt: daysAgo(300) }),
  ];
  expect(planArchival(es, {}, opts).archive).toEqual([]);
});

it("archives an expired entry", () => {
  const p = planArchival([e({ id: "semantic/p/exp", validTo: daysAgo(1) })], {}, opts);
  expect(p.archive[0]).toEqual({ id: "semantic/p/exp", reason: "expired" });
});

it("archives a superseded entry (cleanup)", () => {
  const p = planArchival([e({ id: "semantic/p/old", status: "superseded" })], {}, opts);
  expect(p.archive[0].reason).toBe("superseded-cleanup");
});

it("archives a stale episodic past the age threshold", () => {
  const p = planArchival([e({ id: "episodic/p/t", type: "episodic", updatedAt: daysAgo(100) })], {}, opts);
  expect(p.archive[0].reason).toBe("stale-episodic:>90d");
});

it("does NOT archive a recent episodic", () => {
  const p = planArchival([e({ id: "episodic/p/t", type: "episodic", updatedAt: daysAgo(10) })], {}, opts);
  expect(p.archive).toEqual([]);
});

it("stale-provenance: fires when all sources gone, skipped when knownSessions undefined", () => {
  const ent = e({ id: "semantic/p/sp", sourceSessions: ["s1", "s2"] });
  expect(planArchival([ent], {}, opts).archive).toEqual([]); // undefined => skip
  const withKnown = { ...opts, knownSessions: new Set<string>() };
  expect(planArchival([ent], {}, withKnown).archive[0].reason).toBe("stale-provenance");
  const stillKnown = { ...opts, knownSessions: new Set(["s1"]) };
  expect(planArchival([ent], {}, stillKnown).archive).toEqual([]); // one source still present
});

it("unused-low-value needs ALL of: count0 + age>min + importance<=max + semantic/procedural + non-core/pinned", () => {
  const good = e({ id: "semantic/p/u", importance: 2, accessCount: 0, updatedAt: daysAgo(70), sourceSessions: [] });
  expect(planArchival([good], {}, opts).archive[0].reason).toBe("unused-low-value");
  // flip each guard -> not archived
  expect(planArchival([e({ ...good, importance: 3 })], {}, opts).archive).toEqual([]);
  expect(planArchival([e({ ...good, updatedAt: daysAgo(30) })], {}, opts).archive).toEqual([]);
  expect(planArchival([e({ ...good, accessCount: 5 })], {}, opts).archive).toEqual([]);
  expect(planArchival([e({ ...good, type: "episodic", updatedAt: daysAgo(10) })], {}, opts).archive).toEqual([]);
});

it("usage sidecar count overrides entry.accessCount for the unused check", () => {
  const ent = e({ id: "semantic/p/u", importance: 2, accessCount: 0, updatedAt: daysAgo(70) });
  const usage = { "semantic/p/u": { count: 4, lastAccess: NOW } };
  expect(planArchival([ent], usage, opts).archive).toEqual([]); // used per sidecar
});

it("near-duplicate: archives the lower-importance loser, keeps the winner", () => {
  const win = e({ id: "semantic/p/win", title: "declare list params as array", summary: "type array not string", importance: 4 });
  const lose = e({ id: "semantic/p/lose", title: "declare list params as array", summary: "type array not string", importance: 1 });
  const p = planArchival([win, lose], {}, opts);
  expect(ids(p)).toEqual(["semantic/p/lose"]);
  expect(p.archive[0].reason).toBe("near-duplicate-of:semantic/p/win");
});

it("near-dup: a valid low-importance loser SURVIVES when the winner is independently archived (expired)", () => {
  // The higher-importance "winner" is itself expired → it will be archived by the
  // per-entry rule. Archiving the lower-importance loser too (as a dup) would erase
  // the shared knowledge from recall entirely. So the loser must survive: only the
  // expired winner is archived, and for reason "expired" (not near-duplicate).
  const win = e({ id: "semantic/p/win", title: "declare list params as array", summary: "type array not string", importance: 4, validTo: daysAgo(1) });
  const lose = e({ id: "semantic/p/lose", title: "declare list params as array", summary: "type array not string", importance: 1, updatedAt: daysAgo(10) });
  const p = planArchival([win, lose], {}, opts);
  expect(ids(p)).toEqual(["semantic/p/win"]);
  expect(p.archive.find((a) => a.id === "semantic/p/win")!.reason).toBe("expired");
});

it("near-dup: the normal case (winner stays active) still archives the loser as a dup", () => {
  // Neither entry independently matches a per-entry rule (recent, mid importance),
  // so the winner stays hot and the loser is archived as its dedup representative.
  const win = e({ id: "semantic/p/win", title: "declare list params as array", summary: "type array not string", importance: 4, updatedAt: daysAgo(10) });
  const lose = e({ id: "semantic/p/lose", title: "declare list params as array", summary: "type array not string", importance: 1, updatedAt: daysAgo(10) });
  const p = planArchival([win, lose], {}, opts);
  expect(ids(p)).toEqual(["semantic/p/lose"]);
  expect(p.archive[0].reason).toBe("near-duplicate-of:semantic/p/win");
});

it("does not re-plan an already-archived entry", () => {
  const p = planArchival([e({ id: "semantic/p/a", status: "archived", validTo: daysAgo(1) })], {}, opts);
  expect(p.archive).toEqual([]);
});
