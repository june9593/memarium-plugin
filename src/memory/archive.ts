import type { MemoryEntry } from "./types.js";
import type { UsageMap } from "./usage-store.js";
import { nearDuplicatePairs } from "./lint.js";
import { calendarDate, epochMs } from "./dates.js";

/** Tunable thresholds for the age/importance rules. Overridable per call via
 *  ArchiveOpts; these are the shipped defaults. */
export const ARCHIVE_DEFAULTS = { episodicMaxAgeDays: 90, unusedMinAgeDays: 60, unusedMaxImportance: 2 } as const;

export interface ArchiveOpts {
  now: string;
  episodicMaxAgeDays: number;
  unusedMinAgeDays: number;
  unusedMaxImportance: number;
  /** Full sessionIds known to the spool index. When undefined the
   *  stale-provenance rule is skipped entirely (we can't prove evidence is
   *  gone). When provided, a memory whose sourceSessions are ALL absent from it
   *  is stale-provenance. */
  knownSessions: Set<string> | undefined;
}

export interface ArchivePlan { archive: { id: string; reason: string }[] }

/** Whole days between two ISO dates (now - then). NaN if either is unparseable,
 *  so callers' `> threshold` comparisons stay false on garbage dates. */
function daysBetween(now: string, then: string): number {
  const a = Date.parse(now), b = Date.parse(then);
  if (!isFinite(a) || !isFinite(b)) return NaN;
  return (a - b) / 864e5;
}

/** An entry's importance, or null when it is absent / non-numeric / non-finite.
 *
 *  Round-23: `planArchival` is a PURE exported function and can be called with
 *  UNFILTERED entries (unit tests do; `memory-archive` only filters because
 *  `isRewritableEntry` runs first). It ranked near-duplicate pairs with a raw
 *  `!==` / `<` on `importance`, so with `ea.importance === undefined` and
 *  `eb.importance === 5`: `undefined !== 5` is TRUE, then `undefined < 5` is
 *  FALSE — the loser came out as `eb`, the HEALTHY higher-importance entry, and
 *  IT got archived while the malformed row stayed hot. Reading it through this
 *  helper makes the unusable case EXPLICIT so callers must decide, rather than
 *  falling into JS's silent undefined-comparison semantics.
 *
 *  Deliberately null (skip the decision) rather than a coerced sentinel like
 *  -Infinity: the rest of this module already refuses to archive off a value it
 *  cannot read (`daysBetween` returns NaN, `calendarDate` returns null, and both
 *  make their rules fall false). Archiving is a mutation, so an unreadable
 *  importance must produce NO archival decision at all — that keeps the
 *  invariant "a malformed row can never cause a healthy entry to be archived"
 *  true by construction, without relying on sentinel-ordering reasoning. */
