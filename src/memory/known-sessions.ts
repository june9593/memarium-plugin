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
