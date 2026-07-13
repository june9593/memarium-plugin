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
    if (e.type === "episodic") {
      for (const sid of e.sourceSessions ?? []) consumed.add(sid);
    }
  }
  for (const sid of Object.keys(loadSkips(repoPath).sessions)) consumed.add(sid);
  return consumed;
}
