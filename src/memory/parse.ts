import type { MemoryEntry, MemoryType } from "./types.js";

function parseArr(v: string): string[] {
  const t = v.trim();
  if (t === "[]" || t === "") return [];
  return t.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseScalar(v: string): string | null {
  const t = v.trim();
  return t === "null" ? null : t;
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
  return {
    id: fm.id, type: fm.type as MemoryType, scope: fm.scope, project: parseScalar(fm.project),
    title: fm.title ?? "", summary: fm.summary ?? "",
    path: "", // filled by caller from the file path
    status: (fm.status as MemoryEntry["status"]) ?? "active",
    confidence: Number(fm.confidence ?? 0), importance: Number(fm.importance ?? 0),
    createdAt: fm.createdAt ?? "", updatedAt: fm.updatedAt ?? "",
    validFrom: parseScalar(fm.validFrom ?? "null"), validTo: parseScalar(fm.validTo ?? "null"),
    sourceSessions: parseArr(fm.sourceSessions ?? "[]"),
    sourceCommits: parseArr(fm.sourceCommits ?? "[]"),
    sourceFiles: parseArr(fm.sourceFiles ?? "[]"),
    supersedes: parseScalar(fm.supersedes ?? "null"),
    entities: parseArr(fm.entities ?? "[]"),
    originDevice: parseScalar(fm.originDevice ?? "null"),
    accessCount: 0, lastAccess: null,
  };
}
