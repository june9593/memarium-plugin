import type { MemoryEntry } from "./types.js";

function arr(xs: string[] | undefined): string {
  const a = xs ?? [];
  return a.length === 0 ? "[]" : `[${a.join(", ")}]`;
}
/** Nullable frontmatter scalar: unset (null OR undefined) → the YAML literal
 *  `null`, never the string "undefined". `== null` deliberately catches both —
 *  the old `=== null` let `undefined` fall through to `String(undefined)` =
 *  "undefined", which parse then read back as a real id/date (#54). */
function nullable(v: string | number | null | undefined): string {
  return v == null ? "null" : String(v);
}
/** Required scalar with a fallback, so an omitted field never serializes as the
 *  literal "undefined". */
function req(v: string | number | null | undefined, fallback: string): string {
  return v == null || v === "" ? fallback : String(v);
}

/** Render a memory .md = YAML frontmatter (from the structured entry) + body.
 *  Tolerates missing optional fields: authored entries (memory-write / propose)
 *  routinely omit summary / supersedes / validFrom / validTo / originDevice /
 *  the source arrays. apply.ts normalizes the persisted entry; this renderer is
 *  the serialization boundary and must NEVER emit the literal "undefined". */
export function renderMemoryMarkdown(entry: MemoryEntry, body: string): string {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `type: ${entry.type}`,
    `scope: ${entry.scope}`,
    `project: ${nullable(entry.project)}`,
    `title: ${entry.title}`,
    `summary: ${entry.summary ?? ""}`,
    `status: ${req(entry.status, "active")}`,
    `confidence: ${req(entry.confidence, "0")}`,
    `importance: ${req(entry.importance, "0")}`,
    `createdAt: ${req(entry.createdAt, "")}`,
    `updatedAt: ${req(entry.updatedAt, "")}`,
    `validFrom: ${nullable(entry.validFrom)}`,
    `validTo: ${nullable(entry.validTo)}`,
    `supersedes: ${nullable(entry.supersedes)}`,
    `originDevice: ${nullable(entry.originDevice)}`,
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
