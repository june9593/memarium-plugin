import type { MemoryEntry, MemoryType } from "./types.js";
import type { QaEntry, QaKind } from "../qa/types.js";
import type { EntityPage, EntityKind } from "../entity/types.js";
import { scoreMemories } from "./score.js";
import { scoreQa } from "../qa/score.js";
import { scoreEntities } from "../entity/score.js";
import { renderPrimer } from "./primer.js";

export type EvalCategory = "memory" | "qa" | "entity" | "primer";

export interface EvalCaseQuery {
  text: string;
  project: string | null;
  now: string;                       // ISO date; deterministic per case
  type?: MemoryType;                 // memory only
  kind?: QaKind | EntityKind;        // qa / entity only
  files?: string[];                  // memory only
  commits?: string[];                // memory only
}

export interface EvalCase {
  name: string;
  category: EvalCategory;
  query: EvalCaseQuery;
  goldIds: string[];
  excludedIds?: string[];
  k?: number;                        // default 5
  expectAbstain?: boolean;
}

export interface EvalCorpus {
  memory: MemoryEntry[];
  qa: QaEntry[];
  entity: EntityPage[];
}

export interface CaseResult {
  name: string;
  category: EvalCategory;
  rankedIds: string[];
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  goldHit: boolean;
  exclusionOk: boolean;
  abstainOk: boolean;
  pass: boolean;
  detail: string;
}

export interface EvalReport {
  total: number; passed: number; failed: number;
  scoredCases: number;               // non-abstention cases in the means
  meanRecallAtK: number; meanPrecisionAtK: number; meanMrr: number;
  abstentionTotal: number; abstentionAccuracy: number;
  byCategory: Record<EvalCategory, { total: number; passed: number; meanRecallAtK: number }>;
  results: CaseResult[];
}

/** Fraction of goldIds present in the top-k of rankedIds. Empty gold → 0. */
export function recallAtK(rankedIds: string[], goldIds: string[], k: number): number {
  if (goldIds.length === 0) return 0;
  const top = new Set(rankedIds.slice(0, k));
  const hit = goldIds.filter((id) => top.has(id)).length;
  return hit / goldIds.length;
}

/** Fraction of the returned top-k that are gold (denominator = min(k, results)). */
export function precisionAtK(rankedIds: string[], goldIds: string[], k: number): number {
  const top = rankedIds.slice(0, Math.max(0, k));
  if (top.length === 0) return 0;
  const gold = new Set(goldIds);
  return top.filter((id) => gold.has(id)).length / top.length;
}

/** Reciprocal rank of the first gold hit, or 0 if none. */
export function mrr(rankedIds: string[], goldIds: string[]): number {
  const gold = new Set(goldIds);
  for (let i = 0; i < rankedIds.length; i++) if (gold.has(rankedIds[i])) return 1 / (i + 1);
  return 0;
}

// A content match (vs scope/importance/recency baseline) is signalled by these
// markers in each scorer's explanation string. Category-specific.
const CONTENT_MATCH_MARKERS: Record<EvalCategory, string[]> = {
  memory: ["keyword", "file", "commit"],
  qa: ["text"],
  entity: ["name"],
  primer: [],
};

function rankMemory(corpus: EvalCorpus, query: EvalCaseQuery): { ids: string[]; whys: string[] } {
  const scored = scoreMemories(corpus.memory, {
    project: query.project, text: query.text, type: query.type ?? null,
    now: query.now, files: query.files, commits: query.commits,
  });
  return { ids: scored.map((s) => s.entry.id), whys: scored.map((s) => s.whyRecalled) };
}

function rankQa(corpus: EvalCorpus, query: EvalCaseQuery): { ids: string[]; whys: string[] } {
  const scored = scoreQa(corpus.qa, {
    project: query.project, text: query.text,
    kind: (query.kind as QaKind) ?? null, now: query.now,
  });
  return { ids: scored.map((s) => s.entry.id), whys: scored.map((s) => s.whyMatched) };
}

function rankEntity(corpus: EvalCorpus, query: EvalCaseQuery): { ids: string[]; whys: string[] } {
  const scored = scoreEntities(corpus.entity, {
    project: query.project, text: query.text,
    kind: (query.kind as EntityKind) ?? null, now: query.now,
  });
  return { ids: scored.map((s) => s.entry.id), whys: scored.map((s) => s.whyMatched) };
}

/** Reverse-map rendered primer bullets back to memory ids by title. Requires
 *  unique titles in the corpus (enforced by a fixture invariant test). */
function primerIncludedIds(corpus: EvalCorpus, query: EvalCaseQuery): string[] {
  const md = renderPrimer(query.project ?? "", corpus.memory, { now: query.now });
  const titleToId = new Map(corpus.memory.map((m) => [m.title, m.id]));
  const ids: string[] = [];
  for (const line of md.split("\n")) {
    const m = /^- \*\*(.+?)\*\* —/.exec(line);
    if (m) { const id = titleToId.get(m[1]); if (id) ids.push(id); }
  }
  return ids;
}

export function runEvalCase(corpus: EvalCorpus, c: EvalCase): CaseResult {
  const k = c.k ?? 5;
  let rankedIds: string[];
  let whys: string[];
  if (c.category === "memory") ({ ids: rankedIds, whys } = rankMemory(corpus, c.query));
  else if (c.category === "qa") ({ ids: rankedIds, whys } = rankQa(corpus, c.query));
  else if (c.category === "entity") ({ ids: rankedIds, whys } = rankEntity(corpus, c.query));
  else { rankedIds = primerIncludedIds(corpus, c.query); whys = []; }

  // For primer the "included set" is the whole result (no k window).
  const effK = c.category === "primer" ? rankedIds.length || 1 : k;
  const topForGold = c.category === "primer" ? rankedIds : rankedIds.slice(0, k);

  const goldHit = c.goldIds.every((id) => topForGold.includes(id));
  const excluded = c.excludedIds ?? [];
  const exclusionOk = !excluded.some((id) => rankedIds.includes(id));

  let abstainOk = true;
  if (c.expectAbstain) {
    const markers = CONTENT_MATCH_MARKERS[c.category];
    abstainOk = !whys.slice(0, k).some((w) => markers.some((mk) => w.includes(mk)));
  }

  const pass = goldHit && exclusionOk && abstainOk;
  const missGold = c.goldIds.filter((id) => !topForGold.includes(id));
  const leaked = excluded.filter((id) => rankedIds.includes(id));
  const detail = pass
    ? "ok"
    : [
        missGold.length ? `missing gold: ${missGold.join(", ")}` : "",
        leaked.length ? `leaked excluded: ${leaked.join(", ")}` : "",
        c.expectAbstain && !abstainOk ? "expected abstain but a content match fired" : "",
      ].filter(Boolean).join("; ");

  return {
    name: c.name, category: c.category, rankedIds,
    recallAtK: recallAtK(rankedIds, c.goldIds, effK),
    precisionAtK: precisionAtK(rankedIds, c.goldIds, effK),
    mrr: mrr(rankedIds, c.goldIds),
    goldHit, exclusionOk, abstainOk, pass, detail,
  };
}
