import type { EntityPage, EntityKind } from "./types.js";

export interface EntityQuery {
  project: string | null;   // cwd project slug
  text: string;             // free-text query (may be "")
  kind: EntityKind | null;  // optional kind filter
  now: string;              // ISO date for recency comparison
}

export interface ScoredEntity {
  entry: EntityPage;
  score: number;
  whyMatched: string;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 1);
}

function isEligible(e: EntityPage, q: EntityQuery): boolean {
  if (q.kind && e.kind !== q.kind) return false;
  // scope: global/user always eligible; project-scoped only for the cwd project
  if (e.scope === "global" || e.scope === "user") return true;
  if (q.project && e.scope === `project:${q.project}`) return true;
  // Project-scoped entries from OTHER projects are excluded when a cwd project
  // is set. They're only eligible when there's no cwd project at all (q.project === null).
  return q.project === null;
}

export function scoreEntities(entries: EntityPage[], q: EntityQuery): ScoredEntity[] {
  const qTokens = new Set(tokenize(q.text));
  const out: ScoredEntity[] = [];

  for (const e of entries) {
    if (!isEligible(e, q)) continue;
    let score = 0;
    const why: string[] = [];

    // name/alias match: term overlap over title + aliases + relatedEntities
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize(`${e.title} ${e.aliases.join(" ")} ${e.relatedEntities.join(" ")}`));
      let hits = 0;
      for (const t of qTokens) if (haystack.has(t)) hits++;
      if (hits > 0) { score += hits * 5; why.push(`name×${hits}`); }
    }

    // scope: same-project boost
    if (q.project && e.scope === `project:${q.project}`) { score += 4; why.push("scope:project"); }
    if (e.scope === "global" || e.scope === "user") { score += 2; why.push(`scope:${e.scope}`); }

    // recency boost
    score += recencyBoost(e.updatedAt, q.now);

    out.push({ entry: e, score, whyMatched: why.join(" ") || "scope-eligible" });
  }

  out.sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));
  return out;
}

function recencyBoost(updatedAt: string, now: string): number {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 86400000;
  if (!isFinite(days)) return 0;
  if (days < 0) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
