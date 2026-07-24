import type { MemoryEntry, MemoryType } from "./types.js";

export interface MemoryQuery {
  project: string | null;   // cwd project slug
  text: string;             // free-text query (may be "")
  type: MemoryType | null;  // optional type filter
  now: string;              // ISO date for validTo comparison
  files?: string[];         // optional file paths in play
  commits?: string[];       // optional commit shas in play
}

export interface ScoredMemory {
  entry: MemoryEntry;
  score: number;
  whyRecalled: string;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 1);
}

/** Coerce a possibly-missing/NaN numeric field to a finite number (default 0).
 *  Defends the scorer against indexes whose entries lack a numeric field — one
 *  NaN term would otherwise propagate through `score` and corrupt the sort. */
function num(v: unknown, dflt = 0): number {
  return typeof v === "number" && isFinite(v) ? v : dflt;
}

/** Max score contribution from `importance`. Keeps it a secondary boost (file/
 *  commit/pinned tier) that can't outrank a keyword content match (+5). */
const IMPORTANCE_CAP = 3;

function isEligible(e: MemoryEntry, q: MemoryQuery): boolean {
  if (e.status === "superseded" || e.status === "archived") return false;
  if (e.validTo !== null && e.validTo <= q.now) return false;
  if (q.type && e.type !== q.type) return false;
  // scope: global/user always eligible; project-scoped only for the cwd project
  if (e.scope === "global" || e.scope === "user") return true;
  if (q.project && e.scope === `project:${q.project}`) return true;
  // Project-scoped entries from OTHER projects are excluded when a cwd project
  // is set (return false below). They're only eligible when there's no cwd
  // project at all (q.project === null), in which case everything is eligible.
  return q.project === null;
}

export function scoreMemories(entries: MemoryEntry[], q: MemoryQuery): ScoredMemory[] {
  return rankMemories(entries.filter((e) => isEligible(e, q)), q);
}

/** Score ONLY archived entries (for the R2 cold-storage valve). Same ranking as
 *  scoreMemories, but the eligibility is inverted to status === "archived"
 *  (bypassing isEligible entirely). Pure — no mutation of `entries`. */
export function scoreArchived(entries: MemoryEntry[], q: MemoryQuery): ScoredMemory[] {
  return rankMemories(entries.filter((e) => e.status === "archived"), q);
}

/** Shared ranking body: scores every entry in `list` and returns them sorted by
 *  score desc (id localeCompare tiebreak). The eligibility filter is the
 *  caller's concern — scoreMemories passes eligible entries, scoreArchived
 *  passes archived-only. Keeps keyword/scope/file/commit/recency/importance +
 *  the pinned boost all in one place so both entry points rank identically. */
function rankMemories(list: MemoryEntry[], q: MemoryQuery): ScoredMemory[] {
  const qTokens = new Set(tokenize(q.text));
  const out: ScoredMemory[] = [];

  for (const e of list) {
    let score = 0;
    const why: string[] = [];

    // keyword (lexical term-overlap — NOT BM25: no IDF/TF/length-norm, so rare
    // and common tokens weigh equally): presence overlap over title+summary+entities
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize(`${e.title} ${e.summary} ${e.entities.join(" ")}`));
      let hits = 0;
      for (const t of qTokens) if (haystack.has(t)) hits++;
      if (hits > 0) { score += hits * 5; why.push(`keyword×${hits}`); }
    }

    // scope: same-project boost
    if (q.project && e.scope === `project:${q.project}`) { score += 4; why.push("scope:project"); }
    if (e.scope === "global" || e.scope === "user") { score += 2; why.push(`scope:${e.scope}`); }
    if (e.status === "pinned") { score += 3; why.push("pinned"); }

    // file / commit overlap
    const qf = new Set(q.files ?? []);
    const fileHit = e.sourceFiles.filter((f) => qf.has(f)).length;
    if (fileHit > 0) { score += fileHit * 3; why.push(`file×${fileHit}`); }
    const qc = new Set(q.commits ?? []);
    const commitHit = e.sourceCommits.filter((c) => qc.has(c)).length;
    if (commitHit > 0) { score += commitHit * 3; why.push(`commit×${commitHit}`); }

    // recency: newer updatedAt scores a little higher (string ISO compare is monotone)
    score += recencyBoost(e.updatedAt, q.now);

    // importance + prior usefulness.
    // Coerce optional numerics: an index written by the live write path can
    // carry a missing/non-number accessCount or importance (e.g. authored
    // entries that never set accessCount). Math.min(undefined,5)=NaN would
    // poison `score` and break the whole sort (NaN comparisons drop entries to
    // insertion order), so guard every numeric term to a finite default.
    const importance = num(e.importance);
    // importance is a SECONDARY boost, not an unbounded term. Cap its score
    // contribution (≤3, the same tier as file/commit/pinned) so a subjective
    // LLM-assigned importance can never outrank an actual content match — a
    // single keyword hit is +5, so capped importance (≤3) can't beat it. The
    // real value is still shown in `why` for transparency.
    score += Math.min(importance, IMPORTANCE_CAP);
    score += Math.min(num(e.accessCount), 5) * 0.5;
    if (importance >= 3) why.push(`importance:${importance}`);

    out.push({ entry: e, score, whyRecalled: why.join(" ") || "scope-eligible" });
  }

  out.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return out;
}

function recencyBoost(updatedAt: string, now: string): number {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 86400000;
  if (!isFinite(days)) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
