import type { EntityPage } from "./types.js";
// Shared with the memory renderer ON PURPOSE: the two serializers write the same
// line-oriented frontmatter format, so they must agree on what a control
// character is (see the round-34 note on `neutralizeControlChars`).
import { neutralizeControlChars } from "../memory/gate.js";

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

/**
 * Emit ONE frontmatter line, neutralized so the value cannot inject a second one.
 *
 * SECURITY (round-34, same class of bug as the memory renderer's): this
 * frontmatter is LINE-ORIENTED `key: value` text and `parseEntityMarkdown` reads
 * it back the same way, so a NEWLINE inside a raw scalar does not produce a weird
 * value — it produces EXTRA FIELDS. Entity titles/ids come out of digested
 * sessions (memory poisoning is in this project's threat model), so a `title`
 * carrying `\nid: entity/other/x` would forge the page's identity. The array
 * fields here are already JSON-quoted (control characters survive as `\n`
 * ESCAPES, which cannot break the line), but they go through the same emitter so
 * the block is provably built from ONE safe primitive.
 */
function line(key: string, value: string): string {
  return `${key}: ${neutralizeControlChars(value)}`;
}

/** Render an entity page .md = YAML frontmatter (from the structured entry) + body.
 *  The frontmatter block is built from `line()` and nothing else — do not add a
 *  raw template literal back into it (round-34). */
export function renderEntityMarkdown(entry: EntityPage, body: string): string {
  const fm = [
    "---",
    line("id", String(entry.id)),
    line("kind", String(entry.kind)),
    line("scope", String(entry.scope)),
    line("project", nullable(entry.project)),
    line("title", String(entry.title ?? "")),
    line("aliases", arr(entry.aliases)),
    line("sourceMemoryIds", arr(entry.sourceMemoryIds)),
    line("sourceSessions", arr(entry.sourceSessions)),
    line("sourceFiles", arr(entry.sourceFiles)),
    line("relatedEntities", arr(entry.relatedEntities)),
    line("createdAt", req(entry.createdAt, "")),
    line("updatedAt", req(entry.updatedAt, "")),
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  // The H1 echoes the title; a heading is a one-line construct too.
  return `${fm}\n\n# ${neutralizeControlChars(String(entry.title ?? ""))}\n\n${trimmedBody}\n`;
}
