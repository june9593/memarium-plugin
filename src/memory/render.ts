import type { MemoryEntry } from "./types.js";
import { hasControlChars, neutralizeControlChars } from "./gate.js";

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
 * The archival rewrite gate (`missingRewriteField`, via `isWritableMemoryId`)
 * already rejects such a row before it can reach a writer, on exactly the same
 * character class (both call the shared `hasControlChars`, so the gate and this
 * backstop cannot disagree about what a control character is). This is the
 * defense-in-depth backstop at the serialization boundary EVERY caller shares —
 * notably `applyMemoryItems` (memory-write / memory-approve), which derives the
 * .md path from the id's SLUG and never validated the id as a whole. Refusing
 * (throwing) rather than escaping keeps the document format unchanged for every
 * legitimate entry, and both write paths already roll back cleanly on a throw.
 *
 * SCOPE — the IDENTIFIER-ish scalars only: `id`, `type`, `scope`, `status`,
 * `project`. Those are schema-constrained (an id is `<type>/<project|_global>/
 * <kebab-slug>`, a status is one of four literals, a project is a single path
 * segment), so a control character in them is unambiguously corruption.
 *
 * EVERY OTHER value goes through `valueLine` instead, which NEUTRALIZES rather
 * than refuses — see the round-34 note there. Round-32 left those fields raw on
 * the reasoning that they are free prose; that was wrong, because the damage a
 * poisoned value does lands on a DIFFERENT field, not its own.
 *
 * Round-33 — CONTROL CHARACTERS ONLY, deliberately. This does NOT reject a SPACE
 * or ordinary punctuation, because neither can forge a frontmatter line, and ids
 * legitimately contain spaces: `projectSlugFromPath` does not sanitize, so a
 * checkout at `~/code/my project` produces ids like
 * `semantic/code-my project/some-slug`. The stricter shell-safety predicate
 * (`isSafeMemoryId`) guards a DIFFERENT surface — see the paired note in gate.ts.
 */
function identLine(key: string, value: string): string {
  if (hasControlChars(value)) {
    throw new Error(
      `memory render: refusing to write ${key} containing a control character — ` +
      `it would forge extra frontmatter lines (${JSON.stringify(value)})`,
    );
  }
  return `${key}: ${value}`;
}

/**
 * Emit ONE frontmatter line for a NON-identifier value, neutralized so it cannot
 * inject a second line.
 *
 * SECURITY (round-34). Round-32 scoped the injection defense to the
 * identifier-ish fields and left `title` / `summary` (and, implicitly, the
 * nullable scalars, the numerics, `trust`, and every ARRAY ELEMENT, which are
 * joined onto ONE line) raw — on the reasoning that they are free authored prose
 * and refusing them would break legitimate writes. That reasoning missed the
 * actual attack: frontmatter is a SHARED line-oriented namespace, so the field a
 * poisoned value forges is never itself. `title: "x\nid: semantic/p/other"`
 * emits a SECOND `id:` line below the validated one, and the parser then decides
 * which id the document has. The `id` being perfectly gated bought nothing.
 *
 * So the serialization boundary is now structurally incapable of emitting an
 * injected line for ANY value: the frontmatter block below is built from
 * `identLine` (refuse) and `valueLine` (neutralize) and NOTHING ELSE — do not
 * add a raw template literal back into it.
 *
 * NEUTRALIZE, not refuse, here: prose and free-form reasons are legitimate user
 * content, and a stray control character in them must not hard-fail an unattended
 * digest write. Nothing real is lost — every field this renders is a ONE-LINE
 * field by definition. Arrays are covered by the same single call because `arr`
 * has already joined the elements into this one string.
 *
 * The parser closes the same hole from the other side — it REFUSES any document
 * carrying a duplicate frontmatter key (round-35), which is what a forged line in
 * a legacy .md looks like. Neither layer is load-bearing alone: this one keeps
 * NEW files clean, that one is the backstop for files written before the fix.
 * (Round-34 had the parser pick the FIRST occurrence instead; that was unsound —
 * the keys are emitted in a FIXED ORDER, so a payload in an EARLY field forges
 * its line ABOVE a LATER field's real one and first-wins keeps the FORGERY.)
 */
function valueLine(key: string, value: string): string {
  return `${key}: ${neutralizeControlChars(value)}`;
}

