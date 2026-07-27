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

/** Normalize a date-ish value to a plain `YYYY-MM-DD` CALENDAR date, or null when
 *  it isn't a parseable string. Mirrors `memory-lint`'s expired check exactly
 *  (`Date.parse` → `toISOString().slice(0,10)`) so the archival planner and the
 *  linter agree on what "expired" means.
 *
 *  Round-20: Rule 2 used to compare `validTo <= now` LEXICALLY, which reads an
 *  ISO TIMESTAMP as GREATER than the same day's plain date
 *  ("2026-07-24T00:00:00Z" > "2026-07-24"). A same-day-timestamp entry therefore
 *  escaped archival while lint flagged the very same row as expired — and,
 *  symmetrically, `validTo: ""` compared LESS than any date and got archived as
 *  "expired". Normalizing BOTH sides fixes both directions. Returning null for an
 *  unparseable value preserves the module's NaN/garbage-date safety: an entry
 *  whose validTo we cannot read is never archived (lint reports it as
 *  `malformed-date` instead). */
function calendarDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const ts = Date.parse(v);
  if (!isFinite(ts)) return null;
  try { return new Date(ts).toISOString().slice(0, 10); } catch { return null; }
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
    // own accessCount for the "never used" test.
    const count = usage[e.id]?.count ?? e.accessCount ?? 0;
    if ((e.type === "semantic" || e.type === "procedural") && count === 0 &&
        e.importance <= opts.unusedMaxImportance &&
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
  for (const [a, b] of nearDuplicatePairs(entries, 0.8, new Set(["active", "pinned"]))) {
    const ea = byId.get(a), eb = byId.get(b);
    if (!ea || !eb) continue;
    const loser = ea.importance !== eb.importance
      ? (ea.importance < eb.importance ? ea : eb)
      : (Date.parse(ea.updatedAt) <= Date.parse(eb.updatedAt) ? ea : eb);
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
