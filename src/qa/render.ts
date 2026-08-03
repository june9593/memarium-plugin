import type { QaEntry } from "./types.js";
// Shared with the memory renderer ON PURPOSE — same line-oriented frontmatter
// format, so the same notion of a control character (round-34).
import { neutralizeControlChars } from "../memory/gate.js";

function arr(xs: string[] | undefined): string { return JSON.stringify(xs ?? []); }
/** Required scalar with a fallback so an omitted field never serializes the
 *  literal "undefined" (#54 — `JSON.stringify(undefined)` returns undefined,
 *  which template-interpolates to "undefined"). */
function req(v: string | null | undefined, fallback: string): string {
  return v == null || v === "" ? fallback : String(v);
}

/**
 * Emit ONE frontmatter line, neutralized so the value cannot inject a second one.
 *
 * SECURITY (round-34, same class of bug as the memory renderer's): a NEWLINE in a
 * RAW scalar forges EXTRA FIELDS rather than a weird value. `question` /
 * `answerSummary` / `project` / the arrays were already JSON-quoted here (a
 * NEWLINE survives as a `\n` ESCAPE, which cannot break the line) — that is
 * exactly the precedent this fix generalizes; `id` / `scope` / `kind` / the dates
 * were still raw. Everything now goes through one safe emitter. (JSON quoting
 * escapes C0 ONLY; DEL/C1 arrive here raw and are neutralized — see the round-37
 * note on `normalizeQaEntryForWrite`.)
 */
function line(key: string, value: string): string {
  return `${key}: ${neutralizeControlChars(value)}`;
}

/**
 * Normalize an entry AT THE WRITE BOUNDARY, so the INDEX row and the rendered
 * `.md` carry the SAME bytes. See the long note on
 * `normalizeMemoryEntryForWrite` — same round-36 flaw, same fix.
 *
 * The field that first exposed it is `updatedAt`: qa-write only checks its
 * `YYYY-MM-DD` PREFIX, so `"2026-06-11\nid: forged"` passed the date check,
 * rendered as `2026-06-11 id: forged`, and stayed newline-bearing in the index.
 * `id` doubles as the INDEX KEY (`qaKey`) and the filename slug, so it is
 * normalized here too even though `qaId` already derives it from a
 * single-lined question.
 *
 * ROUND-37 — the JSON-ENCODED fields (`question`, `answerSummary`, `project` and
 * every array) are normalized here as well. Round-36 deliberately excluded them,
 * reasoning that "a control character survives as a `\n` ESCAPE and round-trips
 * EXACTLY"; that holds for C0 ONLY. `JSON.stringify` escapes `U+0000`–`U+001F`
 * (plus `"` and `\`) and emits DEL (`U+007F`) and C1 (`U+0080`–`U+009F`) RAW —
 * and `line()` then replaces those with spaces, so the page said `a b` while the
 * index kept the raw value: the very index-vs-`.md` disagreement round 36 was
 * written to close, left open for one end of the control-character range.
 * Normalizing here closes it for the WHOLE range. (`question` /
 * `answerSummary` are additionally collapsed to one line by `normalizeSingleLine`
 * in qa-write, which neutralizes control characters BEFORE `qaId` hashes the
 * question — so the derived id is stable for the same neutralized text.)
 */
const QA_SCALAR_FIELDS = [
  "id", "scope", "kind", "createdAt", "updatedAt", "question", "answerSummary", "project",
] as const;
const QA_ARRAY_FIELDS = ["tags", "sources", "sourceMemoryIds", "sourceSessions", "relatedEntities"] as const;

export function normalizeQaEntryForWrite(entry: QaEntry): QaEntry {
  const e = entry as unknown as Record<string, unknown>;
  for (const k of QA_SCALAR_FIELDS) {
    const v = e[k];
    if (typeof v === "string") e[k] = neutralizeControlChars(v);
  }
  for (const k of QA_ARRAY_FIELDS) {
    const v = e[k];
    if (Array.isArray(v)) e[k] = v.map((x) => (typeof x === "string" ? neutralizeControlChars(x) : x));
  }
  return entry;
}

/** Render a qa page .md = YAML frontmatter (from the structured entry) + verbatim body.
 *  `question` / `answerSummary` MUST already be single-line (see qa/id.ts).
 *  The frontmatter block is built from `line()` and nothing else — do not add a
 *  raw template literal back into it (round-34). */
export function renderQaMarkdown(entry: QaEntry, body: string): string {
  const fm = [
    "---",
    line("id", String(entry.id)),
    line("scope", String(entry.scope)),
    line("project", entry.project == null ? "null" : JSON.stringify(entry.project)),
    line("question", JSON.stringify(entry.question ?? "")),
    line("answerSummary", JSON.stringify(entry.answerSummary ?? "")),
    line("kind", String(entry.kind)),
    line("tags", arr(entry.tags)),
    line("sources", arr(entry.sources)),
    line("sourceMemoryIds", arr(entry.sourceMemoryIds)),
    line("sourceSessions", arr(entry.sourceSessions)),
    line("relatedEntities", arr(entry.relatedEntities)),
    line("createdAt", req(entry.createdAt, "")),
    line("updatedAt", req(entry.updatedAt, "")),
    "---",
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  // The H1 echoes the question; a heading is a one-line construct too.
  return `${fm}\n\n# ${neutralizeControlChars(String(entry.question ?? ""))}\n\n${trimmedBody}\n`;
}
