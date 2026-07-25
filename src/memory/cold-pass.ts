// R2 "cold-storage resurrect valve" — the ONE read path that surfaces ARCHIVED
// memory.
//
// Archival is aggressive and AUTOMATIC by design; its safety argument is
// (1) core/pinned are never archived, (2) nothing is deleted, and (3) a
// wrongly-archived memory RESURFACES on demand. Guarantee (3) is this module.
// It must therefore be wired into EVERY primary recall surface — `memory-query`
// (/memarium-context) AND `recall` (/memarium-recall, the workflow users
// actually hit before doing work). Both import from here so the gate, the
// scoping, the trust handling and the restore hint can't drift apart.
//
// INVARIANT: this is a READ path. Nothing here writes or mutates status, the
// index, or the entries it is handed.

import { scoreArchived, type MemoryQuery, type ScoredMemory } from "./score.js";
import type { MemorySource } from "./source-resolver.js";
import type { MemoryEntry, MemoryTrust } from "./types.js";

/** One read-only "cold storage" hit — a strongly-matching ARCHIVED entry
 *  surfaced by the R2 resurrect valve. A `local` hit is restorable HERE with
 *  `memory-unarchive <id>` (it lives in this device's index); an `overlay` hit
 *  is a sibling device's archived memory, so it must be restored on
 *  `originDevice` (memory-unarchive only touches the local index). */
export interface ColdStorageHit {
  id: string;
  title: string;
  score: number;
  archivedReason: string | null;
  source: MemorySource;
  originDevice: string | null;
  /** Provenance trust of the archived entry, preserved through the cold pass so a
   *  restored-from-cold UNTRUSTED semantic (issue #23) is never mistaken for an
   *  established fact. Anything other than "trusted" is flagged in the human hint. */
  trust: MemoryTrust;
}

// A real CONTENT hit (vs scope/importance/recency baseline) — same markers
// eval.ts uses. Only content-hit results are recorded as an "access"; bumping
// baseline entries would let an unrelated query (e.g. "kubernetes helm") slowly
// inflate high-importance memories and poison local preference. The cold valve
// uses the same notion on both sides: the gate counts only content-matched
// ACTIVE hits, and a cold candidate must itself be a content match.
export const CONTENT_HIT_MARKERS = ["keyword", "file", "commit"];
export const isContentHitReason = (whyRecalled: string): boolean =>
  CONTENT_HIT_MARKERS.some((m) => whyRecalled.includes(m));
export const isContentHit = (s: ScoredMemory): boolean => isContentHitReason(s.whyRecalled);

// Valve thresholds — when the ACTIVE recall has few content-matched hits,
// surface strongly-matching ARCHIVED entries in a read-only cold-storage
// section so aggressive auto-archival stays reversible. NO write on this path.
export const COLD_FLOOR = 3;        // fire only when fewer than this many active content hits clear the floor…
export const COLD_TOP_K = 3;        // …surface up to this many archived matches…
export const COLD_SCORE_FLOOR = 2;  // …each of which must be a content match clearing this score.

// Project/scope eligibility — the SAME scope rule scoreMemories' isEligible
// applies to the primary pass. scoreArchived filters ONLY on status==="archived"
// (not scope), so cold-storage results must be scope-filtered here or they'd
// leak OTHER projects' archived memory into this project's recall.
function inScope(e: MemoryEntry, project: string | null): boolean {
  if (e.scope === "global" || e.scope === "user") return true;
  if (project && e.scope === `project:${project}`) return true;
  return project === null;
}

export interface ColdPassInput {
  /** The full merged (local + overlay) entry list the primary pass scored. */
  entries: MemoryEntry[];
  /** The primary pass's results — used ONLY to decide whether the valve fires. */
  scored: ScoredMemory[];
  /** The SAME query object the primary pass used (project / text / type / now). */
  query: MemoryQuery;
  /** `view.sources` — which tree each entry id came from (local vs overlay). */
  sources: Record<string, MemorySource>;
}

/**
 * Run the R2 cold pass. Returns [] unless the query is non-empty AND the active
 * recall produced fewer than COLD_FLOOR strong content hits (baseline
 * scope/importance hits don't count — the whole point is "the live memory
 * doesn't answer this query").
 *
 * scoreArchived filters ONLY on archived status, so we (a) scope-filter to the
 * query's project and (b) apply the query's type filter — SAME as the primary
 * pass — so a `--type procedural` query can't surface an archived `semantic`
 * hit. NEVER writes/mutates status.
 */
export function runColdPass({ entries, scored, query, sources }: ColdPassInput): ColdStorageHit[] {
  if (query.text.trim() === "") return [];
  const strongPrimary = scored.filter((s) => isContentHit(s) && s.score >= COLD_SCORE_FLOOR).length;
  if (strongPrimary >= COLD_FLOOR) return [];

  return scoreArchived(entries, query)
    .filter((s) => inScope(s.entry, query.project))
    .filter((s) => !query.type || s.entry.type === query.type)
    .filter((s) => isContentHit(s) && s.score >= COLD_SCORE_FLOOR)
    .slice(0, COLD_TOP_K)
    .map((s) => ({
      id: s.entry.id, title: s.entry.title, score: s.score, archivedReason: s.entry.archivedReason,
      // Origin decides which restore hint is honest: a `local` cold hit lives
      // in THIS device's index (memory-unarchive works); an `overlay` hit is
      // a sibling device's archived memory that memory-unarchive (local-only)
      // can't touch, so we point the user at its origin device instead.
      source: sources[s.entry.id] ?? "local",
      originDevice: s.entry.originDevice ?? null,
      // Preserve trust so a restored-from-cold untrusted semantic (#23) is not
      // surfaced indistinguishably from a trusted fact. Same rule the primary
      // pass uses: anything not "trusted" is untrusted for surfacing.
      trust: s.entry.trust ?? "unknown",
    }));
}

/**
 * Human hint lines for a cold-storage result (caller writes them to STDERR, so
 * the JSON on stdout stays a clean machine payload for the skills). The restore
 * instruction is per-hit: local hits can be unarchived HERE; overlay-only hits
 * live on another device and must be restored there (memory-unarchive is
 * local-only, so advertising it for an overlay hit would always report "not
 * archived"). Returns [] when there's nothing cold — caller emits nothing.
 */
export function renderColdHints(coldStorage: ColdStorageHit[]): string[] {
  if (!coldStorage.length) return [];
  const lines = [`\n❄️ ${coldStorage.length} archived also matched:`];
  for (const c of coldStorage) {
    // Flag any non-trusted cold result so a restored-from-cold untrusted semantic
    // (#23) is never read as an established fact — mirrors how the primary recall
    // splits `untrustedSemantic` out of plain "Project facts".
    const flag = c.trust !== "trusted" ? " (untrusted)" : "";
    if (c.source === "overlay") {
      const dev = c.originDevice ? `device ${c.originDevice}` : "another device";
      lines.push(`  ${c.id}  (${c.archivedReason})  — ${c.title}${flag}  — archived on ${dev}; restore it there`);
    } else {
      lines.push(`  ${c.id}  (${c.archivedReason})  — ${c.title}${flag}  — memory-unarchive ${c.id} to restore`);
    }
  }
  return lines;
}
