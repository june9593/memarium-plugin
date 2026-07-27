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

/** Where a cold hit's archived copy actually lives. `local` and `overlay` are
 *  ESTABLISHED answers; `unknown` means we could not resolve the origin at all
 *  and must not guess — see `resolveColdOrigin`. Only `local` may be advertised
 *  with the local `memory-unarchive` command. */
export type ColdOrigin = MemorySource | "unknown";

/** One read-only "cold storage" hit — a strongly-matching ARCHIVED entry
 *  surfaced by the R2 resurrect valve. A `local` hit is restorable HERE with
 *  `memory-unarchive <id>` (it lives in this device's index); an `overlay` hit
 *  is a sibling device's archived memory, so it must be restored on
 *  `originDevice` (memory-unarchive only touches the local index); an `unknown`
 *  origin gets the generic instruction — a wrong local command is worse than a
 *  vaguer correct one. */
export interface ColdStorageHit {
  id: string;
  title: string;
  score: number;
  archivedReason: string | null;
  source: ColdOrigin;
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

// Archival reasons the valve must NOT resurface. The valve's job is to undo
// AGGRESSIVE HEURISTIC archival (unused-low-value / stale-episodic /
// stale-provenance / expired / near-duplicate) — guesses that can be wrong.
// `superseded-cleanup` is not a guess: planArchival Rule 1 only ever assigns it
// to an entry that was ALREADY `superseded`, i.e. deliberately replaced, and its
// replacement is live and findable by the primary pass. Surfacing it here would
// also be an ineffective hint: memory-unarchive deliberately restores a
// superseded-cleanup archive to `superseded` (NOT active) so restoring can't
// reintroduce an obsolete fact — and primary recall EXCLUDES superseded, so the
// advertised "memory-unarchive <id> to restore" would put it right back out of
// recall while surfacing a fact its live replacement already supersedes.
const NON_RESURRECTABLE_REASONS = new Set(["superseded-cleanup"]);
const isResurrectable = (e: MemoryEntry): boolean =>
  !NON_RESURRECTABLE_REASONS.has(e.archivedReason ?? "");

export interface ColdPassInput {
  /** The full merged (local + overlay) entry MAP the primary pass scored —
   *  `view.entries`, keyed EXACTLY as `sources` is. It is the map (not a bare
   *  array) on purpose: a hit's origin must be resolved under the same key
   *  `sources` uses, and only the map carries those keys. */
  entries: Record<string, MemoryEntry>;
  /** The primary pass's results — used ONLY to decide whether the valve fires. */
  scored: ScoredMemory[];
  /** The SAME query object the primary pass used (project / text / type / now). */
  query: MemoryQuery;
  /** `view.sources` — which tree each entry came from, keyed by INDEX MAP KEY
   *  (see `mergeIndexById`), NOT by the row's own `id`. */
  sources: Record<string, MemorySource>;
}

/**
 * Resolve a scored row's ORIGIN under the same KEY `sources` is keyed with.
 *
 * Round-21: this used to be `sources[entry.id] ?? "local"`, which is wrong twice
 * over. `sources` is keyed by the index MAP KEY, and no index loader checks that
 * a row's key agrees with the row's embedded `id` (`loadMemoryIndexStrict`
 * validates only the top-level `entries` map) — so a key/id mismatch looked the
 * origin up under a key that isn't there, and the `?? "local"` default then
 * claimed an OVERLAY-only archive lives here. That renders
 * `memory-unarchive <id>`: a command that fails (the id is not in the local
 * index) or, worse, acts on a different local record that owns that id.
 *
 * So: map the row back to its key by OBJECT IDENTITY (the scorer hands back the
 * very objects it was given), then read `sources` under that key — and FAIL
 * CLOSED to `"unknown"` whenever the key, or a valid source under it, cannot be
 * established. A vaguer correct instruction beats a wrong local one.
 */
function resolveColdOrigin(
  entries: Record<string, MemoryEntry>,
  sources: Record<string, MemorySource>,
): (e: MemoryEntry) => ColdOrigin {
  const keyOf = new Map<MemoryEntry, string | null>();
  for (const [key, e] of Object.entries(entries)) {
    if (!e || typeof e !== "object") continue;
    // The same object filed under two keys is ambiguous — we cannot say which
    // tree it came from, so refuse to guess (null → "unknown").
    keyOf.set(e, keyOf.has(e) ? null : key);
  }
  return (e) => {
    const key = keyOf.get(e);
    if (key == null) return "unknown";           // not in the view, or ambiguous
    const src = sources[key];
    return src === "local" || src === "overlay" ? src : "unknown";
  };
}

/**
 * Run the R2 cold pass. Returns [] unless the query is non-empty AND the active
 * recall produced fewer than COLD_FLOOR strong content hits (baseline
 * scope/importance hits don't count — the whole point is "the live memory
 * doesn't answer this query").
 *
 * scoreArchived filters ONLY on archived status, so we (a) drop entries archived
 * for a NON-RESURRECTABLE reason (see NON_RESURRECTABLE_REASONS), (b) scope-filter
 * to the query's project and (c) apply the query's type filter — SAME as the
 * primary pass — so a `--type procedural` query can't surface an archived
 * `semantic` hit. NEVER writes/mutates status.
 */
export function runColdPass({ entries, scored, query, sources }: ColdPassInput): ColdStorageHit[] {
  if (query.text.trim() === "") return [];
  const strongPrimary = scored.filter((s) => isContentHit(s) && s.score >= COLD_SCORE_FLOOR).length;
  if (strongPrimary >= COLD_FLOOR) return [];

  const originOf = resolveColdOrigin(entries, sources);

  return scoreArchived(Object.values(entries), query)
    .filter((s) => isResurrectable(s.entry))
    .filter((s) => inScope(s.entry, query.project))
    .filter((s) => !query.type || s.entry.type === query.type)
    .filter((s) => isContentHit(s) && s.score >= COLD_SCORE_FLOOR)
    .slice(0, COLD_TOP_K)
    .map((s) => ({
      id: s.entry.id, title: s.entry.title, score: s.score, archivedReason: s.entry.archivedReason,
      // Origin decides which restore hint is honest: a `local` cold hit lives
      // in THIS device's index (memory-unarchive works); an `overlay` hit is
      // a sibling device's archived memory that memory-unarchive (local-only)
      // can't touch, so we point the user at its origin device instead; an
      // `unknown` origin gets the generic instruction rather than a guess.
      source: originOf(s.entry),
      originDevice: s.entry.originDevice ?? null,
      // Preserve trust so a restored-from-cold untrusted semantic (#23) is not
      // surfaced indistinguishably from a trusted fact. Same rule the primary
      // pass uses: anything not "trusted" is untrusted for surfacing.
      trust: s.entry.trust ?? "unknown",
    }));
}

/** Where a single cold hit can actually be restored — the ONE place that decides
 *  whether `memory-unarchive <id>` is an honest instruction. `memory-unarchive`
 *  reads the LOCAL index, so advertising it for an `overlay` hit (a sibling
 *  device's archive) would always come back "not archived", and advertising it
 *  for an `unknown` origin is a guess that can name the wrong record entirely.
 *  Only an ESTABLISHED local origin gets the local command. Every surface that
 *  tells a user how to restore a cold hit must go through here. */
export function coldRestoreInstruction(c: ColdStorageHit): string {
  if (c.source === "local") return `memory-unarchive ${c.id} to restore`;
  if (c.source === "overlay") {
    const dev = c.originDevice ? `device ${c.originDevice}` : "another device";
    return `archived on ${dev}; restore it there`;
  }
  return "origin unknown; restore it on the device that archived it";
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
    lines.push(`  ${c.id}  (${c.archivedReason})  — ${c.title}${flag}  — ${coldRestoreInstruction(c)}`);
  }
  return lines;
}

