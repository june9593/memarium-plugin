import type { MemoryEntry } from "./types.js";
import type { UsageMap } from "./usage-store.js";
import { nearDuplicatePairs } from "./lint.js";

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

/** core and pinned are NEVER archivable; an already-archived entry is skipped so
 *  the plan never re-plans it. */
function archivable(e: MemoryEntry): boolean {
  return e.type !== "core" && e.status !== "pinned" && e.status !== "archived";
}

/** Pure archival planner: decides which memories to archive by 6 rules, with
 *  core / pinned / already-archived hard-guarded. No I/O, no clock — `now` is
 *  passed in. Near-duplicate losers are chosen first (needs the whole set);
 *  then per-entry the first matching of superseded → expired → stale-episodic →
 *  stale-provenance → unused-low-value wins (first rule wins per id). */
export function planArchival(entries: MemoryEntry[], usage: UsageMap, opts: ArchiveOpts): ArchivePlan {
  const chosen = new Map<string, string>(); // id -> reason (first rule wins)
  const pick = (id: string, reason: string) => { if (!chosen.has(id)) chosen.set(id, reason); };

  // Rule 0: near-duplicate losers first (needs the whole set). Loser = lower
  // importance; tie-break to the one updated earlier (<=). Only archive the
  // loser when it is archivable — the winner (and any core/pinned) is kept.
  // Index the entries by id ONCE so each pair is an O(1) lookup, not two O(n)
  // scans (which made the whole pair loop O(n³) store-wide).
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const [a, b] of nearDuplicatePairs(entries)) {
    const ea = byId.get(a), eb = byId.get(b);
    if (!ea || !eb) continue;
    const loser = ea.importance !== eb.importance
      ? (ea.importance < eb.importance ? ea : eb)
      : (Date.parse(ea.updatedAt) <= Date.parse(eb.updatedAt) ? ea : eb);
    const winner = loser === ea ? eb : ea;
    if (archivable(loser)) pick(loser.id, `near-duplicate-of:${winner.id}`);
  }

  for (const e of entries) {
    if (!archivable(e)) continue;
    // Rule 1: leftover superseded record — the replacement is already live.
    if (e.status === "superseded") { pick(e.id, "superseded-cleanup"); continue; }
    // Rule 2: past its validTo.
    if (e.validTo !== null && e.validTo <= opts.now) { pick(e.id, "expired"); continue; }
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
    // own accessCount for the "never used" test.
    const count = usage[e.id]?.count ?? e.accessCount ?? 0;
    if ((e.type === "semantic" || e.type === "procedural") && count === 0 &&
        e.importance <= opts.unusedMaxImportance &&
        daysBetween(opts.now, e.updatedAt) > opts.unusedMinAgeDays) {
      pick(e.id, "unused-low-value"); continue;
    }
  }

  return { archive: [...chosen].map(([id, reason]) => ({ id, reason })) };
}
