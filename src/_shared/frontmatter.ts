/**
 * The ONE frontmatter reader shared by the memory / qa / entity parsers.
 *
 * All three `.md` formats are the same construct: a leading `---` block of
 * LINE-ORIENTED `key: value` pairs, emitted by a renderer that writes each key
 * EXACTLY ONCE in a fixed order. Keeping the three copies of this loop in sync by
 * hand is how the round-34 mistake below got made in triplicate, so there is now
 * one implementation.
 *
 * SECURITY — WHY A DUPLICATE KEY REJECTS THE WHOLE DOCUMENT (round-35).
 *
 * A newline inside a frontmatter value does not corrupt that value, it forges an
 * EXTRA FIELD: `title: "x\nstatus: active"` writes a real `status: active` line
 * into the document. The serializers are now structurally incapable of emitting
 * one (control characters are refused in identifier scalars and neutralized
 * everywhere else — see render.ts), but `.md` written BEFORE that fix can still
 * carry a forged line, so the parser needs its own answer.
 *
 * Round-34's answer was "the FIRST occurrence wins", justified by the claim that
 * a forged line always lands BELOW the real one. That claim is false. The
 * renderer emits the keys in a FIXED ORDER, so a payload carried by an EARLY
 * field forges its line ABOVE the real line of any LATER field:
 *
 *     title: x
 *     status: active     <- forged, from the newline inside `title`
 *     summary: s
 *     status: archived   <- the renderer's real line
 *
 * First-wins keeps `active` — it silently un-archives the entry, which is exactly
 * the attack the rule was supposed to stop. (The round-34 test only passed
 * because its payload targeted `id`, the field the renderer happens to emit
 * first.) Last-wins fails symmetrically for late-emitted targets. POSITION CANNOT
 * DISTINGUISH forged from legitimate, because the winning position depends on
 * which field carried the payload versus which field was targeted — the parser
 * has no way to know either.
 *
 * What IS decidable: the renderer emits one line per key, so a REPEATED key is,
 * by construction, corruption or injection. Never legitimate. So refuse the
 * document rather than choose between the occurrences.
 *
 * REFUSE = RETURN NULL, NOT THROW. These parsers run on READ paths (index
 * rebuild, and through it recall), which must degrade rather than crash: one
 * corrupt file must never take down the whole store. Every caller already treats
 * `null` as "unparseable, skip this file", so a rejection needs no new handling.
 */

/** Parsed frontmatter, or `null` when the document has no frontmatter block or
 *  carries a duplicate key (corruption / injection — see the note above). */
export function readFrontmatterBlock(md: string): Record<string, string> | null {
  const m = md.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---/); // CRLF-safe (Windows checkouts)
  if (!m) return null;
  // Null-prototype map: frontmatter keys are UNTRUSTED, so a key named
  // `__proto__` / `constructor` must be an ordinary entry here, not a reach into
  // Object.prototype (and `key in fm` below must answer about THIS document only).
  const fm: Record<string, string> = Object.create(null);
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    if (key in fm) return null; // duplicate key → refuse the document
    fm[key] = line.slice(i + 1).trim();
  }
  return fm;
}
