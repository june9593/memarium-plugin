/** Shared date normalization for the memory store's `validTo` expiry semantics.
 *
 *  Lives in its own module because FOUR independent surfaces have to agree on
 *  what "expired" means, and they used to disagree one at a time:
 *    - the archival PLANNER   (`planArchival` Rule 2, src/memory/archive.ts)
 *    - the RESTORER           (`memory-unarchive`'s past-validTo clear)
 *    - the READ paths         (`score.isEligible`, `primer.eligible`, `entity-query`)
 *    - the LINTER             (`memory-lint`'s expired / malformed-date checks)
 *  Any site that keeps its own comparison drifts; importing this one keeps them
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