/**
 * The machine-read `meta.nextStep` sentence for a recall whose ONLY matches were
 * cold. Origin-aware for exactly the reason renderColdHints is: a blanket
 * "memory-unarchive <id> to restore" is a dead end for anything that isn't an
 * ESTABLISHED local archive (memory-unarchive only touches the local index), so
 * it is emitted only when EVERY hit resolved to `local`. All-overlay names the
 * origin device only when every hit agrees on one (a set with any missing device
 * falls back to the device-agnostic wording rather than attributing the whole set
 * to the one device it could read); mixed sets defer to the per-hit stderr hints;
 * anything with an unresolvable origin and nothing local gets the safe generic
 * wording. Returns "" when there's nothing cold — caller falls back to its own
 * no-memory message.
 */
export function renderColdNextStep(coldStorage: ColdStorageHit[]): string {
  if (!coldStorage.length) return "";
  const head = "No ACTIVE memory matched, but archived entries did — see coldStorage";
  const local = coldStorage.filter((c) => c.source === "local");
  // Only an ALL-local set may advertise the bare local command.
  if (local.length === coldStorage.length) return `${head} (memory-unarchive <id> to restore).`;
  if (local.length > 0) {
    return `${head}; each hit carries its own restore path (local hits: memory-unarchive <id>; the rest: restore on their origin device).`;
  }
  const overlay = coldStorage.filter((c) => c.source === "overlay");
  if (overlay.length === coldStorage.length) {
    // Naming a device here is a claim about the WHOLE set ("archived on device
    // laptop" covers every hit listed), so it may only be made when EVERY hit
    // actually supplies that device. Round-25: the distinct list was built by
    // DROPPING missing origins, so a `{laptop, null}` set collapsed to a single
    // device and attributed BOTH archives to `laptop` — inventing an origin for
    // the hit whose device we never knew, and sending the user to look for it on
    // a device that may not hold it. Treat a missing/blank device as its own
    // "unknown" answer: one unknown is enough to fall back to the device-agnostic
    // wording, which is vaguer but true of every hit.
    const devices = new Set(overlay.map((c) => (c.originDevice ? c.originDevice : null)));
    const only = devices.size === 1 ? [...devices][0] : null;
    const tail = only !== null
      ? `archived on device ${only}; restore it there`
      : "each is archived on another device; restore it there";
    return `${head} — ${tail} (memory-unarchive is local-only).`;
  }
  // Nothing established local, and at least one origin we could not resolve →
  // say the safe thing rather than name a device or a command we can't back.
  return `${head} — restore each on the device that archived it (memory-unarchive is local-only).`;
}
