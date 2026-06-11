import type { QaEntry, QaKind } from "./types.js";

export interface QaQuery {
  project: string | null;  // cwd project slug
  text: string;            // free-text query (may be "")
  kind: QaKind | null;     // optional kind filter
  now: string;             // ISO date for recency comparison
}

export interface ScoredQa {
  entry: QaEntry;
  score: number;
  whyMatched: string;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 1);
}

function isEligible(e: QaEntry, q: QaQuery): boolean {
  if (q.kind && e.kind !== q.kind) return false;
  if (e.scope === "global" || e.scope === "user") return true;
  if (q.project && e.scope === `project:${q.project}`) return true;
  return q.project === null;
}

function recencyBoost(updatedAt: string, now: string): number {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 86400000;
  if (!isFinite(days)) return 0;
  if (days < 0) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}

export function scoreQa(entries: QaEntry[], q: QaQuery): ScoredQa[] {
  const qTokens = new Set(tokenize(q.text));
  const out: ScoredQa[] = [];

  for (const e of entries) {
    if (!isEligible(e, q)) continue;
    let score = 0;
    const why: string[] = [];

    if (qTokens.size > 0) {
      const haystack = new Set(tokenize(`${e.question} ${e.answerSummary} ${e.tags.join(" ")}`));
      let hits = 0;
      for (const t of qTokens) if (haystack.has(t)) hits++;
      if (hits > 0) { score += hits * 5; why.push(`text×${hits}`); }
    }

    if (q.project && e.scope === `project:${q.project}`) { score += 4; why.push("scope:project"); }
    if (e.scope === "global" || e.scope === "user") { score += 2; why.push(`scope:${e.scope}`); }

    score += recencyBoost(e.updatedAt, q.now);
    out.push({ entry: e, score, whyMatched: why.join(" ") || "scope-eligible" });
  }

  out.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return out;
}
