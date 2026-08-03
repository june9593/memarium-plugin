/** Shared date normalization for the memory store's date comparisons.
 *
 *  Lives in its own module because independent surfaces have to agree on what
 *  "expired" (and, since round-30, "newer") means, and they used to disagree one
 *  at a time:
 *    - the archival PLANNER   (`planArchival` Rules 2 + the recency tie-break, src/memory/archive.ts)
 *    - the RESTORER           (`memory-unarchive`'s past-validTo clear)
 *    - the READ paths         (`score.isEligible`, `primer.eligible`, `entity-query`)
 *    - the LINTER             (`memory-lint`'s expired / malformed-date checks)
 *    - the CROSS-DEVICE WRITE GUARD (`isOverlayConflict`, src/memory/overlay-conflict.ts)
 *  Any site that keeps its own comparison drifts; importing these keeps them
 *  aligned by construction.
 */

/** Normalize a date-ish value to a plain `YYYY-MM-DD` CALENDAR date, or null when
 *  it isn't a parseable string. Mirrors `memory-lint`'s expired check exactly
 *  (`Date.parse` → `toISOString().slice(0,10)`).
 *
 *  Round-20: `planArchival` Rule 2 used to compare `validTo <= now` LEXICALLY,
 *  which reads an ISO TIMESTAMP as GREATER than the same day's plain date
 *  ("2026-07-24T00:00:00Z" > "2026-07-24"). A same-day-timestamp entry therefore
 *  escaped archival while lint flagged the very same row as expired — and,
 *  symmetrically, `validTo: ""` compared LESS than any date and got archived as
 *  "expired". Normalizing BOTH sides fixes both directions.
 *
 *  Round-24: the same raw lexical compare survived at the RESTORER and the READ
 *  paths, which is worse than a cosmetic mismatch — an entry archived for
 *  `validTo: "<today>T00:00:00Z"` was expired to the planner, but unarchiving it
 *  did NOT clear that validTo, so the restored entry was re-excluded by the
 *  expiry filters and went invisible again (a broken restore loop). Everyone now
 *  reads dates through here.
 *
 *  Returning null for an unparseable value preserves the module's NaN/garbage-date
 *  safety: a validTo we cannot read is never "expired" and never drives a
 *  mutation (lint reports it as `malformed-date` instead). */
export function calendarDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const ts = Date.parse(v);
  if (!isFinite(ts)) return null;
  try { return new Date(ts).toISOString().slice(0, 10); } catch { return null; }
}

/** A date-ish value as an epoch-millisecond INSTANT, or null when it is absent /
 *  non-string / unparseable. The exact-ordering counterpart to `calendarDate`:
 *  same parse, same null-on-garbage contract, but it keeps sub-day precision so
 *  two values can be ordered CHRONOLOGICALLY rather than lexically.
 *
 *  Round-24 introduced this in `archive.ts` (as a private `updatedAtMs`) because
 *  the equal-importance branch of the near-duplicate ranking did a raw
 *  `Date.parse(ea.updatedAt) <= Date.parse(eb.updatedAt)`, and `Date.parse`
 *  returns NaN on a malformed date. `NaN <= x` is FALSE, so the loser fell out of
 *  PAIR ORDERING alone and a malformed row could get a HEALTHY entry archived.
 *
 *  Round-30 moved it here because a SECOND surface needed the same primitive —
 *  the cross-device write guard (`isOverlayConflict`) was ordering two copies'
 *  `updatedAt` as RAW STRINGS. Returning null (rather than a sentinel like 0 or
 *  NaN) is what makes both call sites state the unreadable case explicitly, which
 *  is the whole point: a value we cannot read must never drive a mutation. */
export function epochMs(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const ts = Date.parse(v);
  return Number.isFinite(ts) ? ts : null;
}
