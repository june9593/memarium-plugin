import type { MemoryEntry, MemoryType } from "./types.js";
import type { QaEntry, QaKind } from "../qa/types.js";
import type { EntityPage, EntityKind } from "../entity/types.js";

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
