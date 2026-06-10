import type { EntityPage } from "./types.js";

function arr(xs: string[]): string {
  return JSON.stringify(xs);
}
function scalar(v: string | null): string {
  return v === null ? "null" : v;
}

/** Render an entity page .md = YAML frontmatter (from the structured entry) + body. */
export function renderEntityMarkdown(entry: EntityPage, body: string): string {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `kind: ${entry.kind}`,
    `scope: ${entry.scope}`,
    `project: ${scalar(entry.project)}`,
    `title: ${entry.title}`,
    `aliases: ${arr(entry.aliases)}`,
    `sourceMemoryIds: ${arr(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr(entry.sourceSessions)}`,
    `sourceFiles: ${arr(entry.sourceFiles)}`,
    `relatedEntities: ${arr(entry.relatedEntities)}`,
    `createdAt: ${entry.createdAt}`,
    `updatedAt: ${entry.updatedAt}`,
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}\n\n# ${entry.title}\n\n${trimmedBody}\n`;
}
