import type { EntityPage } from "./types.js";

function arr(xs: string[] | undefined): string {
  return JSON.stringify(xs ?? []);
}
/** Nullable scalar → YAML `null` for unset (null OR undefined), never the string
 *  "undefined" (#54). */
function nullable(v: string | null | undefined): string {
  return v == null ? "null" : v;
}
/** Required scalar with a fallback so an omitted field never serializes "undefined". */
function req(v: string | null | undefined, fallback: string): string {
  return v == null || v === "" ? fallback : String(v);
}

/** Render an entity page .md = YAML frontmatter (from the structured entry) + body. */
export function renderEntityMarkdown(entry: EntityPage, body: string): string {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `kind: ${entry.kind}`,
    `scope: ${entry.scope}`,
    `project: ${nullable(entry.project)}`,
    `title: ${entry.title}`,
    `aliases: ${arr(entry.aliases)}`,
    `sourceMemoryIds: ${arr(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr(entry.sourceSessions)}`,
    `sourceFiles: ${arr(entry.sourceFiles)}`,
    `relatedEntities: ${arr(entry.relatedEntities)}`,
    `createdAt: ${req(entry.createdAt, "")}`,
    `updatedAt: ${req(entry.updatedAt, "")}`,
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}\n\n# ${entry.title}\n\n${trimmedBody}\n`;
}
