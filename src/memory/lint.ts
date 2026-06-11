import type { MemoryEntry, MemoryIndex } from "./types.js";
import type { EntityIndex } from "../entity/types.js";
import type { QaIndex } from "../qa/types.js";

export interface LintFinding {
  check: string;
  severity: "error" | "warning" | "info";
  layer: "memory" | "entity" | "qa";
  id: string;
  detail: string;
  refs?: string[];
}
export interface LintReport {
  generatedAt: string;
  counts: { issues: number; suggestions: number };
  issues: LintFinding[];
  suggestions: LintFinding[];
}
export interface LintOptions {
  now: string;
  staleDays: number;
  project: string | null;
  generatedAt?: string;
  dupThreshold?: number;
  clusterMin?: number;
}

function inScope(scope: string, project: string | null, cwdProject: string | null): boolean {
  if (cwdProject === null) return true;
  if (scope === "global" || scope === "user") return true;
  return project === cwdProject;
}

export function lintMemory(
  memoryIdx: MemoryIndex,
  entityIdx: EntityIndex,
  qaIdx: QaIndex,
  opts: LintOptions,
): LintReport {
  const issues: LintFinding[] = [];
  const suggestions: LintFinding[] = [];

  // checks added in later sub-tasks

  return {
    generatedAt: opts.generatedAt ?? opts.now,
    counts: { issues: issues.length, suggestions: suggestions.length },
    issues,
    suggestions,
  };
}
