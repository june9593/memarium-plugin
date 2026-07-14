import type { QaEntry } from "./types.js";

function arr(xs: string[]): string { return JSON.stringify(xs); }
/** Required scalar with a fallback so an omitted field never serializes the
 *  literal "undefined" (#54 — `JSON.stringify(undefined)` returns undefined,
 *  which template-interpolates to "undefined"). */
function req(v: string | null | undefined, fallback: string): string {
  return v == null || v === "" ? fallback : String(v);
}

/** Render a qa page .md = YAML frontmatter (from the structured entry) + verbatim body.
 *  `question` / `answerSummary` MUST already be single-line (see qa/id.ts). */
export function renderQaMarkdown(entry: QaEntry, body: string): string {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `scope: ${entry.scope}`,
    `project: ${entry.project == null ? "null" : JSON.stringify(entry.project)}`,
    `question: ${JSON.stringify(entry.question)}`,
    `answerSummary: ${JSON.stringify(entry.answerSummary)}`,
    `kind: ${entry.kind}`,
    `tags: ${arr(entry.tags)}`,
    `sources: ${arr(entry.sources)}`,
    `sourceMemoryIds: ${arr(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr(entry.sourceSessions)}`,
    `relatedEntities: ${arr(entry.relatedEntities)}`,
    `createdAt: ${req(entry.createdAt, "")}`,
    `updatedAt: ${req(entry.updatedAt, "")}`,
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}\n\n# ${entry.question}\n\n${trimmedBody}\n`;
}
