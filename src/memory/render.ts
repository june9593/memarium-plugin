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
 *  literal "undefined". Also NaN/Infinity-safe: a non-finite number would
 *  otherwise `String()` to "NaN"/"Infinity" — invalid numeric frontmatter. */
function req(v: string | number | null | undefined, fallback: string): string {
  if (v == null || v === "") return fallback;
  if (typeof v === "number" && !Number.isFinite(v)) return fallback;
  return String(v);
}

/** ASCII control characters, including `\n` and `\r`. */
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;

/**
 * Emit ONE frontmatter line, refusing a value that would break out of it.
 *
 * SECURITY (round-32). This frontmatter block is LINE-ORIENTED `key: value`
 * text, and `parseMemoryMarkdown` reads it back the same way — so a NEWLINE
 * inside a scalar does not produce a weird value, it produces EXTRA FIELDS. An
 * id of `semantic/p\nstatus: active` writes a real `status: active` line into the
 * document, silently un-archiving the entry (or forging any other field). Memory
 * ids/types/scopes originate in digested sessions, so a poisoned value is in this
 * project's threat model, and the metadata-only rewriters run UNATTENDED from
 * digest consolidation.
 *
 * The archival rewrite gate (`missingRewriteField`, via `isSafeMemoryId`) already
 * rejects such a row before it can reach a writer. This is the defense-in-depth
 * backstop at the serialization boundary EVERY caller shares — notably
 * `applyMemoryItems` (memory-write / memory-approve), which derives the .md path
 * from the id's SLUG and never validated the id as a whole. Refusing (throwing)
 * rather than escaping keeps the document format unchanged for every legitimate
 * entry, and both write paths already roll back cleanly on a throw.
 *
 * SCOPE — the IDENTIFIER-ish scalars only: `id`, `type`, `scope`, `status`,
 * `project`. Those are schema-constrained (an id is `<type>/<project|_global>/
 * <kebab-slug>`, a status is one of four literals, a project is a single path
 * segment), so a control character in them is unambiguously corruption. `title`
 * and `summary` are free authored prose: refusing or rewriting them here would
 * change behavior for legitimate content, so they are deliberately left as-is.
 */
function identLine(key: string, value: string): string {
  if (CONTROL_CHAR_RE.test(value)) {
    throw new Error(
      `memory render: refusing to write ${key} containing a control character — ` +
      `it would forge extra frontmatter lines (${JSON.stringify(value)})`,
    );
  }
  return `${key}: ${value}`;
}

/** Render a memory .md = YAML frontmatter (from the structured entry) + body.
 *  Tolerates missing optional fields: authored entries (memory-write / propose)
 *  routinely omit summary / supersedes / validFrom / validTo / originDevice /
 *  the source arrays. apply.ts normalizes the persisted entry; this renderer is
 *  the serialization boundary and must NEVER emit the literal "undefined".
 *
 *  THROWS on a control character in an identifier scalar — see `identLine`. */
export function renderMemoryMarkdown(entry: MemoryEntry, body: string): string {
  const fm = [
    "---",
    identLine("id", String(entry.id)),
    identLine("type", String(entry.type)),
    identLine("scope", String(entry.scope)),
    identLine("project", nullable(entry.project)),
    `title: ${entry.title}`,
    `summary: ${entry.summary ?? ""}`,
    identLine("status", req(entry.status, "active")),
    `confidence: ${req(entry.confidence, "0.5")}`,
    `importance: ${req(entry.importance, "0")}`,
    `createdAt: ${req(entry.createdAt, "")}`,
    `updatedAt: ${req(entry.updatedAt, "")}`,
    `validFrom: ${nullable(entry.validFrom)}`,
    `validTo: ${nullable(entry.validTo)}`,
    `supersedes: ${nullable(entry.supersedes)}`,
    `originDevice: ${nullable(entry.originDevice)}`,
    `archivedAt: ${nullable(entry.archivedAt)}`,
    `archivedReason: ${nullable(entry.archivedReason)}`,
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
