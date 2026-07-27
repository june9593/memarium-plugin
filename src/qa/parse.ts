import type { QaEntry, QaKind } from "./types.js";
import { readFrontmatterBlock } from "../_shared/frontmatter.js";

function parseArr(v: string | undefined): string[] {
  const t = (v ?? "").trim();
  // "undefined"/"null" (pre-#54 renderer bug) → [] so a direct parse doesn't
  // rebuild a bogus ["undefined"] element (not just the index-command heal).
  if (t === "" || t === "[]" || t === "undefined" || t === "null") return [];
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
  // "undefined" (pre-#54 renderer bug) and "" → absent, so a reindex self-heals.
  if (t === "null" || t === "undefined" || t === "") return null;
  if (t.startsWith('"')) {
    try { const p = JSON.parse(t); if (typeof p === "string") return p; } catch { /* fall through */ }
  }
  return t; // legacy unquoted non-null value
}
function parseDate(v: string | undefined): string {
  const t = (v ?? "").trim();
  return (t === "undefined" || t === "null") ? "" : t;
}
function parseQuoted(v: string): string {
  const t = v.trim();
  if (t.startsWith('"')) {
    try { const p = JSON.parse(t); if (typeof p === "string") return p; } catch { /* fall through */ }
  }
  return t; // legacy/unquoted fallback
}

/** Inverse of renderQaMarkdown: parse frontmatter (body ignored) → QaEntry.
 *  `path` is left "" — the caller fills it from the file path.
 *  Returns null for an unparseable document — no frontmatter block, a missing
 *  id/kind, or a DUPLICATE frontmatter key (corruption or injection; see the
 *  round-35 note in `readFrontmatterBlock`). Callers skip a null. */
export function parseQaMarkdown(md: string): QaEntry | null {
  const fm = readFrontmatterBlock(md);
  if (!fm) return null;
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
    createdAt: parseDate(fm.createdAt),
    updatedAt: parseDate(fm.updatedAt),
  };
}
