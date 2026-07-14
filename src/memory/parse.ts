import type { MemoryEntry, MemoryType, MemoryTrust } from "./types.js";

function parseArr(v: string): string[] {
  const t = v.trim();
  if (t === "[]" || t === "") return [];
  return t.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseScalar(v: string): string | null {
  const t = v.trim();
  // "undefined" (from the pre-#54 renderer bug) and "" are treated as absent —
  // so a reindex of legacy md self-heals the value to null instead of a literal.
  return (t === "null" || t === "undefined" || t === "") ? null : t;
}
/** A date field: strip the pre-#54 literal "undefined"/"null" back to "" (absent),
 *  so callers/lint see an unset date rather than an unparseable string. */
function parseDate(v: string | undefined): string {
  const t = (v ?? "").trim();
  return (t === "undefined" || t === "null") ? "" : t;
}
/** Numeric field: NaN-safe AND absent-safe. `Number("")` is a finite 0 and
 *  `Number("null")` is NaN, so check the token before converting — treat "",
 *  "undefined", "null" as absent → fallback (not a bogus 0). */
function parseNum(v: string | undefined, fallback: number): number {
  const t = (v ?? "").trim();
  if (t === "" || t === "undefined" || t === "null") return fallback;
  const n = Number(t);
  return Number.isFinite(n) ? n : fallback;
}

/** Coerce a frontmatter trust value to the enum; anything unexpected → unknown. */
function coerceTrust(v: string): MemoryTrust {
  const t = v.trim();
  return t === "trusted" || t === "untrusted" ? t : "unknown";
}

/** Legacy migration: an md with NO `trust:` line predates the field. Derive it
 *  mechanically — an entry with own-work provenance (a sourceSession or a
 *  sourceCommit) that is project/global/user-scoped is `trusted`; otherwise
 *  `unknown`. This keeps existing digested project facts in the primer without
 *  blanket-trusting unprovenanced entries. New md always carries `trust:`, so
 *  this only fires for pre-feature files. */
function deriveLegacyTrust(sourceSessions: string[], sourceCommits: string[], scope: string, project: string | null): MemoryTrust {
  const ownProvenance = sourceSessions.length > 0 || sourceCommits.length > 0;
  const projectScoped = scope === "global" || scope === "user" || project !== null;
  return ownProvenance && projectScoped ? "trusted" : "unknown";
}

/** Inverse of renderMemoryMarkdown: parse frontmatter (+ ignore body) → MemoryEntry. */
export function parseMemoryMarkdown(md: string): MemoryEntry | null {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!fm.id || !fm.type) return null;
  const scope = fm.scope;
  const project = parseScalar(fm.project);
  const sourceSessions = parseArr(fm.sourceSessions ?? "[]");
  const sourceCommits = parseArr(fm.sourceCommits ?? "[]");
  // trust: literal when present (new md); legacy-derived when absent (pre-feature md).
  const trust = fm.trust !== undefined
    ? coerceTrust(fm.trust)
    : deriveLegacyTrust(sourceSessions, sourceCommits, scope, project);
  const statusRaw = (fm.status ?? "").trim();
  const status = (statusRaw === "" || statusRaw === "undefined" || statusRaw === "null")
    ? "active" : statusRaw;
  return {
    id: fm.id, type: fm.type as MemoryType, scope, project,
    title: fm.title ?? "", summary: fm.summary ?? "",
    path: "", // filled by caller from the file path
    status: status as MemoryEntry["status"],
    confidence: parseNum(fm.confidence, 0.5), importance: parseNum(fm.importance, 0),
    createdAt: parseDate(fm.createdAt), updatedAt: parseDate(fm.updatedAt),
    validFrom: parseScalar(fm.validFrom ?? "null"), validTo: parseScalar(fm.validTo ?? "null"),
    sourceSessions,
    sourceCommits,
    sourceFiles: parseArr(fm.sourceFiles ?? "[]"),
    supersedes: parseScalar(fm.supersedes ?? "null"),
    entities: parseArr(fm.entities ?? "[]"),
    trust,
    originDevice: parseScalar(fm.originDevice ?? "null"),
    accessCount: 0, lastAccess: null,
  };
}
