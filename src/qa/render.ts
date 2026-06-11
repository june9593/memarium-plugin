import type { QaEntry } from "./types.js";

function arr(xs: string[]): string { return JSON.stringify(xs); }
function scalar(v: string | null): string { return v === null ? "null" : v; }

/** Render a qa page .md = YAML frontmatter (from the structured entry) + verbatim body.
 *  `question` / `answerSummary` MUST already be single-line (see qa/id.ts). */
export function renderQaMarkdown(entry: QaEntry, body: string): string {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `scope: ${entry.scope}`,
    `project: ${scalar(entry.project)}`,
    `question: ${entry.question}`,
    `answerSummary: ${entry.answerSummary}`,
    `kind: ${entry.kind}`,
    `tags: ${arr(entry.tags)}`,
    `sources: ${arr(entry.sources)}`,
    `sourceMemoryIds: ${arr(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr(entry.sourceSessions)}`,
    `relatedEntities: ${arr(entry.relatedEntities)}`,
    `createdAt: ${entry.createdAt}`,
    `updatedAt: ${entry.updatedAt}`,
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}\n\n# ${entry.question}\n\n${trimmedBody}\n`;
}