function importanceOf(e: MemoryEntry): number | null {
  const v = (e as unknown as Record<string, unknown>).importance;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** An entry's `updatedAt` as a millisecond timestamp, or null when it is absent /
 *  non-string / unparseable. The recency counterpart to `importanceOf`, and it
 *  exists for exactly the same reason (round-24): the equal-importance branch of
 *  the near-duplicate ranking did a raw `Date.parse(ea.updatedAt) <=
 *  Date.parse(eb.updatedAt)`, and `Date.parse` returns NaN on a malformed date.
 *  `NaN <= x` is FALSE, so the loser fell out as `eb` purely from PAIR ORDERING —
 *  the same defect round-23 fixed one field over, and the same consequence: a
 *  malformed row could get a HEALTHY entry archived. Returning null forces the
 *  caller to make the unrankable case explicit.
 *
 *  Round-30: the parse itself now lives in `dates.ts` as `epochMs`, because the
 *  cross-device write guard needed the same primitive and a second copy would be
 *  the very drift `dates.ts` exists to prevent. */
function updatedAtMs(e: MemoryEntry): number | null {
  return epochMs((e as unknown as Record<string, unknown>).updatedAt);
}

/** core and pinned are NEVER archivable; an already-archived entry is skipped so
 *  the plan never re-plans it. */
function archivable(e: MemoryEntry): boolean {
  return e.type !== "core" && e.status !== "pinned" && e.status !== "archived";
}

/** Pure archival planner: decides which memories to archive by 6 rules, with
 *  core / pinned / already-archived hard-guarded. No I/O, no clock — `now` is
 *  passed in. Per-entry rules are computed FIRST (superseded → expired →
 *  stale-episodic → stale-provenance → unused-low-value, first rule wins per id),
 *  building the `chosen` map. THEN the near-duplicate pass runs over the whole
 *  set: it archives the lower-importance loser to keep the higher-value winner
 *  hot — but ONLY when the winner will stay hot. If the winner is itself being
 *  archived by a per-entry rule, dropping the loser too would erase the shared
 *  knowledge from recall entirely, so the loser is left as the sole
 *  representative. */
export function planArchival(entries: MemoryEntry[], usage: UsageMap, opts: ArchiveOpts): ArchivePlan {
  const chosen = new Map<string, string>(); // id -> reason (first rule wins)
  const pick = (id: string, reason: string) => { if (!chosen.has(id)) chosen.set(id, reason); };
  // `now` as a plain calendar date, so Rule 2 compares like-for-like even when a
  // caller passes a full ISO timestamp. Falls back to the raw string when it
  // isn't parseable (the rest of the module already assumes a usable `now`).
  const nowDate = calendarDate(opts.now) ?? opts.now;

  // Per-entry rules FIRST — so the near-duplicate pass below can see whether each
  // pair's WINNER is independently archivable before deciding the loser's fate.
  for (const e of entries) {
    if (!archivable(e)) continue;
    // Rule 1: leftover superseded record — the replacement is already live.
    if (e.status === "superseded") { pick(e.id, "superseded-cleanup"); continue; }
    // Rule 2: past its validTo. Compared as CALENDAR DATES (not raw strings) so
    // a same-day ISO timestamp counts as expired — the same semantics
    // memory-lint's `expired` check applies. An unparseable/absent validTo
    // yields null and never archives.
    const validToDate = calendarDate(e.validTo);
    if (validToDate !== null && validToDate <= nowDate) { pick(e.id, "expired"); continue; }
    // Rule 3: episodic older than the max age.
    if (e.type === "episodic" && daysBetween(opts.now, e.updatedAt) > opts.episodicMaxAgeDays) {
      pick(e.id, `stale-episodic:>${opts.episodicMaxAgeDays}d`); continue;
    }
    // Rule 4: every supporting session is gone from the spool index.
    if (opts.knownSessions !== undefined && Array.isArray(e.sourceSessions) && e.sourceSessions.length > 0 &&
        e.sourceSessions.every((s) => !opts.knownSessions!.has(s))) {
      pick(e.id, "stale-provenance"); continue;
    }
    // Rule 5: never recalled, old, low-importance, and a semantic/procedural
    // fact. The device-local usage sidecar (if present) overrides the entry's
    // own accessCount for the "never used" test. An UNREADABLE importance never
    // satisfies the threshold (round-23): raw `null <= 2` is TRUE and `"1" <= 2`
    // coerces to true, which archived a row off a value we could not actually read.
    const count = usage[e.id]?.count ?? e.accessCount ?? 0;
    const imp = importanceOf(e);
    if ((e.type === "semantic" || e.type === "procedural") && count === 0 &&
        imp !== null && imp <= opts.unusedMaxImportance &&
        daysBetween(opts.now, e.updatedAt) > opts.unusedMinAgeDays) {
      pick(e.id, "unused-low-value"); continue;
    }
  }

  // Near-duplicate pass LAST (needs the whole set + the per-entry decisions above).
  // Loser = lower importance; tie-break to the one updated earlier (<=). Index the
  // entries by id ONCE so each pair is an O(1) lookup, not two O(n) scans (which
  // made the whole pair loop O(n³) store-wide). We include PINNED as a candidate
  // (active+pinned) so a lower-value active dup of a higher-value pinned memory is
  // caught — the pinned entry can only ever be the WINNER here (archivable() below
  // rejects it as a loser), so an active dup of a pinned memory is archived while
  // the pinned one stays hot.
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const { a, b } of nearDuplicatePairs(entries, 0.8, new Set(["active", "pinned"]))) {
    const ea = byId.get(a), eb = byId.get(b);
    if (!ea || !eb) continue;
    // Round-23: the pair is ranked by importance, so BOTH sides must actually
    // have a readable one. If either doesn't, the pair is UNRANKABLE — skip it
    // and archive neither. Comparing a missing importance directly is what let a
    // malformed row make the healthy, higher-importance entry the "loser".
    // Skipping is pair-LOCAL: each row's own per-entry rule above still stands.
    const ia = importanceOf(ea), ib = importanceOf(eb);
    if (ia === null || ib === null) continue;
    let loser: MemoryEntry;
    if (ia !== ib) {
      loser = ia < ib ? ea : eb;
    } else {
      // Round-24: EQUAL importance falls through to a RECENCY tie-break, which was
      // the very same trap one field over — `Date.parse` returns NaN on a malformed
      // `updatedAt` and `NaN <= x` is FALSE, so `eb` became the loser purely from
      // pair ORDERING and a malformed row could again archive a HEALTHY entry. Same
      // rule as importance, for the same reason: a pair we cannot rank is SKIPPED,
      // so no mutation decision is ever made on a value we cannot read. The skip is
      // pair-LOCAL — each row's own per-entry rule above still stands.
      const ta = updatedAtMs(ea), tb = updatedAtMs(eb);
      if (ta === null || tb === null) continue;
      loser = ta <= tb ? ea : eb;
    }
    const winner = loser === ea ? eb : ea;
    // If the winner is already being archived by a per-entry rule, do NOT add the
    // loser for the dedup reason — archiving both would wipe the shared knowledge
    // from recall. Let the loser survive as the one representative (its own
    // per-entry rule, if any, already ran above and stands).
    if (chosen.has(winner.id)) continue;
    // Winner stays hot → archive the loser as its dedup representative. This SETS
    // the dedup reason even over a per-entry reason the loser also matched, so the
    // "near-duplicate-of:<winner>" label wins for a dup-loser that stays a loser.
    if (archivable(loser)) chosen.set(loser.id, `near-duplicate-of:${winner.id}`);
  }

  return { archive: [...chosen].map(([id, reason]) => ({ id, reason })) };
}
