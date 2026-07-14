/**
 * One-time self-heal for the pre-#54 renderer bug, where unset optional fields
 * were serialized as the literal string `undefined` in md frontmatter
 * (`supersedes: undefined`, `validTo: undefined`, `status: undefined`, …).
 *
 * Operates ONLY on the frontmatter block (between the first `---` pair) and
 * leaves the body byte-identical, so it can never corrupt memory content.
 * Returns the healed md when it changed a line, else `null` (so callers only
 * rewrite files that actually carry the bug — clean files see zero churn).
 *
 * `fallbackDate` (YYYY-MM-DD, typically the file's mtime) backfills
 * `createdAt`/`updatedAt` when they were the literal "undefined"/"null", so a
 * legacy entry lints clean instead of tripping `malformed-date`. (A field with
 * no line at all can't be matched — this is a literal-only migration.)
 */
export function healUndefinedFrontmatter(md: string, fallbackDate: string): string | null {
  const m = md.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!m) return null;
  const before = m[2];
  const after = before
    // nullable scalars → the YAML `null` literal
    .replace(/^(project|validFrom|validTo|supersedes|originDevice|relatedTo): undefined[ \t]*$/gm, "$1: null")
    // lifecycle status → active
    .replace(/^status: undefined[ \t]*$/gm, "status: active")
    // numeric fields: a legacy "undefined"/"null" becomes NaN in the rebuilt
    // index and poisons the scorer. Use the SAME defaults as render/parse/apply
    // (the original value is unrecoverable): confidence → 0.5 (neutral),
    // importance → 0.
    .replace(/^confidence:[ \t]*(?:undefined|null)[ \t]*$/gm, "confidence: 0.5")
    .replace(/^importance:[ \t]*(?:undefined|null)[ \t]*$/gm, "importance: 0")
    // dates: ONLY the literal undefined/null → the fallback date. A real date
    // never matches; a legitimately-empty date from a fresh 0.19.x write is NOT
    // treated as legacy corruption (that would rewrite fresh files, #55).
    .replace(/^(createdAt|updatedAt):[ \t]*(?:undefined|null)[ \t]*$/gm, `$1: ${fallbackDate}`);
  if (after === before) return null;
  return m[1] + after + m[3] + md.slice(m[0].length);
}
