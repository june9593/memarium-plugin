import type { QaEntry, QaKind } from "./types.js";

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
 *  `path` is left "" — the caller fills it from the file path. */
export function parseQaMarkdown(md: string): QaEntry | null {
  md = md.replace(/\r\n/g, "\n");
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  // Null-prototype map: frontmatter keys are UNTRUSTED, so `__proto__` /
  // `constructor` must be ordinary entries here, not a reach into Object.prototype.
  const fm: Record<string, string> = Object.create(null);
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    // FIRST occurrence wins — an ANTI-INJECTION rule, not style (round-34). The
    // renderer emits each key exactly once, so a duplicate can only come from a
    // value that broke out of its own line, and it always lands BELOW the real
    // one. Keeping the later value handed the forged line the field.
    if (key in fm) continue;
    fm[key] = line.slice(i + 1).trim();
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
    createdAt: parseDate(fm.createdAt),
    updatedAt: parseDate(fm.updatedAt),
  };
}
