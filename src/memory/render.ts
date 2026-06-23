import type { MemoryEntry } from "./types.js";

function arr(xs: string[]): string {
  return xs.length === 0 ? "[]" : `[${xs.join(", ")}]`;
}
function scalar(v: string | number | null): string {
  return v === null ? "null" : String(v);
}

/** Render a memory .md = YAML frontmatter (from the structured entry) + body. */
export function renderMemoryMarkdown(entry: MemoryEntry, body: string): string {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `type: ${entry.type}`,
    `scope: ${entry.scope}`,
    `project: ${scalar(entry.project)}`,
    `title: ${entry.title}`,
    `summary: ${entry.summary}`,
    `status: ${entry.status}`,
    `confidence: ${entry.confidence}`,
    `importance: ${entry.importance}`,
    `createdAt: ${entry.createdAt}`,
    `updatedAt: ${entry.updatedAt}`,
    `validFrom: ${scalar(entry.validFrom)}`,
    `validTo: ${scalar(entry.validTo)}`,
    `supersedes: ${scalar(entry.supersedes)}`,
    `originDevice: ${scalar(entry.originDevice)}`,
    `sourceSessions: ${arr(entry.sourceSessions)}`,
    `sourceCommits: ${arr(entry.sourceCommits)}`,
    `sourceFiles: ${arr(entry.sourceFiles)}`,
    `entities: ${arr(entry.entities)}`,
    `trust: ${entry.trust ?? "unknown"}`,
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}\n\n# ${entry.title}\n\n${trimmedBody}\n`;
}
