import { createHash } from "node:crypto";
// Shared with the memory renderer ON PURPOSE — one notion of "a control
// character" across every layer that writes line-oriented frontmatter.
import { neutralizeControlChars } from "../memory/gate.js";

const UNSAFE = /[\\/:*?"'<>|\s.,;!()[\]{}@#$%^&+=`~]+/g;

/** Collapse all whitespace runs (incl. newlines) to single spaces, trim.
 *  REQUIRED on `question` and `answerSummary` before write — the frontmatter
 *  round-trip is line-based, so a multi-line scalar would corrupt parsing.
 *
 *  Round-37: control characters are neutralized FIRST. `\s` does not match DEL
 *  (`U+007F`) or C1 (`U+0080`–`U+009F`), and `JSON.stringify` emits those RAW, so
 *  they used to survive into the rendered page — where `line()` turned them into
 *  spaces, leaving the index and the `.md` disagreeing. Doing it here (rather
 *  than only in `normalizeQaEntryForWrite`) also keeps `qaId` STABLE: the id is
 *  hashed from the canonical question, so it must be derived from the same
 *  neutralized text that gets persisted, or re-writing the entry would fork it
 *  into a second page. */
export function normalizeSingleLine(s: string): string {
  return neutralizeControlChars(s).replace(/\s+/g, " ").trim();
}

function shortHash(canonical: string): string {
  return createHash("sha256").update(canonical).digest("hex").slice(0, 8);
}

/** Deterministic slug: kebab(canonical) prefix + 8-hex sha256(canonical).
 *  Stable across devices; same canonical question → same slug. */
export function qaSlug(question: string): string {
  const canonical = normalizeSingleLine(question).toLowerCase();
  const hash = shortHash(canonical);
  let kebab = canonical.replace(UNSAFE, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  kebab = kebab.slice(0, 48).replace(/-$/, "");
  return kebab ? `${kebab}-${hash}` : `q-${hash}`;
}

/** Stable identity: qa/<project|_global>/<slug>. The scope DIRECTORY (the
 *  project slug, or "_global" for global/user scope) plus the slug determine
 *  the page. global and user scope (both project=null) share the _global
 *  directory, so they map to the same id — by design, mirroring entity pages.
 *  `_scope` is accepted for call-site symmetry with the entity API but does
 *  not affect the id. */
export function qaId(_scope: string, project: string | null, question: string): string {
  const scopeDir = project ?? "_global";
  return `qa/${scopeDir}/${qaSlug(question)}`;
}
