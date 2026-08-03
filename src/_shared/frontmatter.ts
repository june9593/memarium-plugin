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

/**
 * SECURITY — WHY A TRUNCATED BLOCK ALSO REJECTS THE DOCUMENT (round-36).
 *
 * The duplicate-key rule above only fires when the forged line names a key the
 * REAL block also carries. A legacy value can dodge it entirely by injecting a
 * standalone `---` instead of a `key: value` line: the frontmatter match below is
 * NON-GREEDY, so it accepts that injected line as the CLOSING delimiter and stops
 * there. Everything the renderer emitted AFTER the payload — including the real
 * `status: archived` — falls OUTSIDE the block and is never seen. There are no
 * duplicate keys (each key still appears at most once in the truncated block), so
 * round-34/35 never fires, and every truncated-away field silently takes its
 * PARSE DEFAULT. For `status` that default is `active`: the entry is UN-ARCHIVED.
 *
 *     ---
 *     id: semantic/p/e
 *     type: semantic
 *     scope: global
 *     project: null
 *     title: x
 *     ---            <- injected by the legacy `title` value `x\n---`
 *     summary: s
 *     status: archived
 *     ...
 *     ---            <- the renderer's REAL closing delimiter
 *
 *     # x ---
 *
 * What makes this decidable is that all three serializers emit a FIXED SHAPE:
 *
 *     ---\n<frontmatter>\n---\n\n# <heading>\n\n<body>
 *
 * so in a genuine document the region between the opening `---` and the FIRST
 * `# ` heading contains EXACTLY ONE standalone `---`, and that one is
 * immediately followed by a blank line and then the heading. A truncating
 * payload breaks that shape: it either leaves TWO `---` before the heading (the
 * injected one plus the real one, as above), or drags a `# ` heading up INSIDE
 * the block, or leaves stranded `key: value` lines where the blank line + H1
 * belong. Any of those ⇒ refuse the document.
 *
 * A `---` in the BODY (after the `# ` heading) is an ordinary markdown horizontal
 * rule and is deliberately untouched by this rule — bodies are free prose.
 *
 * DOCUMENTS WITH NO `# ` HEADING AT ALL are exempt: nothing our serializers write
 * lacks one (a scan of the live store found 228/228 conforming), but hand-authored
 * and hand-built fixture `.md` sometimes stop at the frontmatter, and refusing
 * those would be a read-path regression with no attacker on the other end. The
 * cost of the exemption is that the check does not cover a legacy document that
 * has no heading — an accepted, documented gap.
 *
 * RESIDUAL: a payload that reproduces the shape exactly — `value\n---\n\n# x` —
 * still truncates undetectably here. That variant is out of reach of any
 * structural rule (the attacker controls every byte of the region), and it is
 * covered from the other side: the round-32/34 serializers can no longer emit a
 * control character into frontmatter at all, so no NEW file can carry one.
 */
// An H1 line: `# <heading>`, and also the degenerate `# ` / `#` an EMPTY title
// renders as (a trailing-whitespace-trimming editor turns the former into the
// latter). `## x` is deliberately NOT an H1 — the serializers always emit `# `.
const H1_LINE = /^#(?: |$)/;

/** Parsed frontmatter, or `null` when the document has no frontmatter block,
 *  carries a duplicate key, or has a TRUNCATED/injected block (corruption /
 *  injection — see the notes above). */
export function readFrontmatterBlock(md: string): Record<string, string> | null {
  const text = md.replace(/\r\n/g, "\n"); // CRLF-safe (Windows checkouts)
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;

  const lines = text.split("\n");
  // Line index of the closing `---` the NON-GREEDY match accepted: lines[0] is
  // the opening delimiter and m[1] is everything strictly between the two.
  const close = 1 + m[1].split("\n").length;
  const headingIdx = lines.findIndex((l) => H1_LINE.test(l));
  if (headingIdx !== -1) {
    // (a) exactly one standalone `---` between the opening delimiter and the H1
    let delimiters = 0;
    for (let i = 1; i < headingIdx; i++) if (lines[i] === "---") delimiters++;
    if (delimiters !== 1) return null;
    // (b) ...and the block closes in the exact shape every renderer emits
    if (lines[close] !== "---" || lines[close + 1] !== "" || headingIdx !== close + 2) return null;
  }

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
