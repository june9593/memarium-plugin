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

  const memEntries = Object.values(memoryIdx.entries)
    .filter((e) => inScope(e.scope, e.project, opts.project));

  const daysBetween = (a: string, b: string): number =>
    (Date.parse(a) - Date.parse(b)) / 86400000;

  for (const e of memEntries) {
    if (e.status === "active" && e.validTo !== null && e.validTo <= opts.now) {
      issues.push({ check: "expired", severity: "warning", layer: "memory", id: e.id,
        detail: `active memory expired at validTo=${e.validTo} (now ${opts.now})` });
    }
    if (e.supersedes !== null && !memoryIdx.entries[e.supersedes]) {
      issues.push({ check: "dangling-supersedes", severity: "error", layer: "memory", id: e.id,
        detail: `supersedes a memory not in the index`, refs: [e.supersedes] });
    }
    if (e.supersedes !== null) {
      const target = memoryIdx.entries[e.supersedes];
      if (target && target.status === "active") {
        issues.push({ check: "superseded-conflict", severity: "error", layer: "memory", id: e.id,
          detail: `supersedes ${target.id} but that target is still status=active`, refs: [target.id] });
      }
    }
    const exemptProvenance = e.type === "core" || e.status === "pinned";
    if (!exemptProvenance &&
        e.sourceSessions.length === 0 && e.sourceCommits.length === 0 && e.sourceFiles.length === 0) {
      issues.push({ check: "missing-provenance", severity: "warning", layer: "memory", id: e.id,
        detail: `no sourceSessions/sourceCommits/sourceFiles — origin not traceable` });
    }
    if (e.status === "active" && (e.type === "episodic" || e.type === "working") &&
        daysBetween(opts.now, e.updatedAt) > opts.staleDays) {
      issues.push({ check: "stale-candidate", severity: "info", layer: "memory", id: e.id,
        detail: `${e.type} not updated in >${opts.staleDays}d (updatedAt=${e.updatedAt})` });
    }
  }

  return {
    generatedAt: opts.generatedAt ?? opts.now,
    counts: { issues: issues.length, suggestions: suggestions.length },
    issues,
    suggestions,
  };
}
