import type { EntityPage, EntityKind } from "./types.js";

function parseArr(v: string): string[] {
  const t = v.trim();
  if (t === "" || t === "[]") return [];
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      // fall through to legacy comma-split
    }
  }
  return t.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseScalar(v: string): string | null {
  const t = v.trim();
  // "undefined" (pre-#54 renderer bug) and "" → absent, so a reindex self-heals.
  return (t === "null" || t === "undefined" || t === "") ? null : t;
}
function parseDate(v: string | undefined): string {
  const t = (v ?? "").trim();
  return (t === "undefined" || t === "null") ? "" : t;
}

/** Inverse of renderEntityMarkdown: parse frontmatter (+ ignore body) → EntityPage. */
export function parseEntityMarkdown(md: string): EntityPage | null {
  md = md.replace(/\r\n/g, "\n"); // CRLF-safe (Windows checkouts)
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!fm.id || !fm.kind) return null;
  return {
    id: fm.id,
    kind: fm.kind as EntityKind,
    scope: fm.scope ?? "",
    project: parseScalar(fm.project ?? "null"),
    title: fm.title ?? "",
    aliases: parseArr(fm.aliases ?? "[]"),
    sourceMemoryIds: parseArr(fm.sourceMemoryIds ?? "[]"),
    sourceSessions: parseArr(fm.sourceSessions ?? "[]"),
    sourceFiles: parseArr(fm.sourceFiles ?? "[]"),
    relatedEntities: parseArr(fm.relatedEntities ?? "[]"),
    path: "", // filled by caller from the file path
    createdAt: parseDate(fm.createdAt),
    updatedAt: parseDate(fm.updatedAt),
  };
}
