import type { MemoryEntry, MemoryIndex, MemoryType } from "./types.js";

const MEMORY_TYPES: ReadonlySet<MemoryType> = new Set<MemoryType>([
  "core", "semantic", "episodic", "procedural",
]);

/** A memory is "gated" if it shapes long-term agent behavior: core, procedural,
 *  or anything explicitly pinned. Rule-type semantic is gated by pinning it. */
export function isGated(e: MemoryEntry | undefined | null): boolean {
  if (!e || typeof e !== "object") return false;
  return e.type === "core" || e.type === "procedural" || e.status === "pinned";
}

/** The id this change supersedes, or null. Treats a non-string OR empty string
 *  as "no supersede target" so an empty value can't ripple into invalid
 *  targetKeys / proposal ids / paths. */
export function supersedesId(entry: MemoryEntry): string | null {
  return typeof entry.supersedes === "string" && entry.supersedes.length > 0 ? entry.supersedes : null;
}

/** True iff this change raises an EXISTING live entry's trust up to "trusted"
 *  from a lower trust (untrusted / unknown / absent). Promoting a memory into the
 *  auto-injected primer is a trust decision that must go through human review
 *  (#23, decision #4) — it can't be done with a plain `memory-write`. A brand-new
 *  trusted entry (no live predecessor) is NOT an elevation, and downgrades are free. */
export function isTrustElevation(entry: MemoryEntry, live: MemoryIndex["entries"]): boolean {
  if ((entry.trust ?? "unknown") !== "trusted") return false;
  const prev = live[entry.id];
  if (!prev) return false; // brand-new entry — not an elevation of anything
  return (prev.trust ?? "unknown") !== "trusted";
}

/** Gate the *change*, not just the proposed entry: the proposed entry, the live
 *  entry it overwrites in place, and the live entry it supersedes are all
 *  considered. Closes the supersede-bypass (a non-gated entry that supersedes a
 *  gated one would silently flip the gated entry to superseded via memory-write). */
export function isGatedChange(entry: MemoryEntry, live: MemoryIndex["entries"]): boolean {
  if (isGated(entry)) return true;
  if (isGated(live[entry.id])) return true;
  const sup = supersedesId(entry);
  if (sup && isGated(live[sup])) return true;
  if (isTrustElevation(entry, live)) return true; // promoting to trusted needs review
  return false;
}

/** The live memory a change lands on / mutates. Replace targets the superseded
 *  memory; create/update target the entry's own id. */
export function targetKey(entry: MemoryEntry): string {
  return supersedesId(entry) ?? entry.id;
}

export type MemoryAction = "create" | "update" | "replace";

/** Re-derived from the live index (authoritative) for display in proposals/diffs. */
export function deriveAction(entry: MemoryEntry, live: MemoryIndex["entries"]): MemoryAction {
  const sup = supersedesId(entry);
  if (sup && live[sup]) return "replace";
  if (live[entry.id]) return "update";
  return "create";
}

/** True iff `seg` is a single safe path segment (non-empty, no separators, no
 *  `.`/`..`, no NUL) — i.e. it can't traverse out of its intended directory. */
export function isSafePathSegment(seg: string): boolean {
  return seg.length > 0 && seg !== "." && !seg.includes("/") && !seg.includes("\\") && !seg.includes("..") && !seg.includes("\0");
}

/** Throwing variant used to build canonical paths. */
function safeSegment(seg: string, label: string): string {
  if (!isSafePathSegment(seg)) {
    throw new Error(`memory path: unsafe ${label} segment ${JSON.stringify(seg)}`);
  }
  return seg;
}

/** The ONLY character class a memory id may use: letters, digits, `.`, `_`, `-`,
 *  and `/` as the SEGMENT SEPARATOR (never leading, trailing or doubled). It
 *  deliberately excludes ALL whitespace and every shell metacharacter — `;`,
 *  `&`, `|`, `$`, backtick, quotes, parens, braces, redirects, newline, glob. */
const SAFE_MEMORY_ID_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

/** Ids are `<type>/<project|_global>/<kebab-slug>` — nowhere near this long.
 *  A cap keeps a poisoned index row from producing an unreadable hint line. */
const MAX_MEMORY_ID_LENGTH = 256;

/**
 * True iff `id` matches the CANONICAL memory-id shape strictly enough that it is
 * safe to render into text that looks like — or becomes — a shell command.
 *
 * Round-28 (SECURITY): memory ids are UNTRUSTED. They are read verbatim out of
 * the lenient memory index, and memory content originates from digested sessions,
 * so memory POISONING is explicitly in this project's threat model (it is why the
 * v4 review gate exists). Anything that renders an id into an executable-looking
 * instruction — the R2 cold-storage restore hint, above all — must gate on this
 * first, because a hint like `memory-unarchive <id>` is copy-pasted by humans and
 * acted on by agents: an id carrying `; rm -rf ~` or `$(curl … | sh)` is command
 * injection BY SUGGESTION. Character-class allowlist, not a metacharacter
 * denylist, so a shell syntax we didn't think of can't slip through.
 *
 * NOT a schema check: `parse`/`lint` decide what a WELL-FORMED entry is. This
 * answers the narrower question "may this string be interpolated into a command?"
 *
 * NOT THE WRITE GATE either — that is `isWritableMemoryId` below, and the two
 * are DELIBERATELY DIFFERENT. Do not "unify" them (round-32 did, and it broke
 * every project whose directory name contains a SPACE); the paired note on
 * `isWritableMemoryId` explains why one predicate cannot serve both.
 */
