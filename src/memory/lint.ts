import type { MemoryEntry, MemoryIndex } from "./types.js";
import type { EntityIndex } from "../entity/types.js";
import type { EntityPage } from "../entity/types.js";
import type { QaIndex } from "../qa/types.js";
import type { QaEntry } from "../qa/types.js";

/** Safely extract values from a Record-shaped unknown — returns [] for anything non-object/array/null.
 *  Array values are excluded: typeof [] === "object" but arrays are not valid entries. */
function safeValues<T>(rec: unknown): T[] {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return [];
  return Object.values(rec as Record<string, T>).filter(
    (v): v is T => v !== null && typeof v === "object" && !Array.isArray(v),
  );
}

/** Returns true only when rec[id] is a non-null, non-array object (a valid index entry).
 *  A truthy-but-corrupt value (string, number, array) returns false. */
function validEntryExists(rec: unknown, id: string): boolean {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return false;
  const v = (rec as Record<string, unknown>)[id];
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

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

function inScope(scope: string, cwdProject: string | null): boolean {
  if (typeof scope !== "string") return cwdProject === null; // malformed scope: only in whole-store mode
  if (cwdProject === null) return true;
  if (scope === "global" || scope === "user") return true;
  const scopeProject = scope.startsWith("project:") ? scope.slice("project:".length) : null;
  return scopeProject === cwdProject;
}

const tokenize = (s: string): Set<string> =>
  new Set(s.toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length > 1));

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
};

const daysBetween = (a: string, b: string): number =>
  (Date.parse(a) - Date.parse(b)) / 86400000;

