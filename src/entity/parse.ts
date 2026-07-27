import type { EntityPage, EntityKind } from "./types.js";
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
function parseScalar(v: string): string | null {
  const t = v.trim();
  // "undefined" (pre-#54 renderer bug) and "" → absent, so a reindex self-heals.
  return (t === "null" || t === "undefined" || t === "") ? null : t;
}
function parseDate(v: string | undefined): string {
  const t = (v ?? "").trim();
  return (t === "undefined" || t === "null") ? "" : t;
}

/** Inverse of renderEntityMarkdown: parse frontmatter (+ ignore body) → EntityPage.
 *  Returns null for an unparseable document — no frontmatter block, a missing
 *  id/kind, or a DUPLICATE frontmatter key (corruption or injection; see the
 *  round-35 note in `readFrontmatterBlock`). Callers skip a null. */
export function parseEntityMarkdown(md: string): EntityPage | null {
  const fm = readFrontmatterBlock(md);
  if (!fm) return null;
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