export function isSafeMemoryId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > MAX_MEMORY_ID_LENGTH) return false;
  if (!SAFE_MEMORY_ID_RE.test(id)) return false;
  // Reuse the path-segment rule so a "safe id" can also never traverse (`.`/`..`)
  // — ids are turned into file paths elsewhere, and the two must not disagree.
  return id.split("/").every(isSafePathSegment);
}

/** ASCII control characters: the C0 range (NUL, TAB, LF, CR, …), DEL, and the
 *  C1 range. These — and ONLY these — can break a value out of a LINE-ORIENTED
 *  `key: value` frontmatter scalar. Spaces and ordinary punctuation cannot. */
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F-\u009F]/;

/** The SAME character class, global, derived from `CONTROL_CHAR_RE.source` so the
 *  detector and the neutralizer can never disagree about what a control character
 *  is. (They cannot be ONE object: a `/g` regex is stateful under `.test()`.) */
const CONTROL_CHAR_RE_GLOBAL = new RegExp(CONTROL_CHAR_RE.source, "g");

/** True iff `s` carries any ASCII control character. Shared by the rewrite gate
 *  (`isWritableMemoryId`) and the renderer's `identLine` backstop, so the two
 *  layers of the same defense cannot disagree about what a control character is. */
export function hasControlChars(s: string): boolean {
  return CONTROL_CHAR_RE.test(s);
}

/**
 * Make a string SAFE to write as ONE line-oriented `key: value` frontmatter
 * scalar: every ASCII control character becomes a single space, so the value
 * cannot end its own line and open another one.
 *
 * The NON-THROWING counterpart to the renderer's `identLine` refusal (round-34).
 * Identifier-ish fields (id/type/scope/status/project) are schema-constrained, so
 * a control character in them is unambiguous corruption and refusing is right.
 * Everything else a memory .md carries — free authored prose (`title`/`summary`),
 * the nullable scalars, the array elements — is legitimate user content, and
 * hard-failing an entire write over a stray control character in prose would be
 * worse than this normalization. It is lossless for every real value: these are
 * ONE-LINE fields by definition.
 */
export function neutralizeControlChars(s: string): string {
  return s.replace(CONTROL_CHAR_RE_GLOBAL, " ");
}

/**
 * True iff `id` is safe to WRITE: to serialize into a memory `.md` and to derive
 * that file's path from. This is the predicate the archival rewrite gate
 * (`missingRewriteField`, apply.ts) uses.
 *
 * DELIBERATELY WEAKER THAN `isSafeMemoryId`, BECAUSE THE THREAT MODEL IS
 * DIFFERENT. Round-32 made the rewrite gate call `isSafeMemoryId` "so the two
 * notions of a safe id cannot drift" — that was wrong, and it is the mistake
 * this pairing exists to prevent a second time:
 *
 *   - `isSafeMemoryId` guards RENDERING A SHELL COMMAND (round-28: the cold
 *     restore hint `memory-unarchive <id>`, copy-pasted by humans, run by
 *     agents). It must reject shell metacharacters AND ALL WHITESPACE, because
 *     an unquoted space splits an argv.
 *   - THIS guards a WRITE. The dangers here are (a) FRONTMATTER INJECTION —
 *     frontmatter is line-oriented `key: value` text, so a NEWLINE in the id
 *     forges EXTRA FIELDS in the written .md (a forged `status: active` silently
 *     un-archives an entry) — and (b) PATH ABUSE, since the id's slug becomes a
 *     filename under `memory/`. A SPACE can do neither.
 *
 * And spaces are REAL, not hypothetical: `projectSlugFromPath` does not sanitize
 * (it returns `` `${parent}-${last}` ``), so a checkout at `~/code/my project`
 * yields the project slug `code-my project` and ids like
 * `semantic/code-my project/some-slug`. Gating the WRITE path on the shell
 * predicate made EVERY memory in such a project a "malformed index row" —
 * silently skipped by `memory-archive` and refused by `memory-unarchive`.
 *
 * So: reject ASCII control characters anywhere (the injection vector), require
 * every `/`-separated segment to be a safe path segment (non-empty, not `.`,
 * no `..`, no separator, no NUL — the same rule `canonicalMemoryPath` enforces
 * on the slug, so this gate and that derivation cannot disagree), cap the length
 * so a derived filename stays writable — and allow everything else, spaces and
 * ordinary punctuation included.
 */
export function isWritableMemoryId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  if (id.length === 0 || id.length > MAX_MEMORY_ID_LENGTH) return false;
  if (hasControlChars(id)) return false;
  return id.split("/").every(isSafePathSegment);
}

/** Canonical repo-relative path derived purely from {type, project, id}.
 *  Agent-supplied paths are NOT authoritative. Validates each segment so a
 *  crafted type/project/slug (untrusted JSON) cannot traverse into another
 *  type's tree (e.g. a non-gated `type: "semantic/../core"` reaching core/). */
export function canonicalMemoryPath(entry: MemoryEntry): string {
  if (!MEMORY_TYPES.has(entry.type)) {
    throw new Error(`memory path: invalid type ${JSON.stringify(entry.type)} (not a MemoryType)`);
  }
  const scopeDir = safeSegment(entry.project ?? "_global", "project");
  const slug = safeSegment(entry.id.split("/").pop() ?? entry.id, "slug");
  return `memory/${entry.type}/${scopeDir}/${slug}.md`;
}
