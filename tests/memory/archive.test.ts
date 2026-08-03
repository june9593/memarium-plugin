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

// Round-20: Rule 2 compared `validTo <= now` LEXICALLY, so an ISO TIMESTAMP on
// the SAME calendar day sorted GREATER than the plain `now` date
// ("2026-07-24T00:00:00Z" > "2026-07-24") and escaped archival — while
// memory-lint (Date.parse → toISOString().slice(0,10), then `<= now`) called the
// exact same entry expired. Both sides now normalize to a plain YYYY-MM-DD date.
describe("expired: calendar-date comparison (matches memory-lint)", () => {
  it("archives a same-day ISO TIMESTAMP validTo (was lexically 'in the future')", () => {
    const p = planArchival([e({ id: "semantic/p/exp", validTo: `${NOW}T00:00:00Z` })], {}, opts);
    expect(p.archive).toEqual([{ id: "semantic/p/exp", reason: "expired" }]);
  });

  it("archives a same-day PLAIN DATE validTo (unchanged)", () => {
    const p = planArchival([e({ id: "semantic/p/exp", validTo: NOW })], {}, opts);
    expect(p.archive).toEqual([{ id: "semantic/p/exp", reason: "expired" }]);
  });

  it("archives a later-in-the-day timestamp too (whole day is expired)", () => {
    const p = planArchival([e({ id: "semantic/p/exp", validTo: `${NOW}T23:59:59Z` })], {}, opts);
    expect(p.archive).toEqual([{ id: "semantic/p/exp", reason: "expired" }]);
  });

  it("does NOT archive a FUTURE validTo (plain date or timestamp)", () => {
    const later = e({ id: "semantic/p/future", validTo: "2026-07-25", updatedAt: daysAgo(1), importance: 3 });
    expect(planArchival([later], {}, opts).archive).toEqual([]);
    expect(planArchival([e({ ...later, validTo: "2026-07-25T00:00:00Z" })], {}, opts).archive).toEqual([]);
  });

  it("does NOT archive (and does not throw) on a garbage validTo", () => {
    const bad = e({ id: "semantic/p/bad", validTo: "not-a-date", updatedAt: daysAgo(1), importance: 3 });
    let p!: ReturnType<typeof planArchival>;
    expect(() => { p = planArchival([bad], {}, opts); }).not.toThrow();
    expect(p.archive).toEqual([]);
    // …and an empty string is equally inert
    expect(planArchival([e({ ...bad, validTo: "" })], {}, opts).archive).toEqual([]);
  });

  it("tolerates an ISO-timestamp `now` (both sides normalized)", () => {
    const tsOpts = { ...opts, now: `${NOW}T12:00:00Z` };
    expect(planArchival([e({ id: "semantic/p/exp", validTo: NOW })], {}, tsOpts).archive[0].reason).toBe("expired");
    expect(planArchival([e({ id: "semantic/p/f", validTo: "2026-07-25", updatedAt: daysAgo(1), importance: 3 })], {}, tsOpts).archive).toEqual([]);
  });
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

// The rule above only ever saw the SAME id form on both sides, which is exactly
// why the id-form mismatch below went unseen for 40 review rounds: older writers
// put 8-char SHORT ids in sourceSessions while the spool index has always held
// FULL sessionIds, and Rule 4's set-membership test could never match the two.
// On the maintainer's real store that wrongly queued 52 of 169 memories (31%) for
// AUTOMATIC archival — core project facts included — with their raw sessions
// still present in the spool. These fixtures deliberately DISAGREE on form.
describe("stale-provenance: mixed short/full session id forms (the 31%-of-store false positive)", () => {
  const FULL = "652535b6-518c-4f31-b8ad-c0d5354c6e4f";
  const SHORT = FULL.slice(0, 8); // "652535b6"
  const OTHER_FULL = "88b5eb49-7323-4908-81e6-abf929a01c97";
  const withKnown = (...ids: string[]) => ({ ...opts, knownSessions: new Set(ids) });

  it("memory holds SHORT ids, spool holds the matching FULL sessionId → NOT stale", () => {
    const ent = e({ id: "semantic/p/short", sourceSessions: [SHORT] });
    expect(planArchival([ent], {}, withKnown(FULL, OTHER_FULL)).archive).toEqual([]);
  });

  it("memory holds a FULL id, spool holds only the SHORT form → NOT stale", () => {
    const ent = e({ id: "semantic/p/full", sourceSessions: [FULL] });
    expect(planArchival([ent], {}, withKnown(SHORT)).archive).toEqual([]);
  });

  it("SHORT id matching NO known session prefix → STILL archived (the rule keeps working)", () => {
    const ent = e({ id: "semantic/p/gone", sourceSessions: ["deadbeef"] });
    expect(planArchival([ent], {}, withKnown(FULL, OTHER_FULL)).archive)
      .toEqual([{ id: "semantic/p/gone", reason: "stale-provenance" }]);
  });

  it("a too-short sourceSession does not match everything → STILL archived", () => {
    const ent = e({ id: "semantic/p/frag", sourceSessions: ["65"] });
    expect(planArchival([ent], {}, withKnown(FULL)).archive)
      .toEqual([{ id: "semantic/p/frag", reason: "stale-provenance" }]);
  });

  it("knownSessions undefined still SKIPS entirely, whatever the id form", () => {
    const ents = [
      e({ id: "semantic/p/short", sourceSessions: [SHORT] }),
      e({ id: "semantic/p/gone", sourceSessions: ["deadbeef"] }),
    ];
    expect(planArchival(ents, {}, { ...opts, knownSessions: undefined }).archive).toEqual([]);
  });

  it("mixed store: only the genuinely sourceless memory is planned", () => {
    const ents = [
      e({ id: "semantic/p/short", sourceSessions: [SHORT] }),          // legacy short form, alive
      e({ id: "semantic/p/full", sourceSessions: [OTHER_FULL] }),      // modern full form, alive
      e({ id: "semantic/p/gone", sourceSessions: ["cafebabe-dead"] }), // really gone
    ];
    expect(ids(planArchival(ents, {}, withKnown(FULL, OTHER_FULL)))).toEqual(["semantic/p/gone"]);
  });
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

it("near-dup: a low-importance ACTIVE dup of a higher-importance PINNED is archived; the PINNED stays", () => {
  // A recent, lower-value ACTIVE memory duplicates a higher-value PINNED one. The
  // pinned entry is a valid near-dup WINNER (the archival pass considers pinned as a
  // candidate), and can NEVER be the loser (archivable() rejects pinned). So the
  // active dup is archived as near-duplicate-of:<pinnedId> while the pinned stays hot.
  const pinned = e({ id: "semantic/p/pin", status: "pinned", importance: 4, updatedAt: daysAgo(10),
    title: "declare list params as array", summary: "type array not string" });
  const active = e({ id: "semantic/p/dup", status: "active", importance: 1, updatedAt: daysAgo(10),
    title: "declare list params as array", summary: "type array not string" });
  const p = planArchival([pinned, active], {}, opts);
  expect(ids(p)).toEqual(["semantic/p/dup"]); // pinned NOT archived
  expect(p.archive.find((a) => a.id === "semantic/p/dup")!.reason).toBe("near-duplicate-of:semantic/p/pin");
});

it("does not re-plan an already-archived entry", () => {
  const p = planArchival([e({ id: "semantic/p/a", status: "archived", validTo: daysAgo(1) })], {}, opts);
  expect(p.archive).toEqual([]);
});

describe("round-23: a NON-FINITE importance can never make a HEALTHY entry the near-dup loser", () => {
  // Round-23: the near-duplicate pass ranked a pair with a raw `!==` / `<` on
  // `importance`. With `ea.importance === undefined` and `eb.importance === 5`,
  // `undefined !== 5` is TRUE but `undefined < 5` is FALSE — so the loser came out
  // as `eb`, the HEALTHY higher-importance entry, and IT got archived while the
  // malformed row stayed hot. planArchival is a PURE exported function callable
  // with unfiltered entries, so it must be robust on its own, independent of the
  // command's isRewritableEntry filter.
  const UNUSABLE = [undefined, null, "5", "", NaN, Infinity, -Infinity, {}, [], true];
  const dup = (o: Partial<MemoryEntry>) =>
    e({ title: "declare list params as array", summary: "type array not string", updatedAt: daysAgo(10), ...o });

  it("never archives the healthy entry, in either argument order, and never throws", () => {
    for (const bad of UNUSABLE) {
      const healthy = dup({ id: "semantic/p/healthy", importance: 5 });
      const broken = { ...dup({ id: "semantic/p/broken", importance: 1 }), importance: bad } as unknown as MemoryEntry;
      for (const set of [[healthy, broken], [broken, healthy]]) {
        let p!: ReturnType<typeof planArchival>;
        expect(() => { p = planArchival(set, {}, opts); }).not.toThrow();
        expect(ids(p)).not.toContain("semantic/p/healthy");
      }
    }
  });

  it("does not archive EITHER side of an unrankable pair (unreadable value ⇒ no archival decision)", () => {
    // Same convention the rest of the module already follows: daysBetween returns
    // NaN and calendarDate returns null on garbage, so a value we cannot read
    // never drives an archival. The dedup pass now skips such a pair outright.
    const healthy = dup({ id: "semantic/p/healthy", importance: 5 });
    const broken = { ...dup({ id: "semantic/p/broken", importance: 1 }), importance: undefined } as unknown as MemoryEntry;
    expect(planArchival([healthy, broken], {}, opts).archive).toEqual([]);
  });

  it("a malformed row still gets its OWN per-entry rule (the skip is pair-local, not an amnesty)", () => {
    // The broken row is an ACTIVE dedup candidate AND independently expired: the
    // PAIR is skipped (unrankable), but its own per-entry rule still stands.
    const healthy = dup({ id: "semantic/p/healthy", importance: 5 });
    const broken = { ...dup({ id: "semantic/p/broken", validTo: daysAgo(1) }), importance: undefined } as unknown as MemoryEntry;
    const p = planArchival([healthy, broken], {}, opts);
    expect(ids(p)).toEqual(["semantic/p/broken"]);
    expect(p.archive[0].reason).toBe("expired");
  });

  it("never archives on `unused-low-value` off an unreadable importance", () => {
    // "1" would coerce to 1 and slip under the <= 2 threshold; undefined/NaN must
    // not either. An importance we cannot read is not a low importance.
    for (const bad of [undefined, null, "1", NaN]) {
      const row = { ...e({ id: "semantic/p/u", accessCount: 0, updatedAt: daysAgo(200) }), importance: bad } as unknown as MemoryEntry;
      expect(planArchival([row], {}, opts).archive).toEqual([]);
    }
    // control: a genuinely low FINITE importance still archives
    expect(ids(planArchival([e({ id: "semantic/p/u", importance: 1, accessCount: 0, updatedAt: daysAgo(200) })], {}, opts)))
      .toEqual(["semantic/p/u"]);
  });

  it("regression lock: a normal pair (both importances finite) is ranked exactly as before", () => {
    const win = dup({ id: "semantic/p/win", importance: 4 });
    const lose = dup({ id: "semantic/p/lose", importance: 1 });
    const p = planArchival([win, lose], {}, opts);
    expect(ids(p)).toEqual(["semantic/p/lose"]);
    expect(p.archive[0].reason).toBe("near-duplicate-of:semantic/p/win");
    // equal importance → tie-break to the one updated EARLIER (unchanged)
    const older = dup({ id: "semantic/p/older", importance: 3, updatedAt: daysAgo(20) });
    const newer = dup({ id: "semantic/p/newer", importance: 3, updatedAt: daysAgo(5) });
    const q = planArchival([newer, older], {}, opts);
    expect(ids(q)).toEqual(["semantic/p/older"]);
    expect(q.archive[0].reason).toBe("near-duplicate-of:semantic/p/newer");
  });
});

describe("round-24: a malformed updatedAt can never make a HEALTHY entry the near-dup tie-break loser", () => {
  // Round-23 hardened the IMPORTANCE branch of the near-duplicate ranking, but the
  // EQUAL-importance branch fell through to `Date.parse(ea.updatedAt) <= Date.parse(eb.updatedAt)`.
  // `Date.parse` returns NaN on a malformed date and `NaN <= x` is FALSE, so the
  // loser came out as `eb` purely from PAIR ORDERING — a malformed row could once
  // again get a HEALTHY entry archived. Same rule as importance now applies: a pair
  // we cannot rank is SKIPPED, so no mutation decision is made on an unreadable value.
  const UNREADABLE = [undefined, null, "", "not-a-date", "06/11/2026x", NaN, 0, {}, []];
  const dup = (o: Partial<MemoryEntry>) =>
    e({ title: "declare list params as array", summary: "type array not string", importance: 5, updatedAt: daysAgo(10), ...o });

  it("archives NEITHER side when the pair ties on importance and one updatedAt is unreadable — in BOTH orderings", () => {
    for (const bad of UNREADABLE) {
      const healthy = dup({ id: "semantic/p/healthy" });
      const broken = { ...dup({ id: "semantic/p/broken" }), updatedAt: bad } as unknown as MemoryEntry;
      for (const set of [[healthy, broken], [broken, healthy]]) {
        let p!: ReturnType<typeof planArchival>;
        expect(() => { p = planArchival(set, {}, opts); }).not.toThrow();
        // the healthy entry is NEVER the loser…
        expect(ids(p)).not.toContain("semantic/p/healthy");
        // …and neither is the unreadable row (no decision off a value we can't read)
        expect(p.archive).toEqual([]);
      }
    }
  });

  it("regression lock: an equal-importance pair with two VALID timestamps still loses the OLDER one (both orderings)", () => {
    const older = dup({ id: "semantic/p/older", updatedAt: daysAgo(20) });
    const newer = dup({ id: "semantic/p/newer", updatedAt: daysAgo(5) });
    for (const set of [[older, newer], [newer, older]]) {
      const p = planArchival(set, {}, opts);
      expect(ids(p)).toEqual(["semantic/p/older"]);
      expect(p.archive[0].reason).toBe("near-duplicate-of:semantic/p/newer");
    }
  });

  it("a malformed-updatedAt row still gets its OWN per-entry rule (the tie-break skip is pair-local)", () => {
    const healthy = dup({ id: "semantic/p/healthy" });
    const broken = { ...dup({ id: "semantic/p/broken", validTo: daysAgo(1) }), updatedAt: "not-a-date" } as unknown as MemoryEntry;
    const p = planArchival([healthy, broken], {}, opts);
    expect(ids(p)).toEqual(["semantic/p/broken"]);
    expect(p.archive[0].reason).toBe("expired");
  });
});
