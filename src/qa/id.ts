import { createHash } from "node:crypto";

const UNSAFE = /[\\/:*?"'<>|\s.,;!()[\]{}@#$%^&+=`~]+/g;

/** Collapse all whitespace runs (incl. newlines) to single spaces, trim.
 *  REQUIRED on `question` and `answerSummary` before write — the frontmatter
 *  round-trip is line-based, so a multi-line scalar would corrupt parsing. */
export function normalizeSingleLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
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

/** Full stable identity: qa/<project|_global>/<slug>. Scope is baked into the
 *  scope dir, so the same question in a different scope is a different page. */
export function qaId(_scope: string, project: string | null, question: string): string {
  const scopeDir = project ?? "_global";
  return `qa/${scopeDir}/${qaSlug(question)}`;
}