export function lintMemory(
  memoryIdx: MemoryIndex,
  entityIdx: EntityIndex,
  qaIdx: QaIndex,
  opts: LintOptions,
): LintReport {
  const issues: LintFinding[] = [];
  const suggestions: LintFinding[] = [];

  const memEntries = safeValues<MemoryEntry>(memoryIdx.entries)
    .filter((e) => inScope(e.scope, opts.project));

  for (const e of memEntries) {
    try {
      if (e.status === "active" && e.validTo !== null) {
        const ts = Date.parse(e.validTo);
        let vDate: string | null = null;
        if (isFinite(ts)) { try { vDate = new Date(ts).toISOString().slice(0, 10); } catch { vDate = null; } }
        if (vDate === null) {
          issues.push({ check: "malformed-date", severity: "warning", layer: "memory", id: e.id,
            detail: `unparseable validTo=${JSON.stringify(e.validTo)}` });
        } else if (vDate <= opts.now) {
          issues.push({ check: "expired", severity: "warning", layer: "memory", id: e.id,
            detail: `active memory expired at validTo=${e.validTo} (now ${opts.now})` });
        }
      }
      if (e.supersedes !== null && !validEntryExists(memoryIdx.entries, e.supersedes)) {
        issues.push({ check: "dangling-supersedes", severity: "error", layer: "memory", id: e.id,
          detail: `supersedes a memory not in the index`, refs: [e.supersedes] });
      }
      if (e.supersedes !== null && validEntryExists(memoryIdx.entries, e.supersedes)) {
        const target = (memoryIdx.entries as Record<string, MemoryEntry>)[e.supersedes];
        if (target.status === "active") {
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
      if (e.status === "active" && (e.type === "episodic" || e.type === "working")) {
        const age = daysBetween(opts.now, e.updatedAt);
        if (!isFinite(age)) {
          issues.push({ check: "malformed-date", severity: "warning", layer: "memory", id: e.id,
            detail: `unparseable updatedAt=${JSON.stringify(e.updatedAt)}` });
        } else if (age > opts.staleDays) {
          issues.push({ check: "stale-candidate", severity: "info", layer: "memory", id: e.id,
            detail: `${e.type} not updated in >${opts.staleDays}d (updatedAt=${e.updatedAt})` });
        }
      }
    } catch {
      const eid = (e && typeof (e as unknown as Record<string, unknown>).id === "string")
        ? (e as unknown as Record<string, unknown>).id as string : "<unknown>";
      issues.push({ check: "malformed-entry", severity: "error", layer: "memory", id: eid,
        detail: "entry has unexpected field types and was skipped" });
    }
  }

  const dupThreshold = opts.dupThreshold ?? 0.6;
  const active = memEntries.filter((e) => e.status === "active");
  const buckets = new Map<string, { e: MemoryEntry; tokens: Set<string> }[]>();
  for (const e of active) {
    const key = `${e.type} ${e.scope} ${e.project ?? "_global"}`;
    const arr = buckets.get(key) ?? [];
    arr.push({ e, tokens: tokenize(`${e.title} ${e.summary}`) });
    buckets.set(key, arr);
  }
  for (const group of buckets.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        try {
          const sim = jaccard(group[i].tokens, group[j].tokens);
          if (sim >= dupThreshold) {
            const pair = [group[i].e.id, group[j].e.id].slice().sort();
            issues.push({ check: "duplicate-like", severity: "info", layer: "memory",
              id: pair[0], detail: `near-duplicate of ${pair[1]} (overlap ${sim.toFixed(2)})`, refs: pair });
          }
        } catch { /* defensive: skip malformed pair */ }
      }
    }
  }

  const entEntries = safeValues<EntityPage>(entityIdx.entries)
    .filter((e) => inScope(e.scope, opts.project));
  for (const e of entEntries) {
    try {
      for (const mid of e.sourceMemoryIds) {
        if (!validEntryExists(memoryIdx.entries, mid)) {
          issues.push({ check: "entity-dangling-sourceMemoryId", severity: "warning", layer: "entity",
            id: e.id, detail: `sourceMemoryId not in memory index`, refs: [mid] });
        }
      }
      for (const rid of e.relatedEntities) {
        if (!validEntryExists(entityIdx.entries, rid)) {
          issues.push({ check: "entity-unknown-relatedEntity", severity: "warning", layer: "entity",
            id: e.id, detail: `relatedEntity not in entity index`, refs: [rid] });
        }
      }
    } catch {
      const eid = (e && typeof (e as unknown as Record<string, unknown>).id === "string")
        ? (e as unknown as Record<string, unknown>).id as string : "<unknown>";
      issues.push({ check: "malformed-entry", severity: "error", layer: "entity", id: eid,
        detail: "entry has unexpected field types and was skipped" });
    }
  }

  const qaEntries = safeValues<QaEntry>(qaIdx.entries)
    .filter((e) => inScope(e.scope, opts.project));
  for (const e of qaEntries) {
    try {
      for (const mid of e.sourceMemoryIds) {
        if (!validEntryExists(memoryIdx.entries, mid)) {
          issues.push({ check: "qa-dangling-sourceMemoryId", severity: "warning", layer: "qa",
            id: e.id, detail: `sourceMemoryId not in memory index`, refs: [mid] });
        }
      }
      for (const rid of e.relatedEntities) {
        if (!validEntryExists(entityIdx.entries, rid)) {
          issues.push({ check: "qa-unknown-relatedEntity", severity: "warning", layer: "qa",
            id: e.id, detail: `relatedEntity not in entity index`, refs: [rid] });
        }
      }
      const expectProject = e.scope.startsWith("project:") ? e.scope.slice("project:".length) : null;
      if (expectProject !== e.project) {
        issues.push({ check: "qa-scope-leak", severity: "error", layer: "qa", id: e.id,
          detail: `scope=${e.scope} implies project=${JSON.stringify(expectProject)} but stored project=${JSON.stringify(e.project)}` });
      }
    } catch {
      const eid = (e && typeof (e as unknown as Record<string, unknown>).id === "string")
        ? (e as unknown as Record<string, unknown>).id as string : "<unknown>";
      issues.push({ check: "malformed-entry", severity: "error", layer: "qa", id: eid,
        detail: "entry has unexpected field types and was skipped" });
    }
  }

  const clusterMin = opts.clusterMin ?? 2;
  const epis = active.filter((e) => e.type === "episodic");
  const byEntity = new Map<string, MemoryEntry[]>();
  for (const e of epis) {
    if (!Array.isArray(e.entities)) continue;
    for (const tok of e.entities) {
      const key = `${e.project ?? "_global"}::${tok.toLowerCase()}`;
      const arr = byEntity.get(key) ?? [];
      arr.push(e);
      byEntity.set(key, arr);
    }
  }
  const seenClusters = new Set<string>();
  for (const group of byEntity.values()) {
    const ids = [...new Set(group.map((e) => e.id))].sort();
    if (ids.length < clusterMin) continue;
    const sig = ids.join("|");
    if (seenClusters.has(sig)) continue;
    seenClusters.add(sig);
    suggestions.push({ check: "promotion-candidate", severity: "info", layer: "memory",
      id: ids[0], detail: `${ids.length} episodic entries share an entity — consider promoting a stable fact to semantic/procedural (agent decides)`, refs: ids });
  }

  return {
    generatedAt: opts.generatedAt ?? opts.now,
    counts: { issues: issues.length, suggestions: suggestions.length },
    issues,
    suggestions,
  };
}
