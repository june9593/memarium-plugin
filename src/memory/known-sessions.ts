import { loadIndex } from "../_shared/index-store.js";
import type { Tool } from "../_shared/types.js";

// Runtime allowlist mirroring the `Tool` union in _shared/types.ts. Typed as
// Set<Tool> so tsc rejects a typo'd literal here, but read as ReadonlySet<string>
// so it can test the untyped tool field off a raw index entry. Keep in sync with
// `Tool`: an index entry whose tool isn't one of these is not something memarium
// writes, so a nonempty index containing one is untrusted.
const KNOWN_TOOLS: ReadonlySet<string> = new Set<Tool>(["claude", "copilot"]);

/** Full sessionIds the spool index (`.memarium/index.json`) positively vouches
 *  for — the input to every "is this memory's evidence still present?" check
 *  (lint's stale-provenance finding, the archival engine's stale-provenance
 *  rule). Returns `undefined` when the index is absent / empty / corrupt /
 *  MALFORMED (parseable but with any bogus entry), so callers SKIP the check
 *  rather than false-flag every provenanced memory on a repo whose index isn't
 *  cleanly loadable. The set is built ONLY when the index is positively
 *  trustworthy: present, non-empty, and every entry well-formed (a non-empty
 *  string sessionId, a supported tool, and a map key equal to
 *  `${tool}:${sessionId}`). loadIndex returns an empty index on an absent file
 *  and throws only on a corrupt one; the well-formedness gate below catches the
 *  parseable-but-garbage case loadIndex can't (it validates only the version). */
export function loadKnownSessions(repoPath: string): Set<string> | undefined {
  try {
    const spool = loadIndex(repoPath);
    const pairs = Object.entries(spool.entries);
    const wellFormed = pairs.length > 0 && pairs.every(([key, ent]) => {
      const e2 = ent as { tool?: unknown; sessionId?: unknown };
      return typeof e2.sessionId === "string" && e2.sessionId.length > 0
        && typeof e2.tool === "string" && KNOWN_TOOLS.has(e2.tool)
        && key === `${e2.tool}:${e2.sessionId}`;
    });
    return wellFormed
      ? new Set(pairs.map(([, ent]) => (ent as { sessionId: string }).sessionId))
      : undefined; // absent / empty / malformed → skip
  } catch {
    return undefined; // corrupt → skip
  }
}

/** Minimum length a stored/known value must have before it is allowed to match by
 *  PREFIX. 8 is the short-id width memarium's own writers used, and it is short
 *  enough to stay cheap while long enough that a stray fragment ("s1", "sess",
 *  "") cannot prefix-match half the spool. Below this, only an EXACT match
 *  counts. */
export const SESSION_ID_PREFIX_MIN = 8;

/** Does this memory's `sourceSession` still point at a session the spool index
 *  vouches for?
 *
 *  THIS IS DELIBERATELY NOT `known.has(s)` — DO NOT "SIMPLIFY" IT BACK.
 *
 *  ID-FORM HISTORY (the bug this function exists to fix): the two sides of this
 *  comparison have never agreed on an id FORM. Older memarium writers recorded
 *  8-char SHORT ids in `sourceSessions` (e.g. `652535b6`), while the spool index
 *  (`.memarium/index.json`) has always stored FULL sessionIds (e.g.
 *  `652535b6-518c-4f31-b8ad-c0d5354c6e4f`). A plain set-membership test can never
 *  match a short id against a full one, so EVERY short-id memory read as "all its
 *  evidence is gone". On the maintainer's real store that was 52 of 169 memories
 *  (31%) queued for AUTOMATIC archival — including core project facts — with the
 *  raw sessions still sitting right there in the spool.
 *
 *  It survived 40 rounds of review because every fixture used the SAME id form on
 *  both sides, which makes a form mismatch structurally invisible. (memarium's own
 *  typed memory files that trap under `equal-idform-fixtures-hide-id-mismatch-bugs`.)
 *  Tests for this function MUST mix forms across the two sides.
 *
 *  So: match id-form TOLERANTLY, in either direction.
 *    - exact match; OR
 *    - the stored value is a PREFIX of a known full sessionId (the short-id case); OR
 *    - a known value is a prefix of the stored value (the inverse, for safety).
 *  Both prefix directions require BOTH sides to be at least
 *  `SESSION_ID_PREFIX_MIN` chars, so a short/empty/garbage value can only ever
 *  match exactly and can never launder itself into "still present".
 *
 *  Kept as ONE exported matcher because the two consumers — `planArchival`'s
 *  Rule 4 (which ARCHIVES) and `lintMemory`'s `stale-provenance` finding (which
 *  warns) — must agree, and they have already drifted apart once. Cost is a scan
 *  of `known` only when the O(1) exact match misses, which is the legacy-short-id
 *  and the genuinely-stale case; the healthy full-id steady state never scans. */
export function isKnownSession(sourceSession: unknown, known: ReadonlySet<string>): boolean {
  // sourceSessions comes off an untrusted index row, so it is not guaranteed to
  // be an array of strings. A non-string is not a session anybody knows.
  if (typeof sourceSession !== "string" || sourceSession.length === 0) return false;
  if (known.has(sourceSession)) return true; // fast path: same id form on both sides
  if (sourceSession.length < SESSION_ID_PREFIX_MIN) return false; // too short to prefix-match
  for (const k of known) {
    if (k.length < SESSION_ID_PREFIX_MIN) continue; // ditto, from the index side
    if (k.startsWith(sourceSession) || sourceSession.startsWith(k)) return true;
  }
  return false;
}

/** Is a memory's provenance STALE — i.e. it claims supporting sessions but NONE
 *  of them is still known to the spool? The single predicate behind both the
 *  archival rule and the lint finding. Callers must have already established
 *  that `known` is defined (an unreadable index SKIPS the check entirely — we
 *  never archive on evidence we cannot read) and that `sourceSessions` is
 *  non-empty (an entry with no provenance at all is `missing-provenance`, a
 *  different finding). */
export function isStaleProvenance(sourceSessions: readonly unknown[], known: ReadonlySet<string>): boolean {
  return !sourceSessions.some((s) => isKnownSession(s, known));
}