/**
 * Normalize an entry AT THE WRITE BOUNDARY, so the INDEX row and the rendered
 * `.md` carry the SAME bytes.
 *
 * SECURITY (round-36) — the architectural half of the round-32/34 fix. Those
 * rounds hardened the SERIALIZER: `identLine` refuses a control character,
 * `valueLine` neutralizes it. That stops the injection, but it made the two
 * stores DISAGREE, because every write sink persists the ORIGINAL entry object to
 * the index and only the RENDERER saw the normalized value. `title: "a\nb"`
 * therefore rendered (and parsed back) as `a b` while `index.memory.json` kept
 * `a\nb` — so the live index and a rebuild-from-md disagree, recall and lint
 * score a value the file does not contain, and cross-device resolution compares
 * two different strings for the same field.
 *
 * The fix is to normalize ONCE, HERE, and hand the SAME object to both stores.
 * The renderer's own refuse/neutralize stays as a defense-in-depth backstop for
 * any caller that skips this (it must never be the ONLY place normalization
 * happens again).
 *
 * Mutates in place and returns the entry: the write sinks already mutate the
 * entry they persist (`entry.path`, the lifecycle/`updatedAt` normalization in
 * apply.ts), and mutating is what guarantees the index and the renderer cannot
 * be handed different objects.
 *
 * The field split MIRRORS the renderer exactly:
 *   • identifier scalars → THROW (same class as `identLine`, established in
 *     rounds 31/32: schema-constrained, so a control character is corruption);
 *   • every other one-line scalar, and every ARRAY ELEMENT (they are joined onto
 *     ONE line by `arr()`) → NEUTRALIZE, same as `valueLine`.
 * Numerics are not strings and cannot forge a line.
 */
const MEMORY_IDENT_FIELDS = ["id", "type", "scope", "status", "project"] as const;
const MEMORY_VALUE_FIELDS = [
  "title", "summary", "createdAt", "updatedAt", "validFrom", "validTo",
  "supersedes", "originDevice", "archivedAt", "archivedReason", "trust",
] as const;
const MEMORY_ARRAY_FIELDS = ["sourceSessions", "sourceCommits", "sourceFiles", "entities"] as const;

export function normalizeMemoryEntryForWrite(entry: MemoryEntry): MemoryEntry {
  const e = entry as unknown as Record<string, unknown>;
  for (const k of MEMORY_IDENT_FIELDS) {
    const v = e[k];
    if (typeof v === "string" && hasControlChars(v)) {
      throw new Error(
        `memory write: refusing to persist ${k} containing a control character — ` +
        `it would forge extra frontmatter lines (${JSON.stringify(v)})`,
      );
    }
  }
  for (const k of MEMORY_VALUE_FIELDS) {
    const v = e[k];
    if (typeof v === "string") e[k] = neutralizeControlChars(v);
  }
  for (const k of MEMORY_ARRAY_FIELDS) {
    const v = e[k];
    if (Array.isArray(v)) e[k] = v.map((x) => (typeof x === "string" ? neutralizeControlChars(x) : x));
  }
  return entry;
}

/** Render a memory .md = YAML frontmatter (from the structured entry) + body.
 *  Tolerates missing optional fields: authored entries (memory-write / propose)
 *  routinely omit summary / supersedes / validFrom / validTo / originDevice /
 *  the source arrays. apply.ts normalizes the persisted entry; this renderer is
 *  the serialization boundary and must NEVER emit the literal "undefined".
 *
 *  INJECTION (round-34): the frontmatter block is built ONLY from `identLine`
 *  (refuses a control character — identifier fields) and `valueLine`
 *  (neutralizes it — everything else). That is the invariant that makes a
 *  forged second `key:` line impossible; a raw `` `k: ${v}` `` added back here
 *  would silently re-open it. THROWS on a control character in an identifier
 *  scalar — see `identLine`. */
export function renderMemoryMarkdown(entry: MemoryEntry, body: string): string {
  const fm = [
    "---",
    identLine("id", String(entry.id)),
    identLine("type", String(entry.type)),
    identLine("scope", String(entry.scope)),
    identLine("project", nullable(entry.project)),
    valueLine("title", String(entry.title ?? "")),
    valueLine("summary", String(entry.summary ?? "")),
    identLine("status", req(entry.status, "active")),
    valueLine("confidence", req(entry.confidence, "0.5")),
    valueLine("importance", req(entry.importance, "0")),
    valueLine("createdAt", req(entry.createdAt, "")),
    valueLine("updatedAt", req(entry.updatedAt, "")),
    valueLine("validFrom", nullable(entry.validFrom)),
    valueLine("validTo", nullable(entry.validTo)),
    valueLine("supersedes", nullable(entry.supersedes)),
    valueLine("originDevice", nullable(entry.originDevice)),
    valueLine("archivedAt", nullable(entry.archivedAt)),
    valueLine("archivedReason", nullable(entry.archivedReason)),
    valueLine("sourceSessions", arr(entry.sourceSessions)),
    valueLine("sourceCommits", arr(entry.sourceCommits)),
    valueLine("sourceFiles", arr(entry.sourceFiles)),
    valueLine("entities", arr(entry.entities)),
    valueLine("trust", entry.trust ?? "unknown"),
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  // The H1 echoes the title. A newline there cannot forge frontmatter (the block
  // above is already closed, and the parser only reads the FIRST `---` block),
  // but the heading is a one-line construct too — keep it consistent with the
  // `title:` line rather than emitting a broken heading.
  const heading = neutralizeControlChars(String(entry.title ?? ""));
  return `${fm}\n\n# ${heading}\n\n${trimmedBody}\n`;
}
