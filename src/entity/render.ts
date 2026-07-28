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
 * fields here are JSON-quoted, which escapes C0 (so a NEWLINE survives as a `\n`
 * ESCAPE and cannot break the line) but NOT DEL/C1 — those arrive raw and are
 * neutralized here, which is why `normalizeEntityPageForWrite` normalizes array
 * elements too (round-37). Everything goes through this ONE safe primitive.
 */
function line(key: string, value: string): string {
  return `${key}: ${neutralizeControlChars(value)}`;
}

/**
 * Normalize a page AT THE WRITE BOUNDARY, so the INDEX row and the rendered
 * `.md` carry the SAME bytes. See the long note on
 * `normalizeMemoryEntryForWrite` — same round-36 flaw, same fix.
 *
 * Entity-specific points:
 *   • `id` DOUBLES AS THE INDEX KEY (`entityKey`) and as the .md filename slug
 *     (`entity-write`'s `entityPath`), so normalizing it here — BEFORE the path
 *     is derived and before `upsertEntity` — is what keeps the key, the stored
 *     `id`, the file name and the rendered `id:` line all in agreement. Leaving
 *     it raw stored a newline-bearing key while the file said `a b`, so a
 *     rebuild produced a DIFFERENT key and the entry silently forked in two.
 *   • Entity ids are NOT refused (unlike memory's): this serializer has always
 *     neutralized every field, and rounds 31/32 established the throw only for
 *     the memory identifier scalars. Neutralizing keeps that contract.
 *   • The ARRAY ELEMENTS are normalized HERE TOO (round-37). Round-36 left them
 *     out, on the reasoning that they are "JSON-encoded, so a control character
 *     survives as a `\n` ESCAPE and round-trips EXACTLY". That is TRUE ONLY FOR
 *     C0: `JSON.stringify` escapes `U+0000`–`U+001F` (plus `"` and `\`) and emits
 *     DEL (`U+007F`) and the C1 range (`U+0080`–`U+009F`) RAW. Those raw
 *     characters then hit `line()`, which replaces them with spaces — so the
 *     rendered page said `a b` while the index kept `a<DEL>b`: exactly the
 *     index-vs-`.md` disagreement round 36 existed to close, still open for one
 *     end of the control-character range. Normalizing at the write boundary
 *     closes it for the WHOLE range; a C0 character is now neutralized rather
 *     than escaped, which is the same one-line-field trade-off the memory
 *     renderer has always made for its arrays.
 */
const ENTITY_SCALAR_FIELDS = ["id", "kind", "scope", "project", "title", "createdAt", "updatedAt"] as const;
const ENTITY_ARRAY_FIELDS = ["aliases", "sourceMemoryIds", "sourceSessions", "sourceFiles", "relatedEntities"] as const;

export function normalizeEntityPageForWrite(entry: EntityPage): EntityPage {
  const e = entry as unknown as Record<string, unknown>;
  for (const k of ENTITY_SCALAR_FIELDS) {
    const v = e[k];
    if (typeof v === "string") e[k] = neutralizeControlChars(v);
  }
  for (const k of ENTITY_ARRAY_FIELDS) {
    const v = e[k];
    if (Array.isArray(v)) e[k] = v.map((x) => (typeof x === "string" ? neutralizeControlChars(x) : x));
  }
  return entry;
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
