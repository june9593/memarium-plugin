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

function isEligible(e: MemoryEntry, q: MemoryQuery): boolean {
  if (e.status === "superseded") return false;
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
  const qTokens = new Set(tokenize(q.text));
  const out: ScoredMemory[] = [];

  for (const e of entries) {
    if (!isEligible(e, q)) continue;
    let score = 0;
    const why: string[] = [];

    // keyword (BM25-lite): term overlap over title+summary+entities
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

    // importance + prior usefulness
    score += e.importance;
    score += Math.min(e.accessCount, 5) * 0.5;
    if (e.importance >= 3) why.push(`importance:${e.importance}`);

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
