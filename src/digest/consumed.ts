import { loadMemoryIndex } from "../memory/index-store.js";
import { loadSkips } from "../spool/skip-store.js";

/**
 * The set of session ids already digested (or intentionally skipped), so the
 * `/memarium` digest doesn't reconsider them. Replaces the book-era "union of
 * every chronicle's sessionIds".
 *
 * Sources (LOCAL index only — parity with the old local `index.book.json`; the
 * pre-existing cross-device double-digest window via aggregated raw_sessions is
 * unchanged):
 *   - **episodic** memory `sourceSessions` — the digest RECEIPT per work thread.
 *     Episodic ONLY: semantic/procedural/core are *derived* (a fact extracted
 *     from a session doesn't mean the session's whole arc was digested), and
 *     unioning them would (a) mark a session done when only a fact was pulled,
 *     and (b) block the post-wipe re-digest by pinning surviving semantics'
 *     sessions as "done".
 *   - the local **skip ledger** — sessions considered and intentionally not
 *     digested (meta/ping/trivial), the analog of `skip:true` chronicles.
 */
export function consumedSessions(repoPath: string): Set<string> {
  const consumed = new Set<string>();
  for (const e of Object.values(loadMemoryIndex(repoPath).entries)) {
    // Defensive: a parseable-but-malformed index must never break the digest.
    if (!e || typeof e !== "object") continue;
    if ((e as { type?: unknown }).type !== "episodic") continue;
    const ss = (e as { sourceSessions?: unknown }).sourceSessions;
    if (Array.isArray(ss)) for (const sid of ss) if (typeof sid === "string") consumed.add(sid);
  }
  for (const sid of Object.keys(loadSkips(repoPath).sessions)) consumed.add(sid);
  return consumed;
}
