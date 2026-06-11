import type { QaEntry, QaKind } from "./types.js";

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
function parseProject(v: string): string | null {
  const t = v.trim();
  if (t === "null") return null;
  if (t.startsWith('"')) {
    try { const p = JSON.parse(t); if (typeof p === "string") return p; } catch { /* fall through */ }
  }
  return t; // legacy unquoted non-null value
}
function parseQuoted(v: string): string {
  const t = v.trim();
  if (t.startsWith('"')) {
    try { const p = JSON.parse(t); if (typeof p === "string") return p; } catch { /* fall through */ }
  }
  return t; // legacy/unquoted fallback
}

/** Inverse of renderQaMarkdown: parse frontmatter (body ignored) → QaEntry.
 *  `path` is left "" — the caller fills it from the file path. */
export function parseQaMarkdown(md: string): QaEntry | null {
  md = md.replace(/\r\n/g, "\n");
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
    scope: fm.scope ?? "",
    project: parseProject(fm.project ?? "null"),
    question: parseQuoted(fm.question ?? ""),
    answerSummary: parseQuoted(fm.answerSummary ?? ""),
    kind: fm.kind as QaKind,
    tags: parseArr(fm.tags ?? "[]"),
    sources: parseArr(fm.sources ?? "[]"),
    sourceMemoryIds: parseArr(fm.sourceMemoryIds ?? "[]"),
    sourceSessions: parseArr(fm.sourceSessions ?? "[]"),
    relatedEntities: parseArr(fm.relatedEntities ?? "[]"),
    path: "",
    createdAt: fm.createdAt ?? "",
    updatedAt: fm.updatedAt ?? "",
  };
}
