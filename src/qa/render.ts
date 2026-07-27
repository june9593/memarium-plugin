import type { QaEntry } from "./types.js";
// Shared with the memory renderer ON PURPOSE — same line-oriented frontmatter
// format, so the same notion of a control character (round-34).
import { neutralizeControlChars } from "../memory/gate.js";

function arr(xs: string[] | undefined): string { return JSON.stringify(xs ?? []); }
/** Required scalar with a fallback so an omitted field never serializes the
 *  literal "undefined" (#54 — `JSON.stringify(undefined)` returns undefined,
 *  which template-interpolates to "undefined"). */
function req(v: string | null | undefined, fallback: string): string {
  return v == null || v === "" ? fallback : String(v);
}

/**
 * Emit ONE frontmatter line, neutralized so the value cannot inject a second one.
 *
 * SECURITY (round-34, same class of bug as the memory renderer's): a NEWLINE in a
 * RAW scalar forges EXTRA FIELDS rather than a weird value. `question` /
 * `answerSummary` / `project` / the arrays were already JSON-quoted here (a
 * control character survives as a `\n` ESCAPE, which cannot break the line) —
 * that is exactly the precedent this fix generalizes; `id` / `scope` / `kind` /
 * the dates were still raw. Everything now goes through one safe emitter.
 */
function line(key: string, value: string): string {
  return `${key}: ${neutralizeControlChars(value)}`;
}

/** Render a qa page .md = YAML frontmatter (from the structured entry) + verbatim body.
 *  `question` / `answerSummary` MUST already be single-line (see qa/id.ts).
 *  The frontmatter block is built from `line()` and nothing else — do not add a
 *  raw template literal back into it (round-34). */
export function renderQaMarkdown(entry: QaEntry, body: string): string {
  const fm = [
    "---",
    line("id", String(entry.id)),
    line("scope", String(entry.scope)),
    line("project", entry.project == null ? "null" : JSON.stringify(entry.project)),
    line("question", JSON.stringify(entry.question ?? "")),
    line("answerSummary", JSON.stringify(entry.answerSummary ?? "")),
    line("kind", String(entry.kind)),
    line("tags", arr(entry.tags)),
    line("sources", arr(entry.sources)),
    line("sourceMemoryIds", arr(entry.sourceMemoryIds)),
    line("sourceSessions", arr(entry.sourceSessions)),
    line("relatedEntities", arr(entry.relatedEntities)),
    line("createdAt", req(entry.createdAt, "")),
    line("updatedAt", req(entry.updatedAt, "")),
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  // The H1 echoes the question; a heading is a one-line construct too.
  return `${fm}\n\n# ${neutralizeControlChars(String(entry.question ?? ""))}\n\n${trimmedBody}\n`;
}
