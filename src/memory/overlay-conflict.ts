import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalMemoryPath } from "./gate.js";
import type { MemoryEntry } from "./types.js";

/** Tri-state comparison for a memory's string-tag collection (e.g. `entities`).
 *
 *  Order-independent: a mere reorder between a local row and its aggregated copy
 *  is not a divergence. `undefined`/`null` mean "never set" (the renderer emits
 *  `[]` for them), so they compare EQUAL to an explicit empty array — otherwise
 *  every legacy row would read as a cross-device conflict.
 *
 *  Anything else that is not an ARRAY is `"uncomparable"`. Round-17: this used to
 *  spread its arguments unconditionally (`[...(b ?? [])]`), so a parseable but
 *  malformed row like `{ updatedAt, entities: {} }` THREW "is not iterable"
 *  rather than being reported as non-equivalent — and the throw escaped
 *  `isOverlayConflict`, aborting the unattended `memory-archive --apply` digest
 *  consolidation instead of being handled as a conflict. */
type SetCmp = "same" | "different" | "uncomparable";

function compareStringSet(a: unknown, b: unknown): SetCmp {
  const norm = (v: unknown): unknown[] | null => {
    if (v === undefined || v === null) return []; // unset ≡ empty
    if (!Array.isArray(v)) return null;           // present but not a collection → uncomparable
    return [...v].sort();
  };
  const sa = norm(a);
  const sb = norm(b);
  if (sa === null || sb === null) return "uncomparable";
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]) ? "same" : "different";
}

/** Collection fields a well-formed memory row must carry as arrays (or leave
 *  unset). A row with, say, `sourceSessions: "s1"` is structurally corrupt: even
 *  though we deliberately do NOT diff union-able provenance, we cannot trust ANY
 *  comparison against a row whose shape is wrong, so the caller fails closed. */
const COLLECTION_FIELDS = ["entities", "sourceSessions", "sourceCommits", "sourceFiles"] as const;

/** True when EVERY collection field on the row is absent or a real array. */
function hasWellFormedCollections(row: unknown): boolean {
  const r = row as Record<string, unknown>;
  return COLLECTION_FIELDS.every((f) => {
    const v = r[f];
    return v === undefined || v === null || Array.isArray(v);
  });
}

/** True when two copies of the same memory id have SUBSTANTIVELY equivalent
 *  frontmatter/metadata — i.e. an already-synced copy, not a divergent
 *  sibling-device edit. Compares only CONTENT fields (now including the row's own
 *  `id`, `trust`, `validFrom`, `project`, the birth stamp `createdAt`, and the
 *  ARCHIVAL LIFECYCLE fields `archivedReason` / `archivedAt`, whose edits are
 *  real divergence); deliberately IGNORES provenance/location metadata that
 *  legitimately differs between a local row and its aggregated copy (`path`,
 *  `originDevice`, and the union-able `sourceSessions`/`sourceCommits`/
 *  `sourceFiles`, which merge-books unions rather than treats as divergence).
 *
 *  `id` is compared because callers pass rows they looked up by MAP KEY, and no
 *  index loader checks that a row's key agrees with the row's own `id`
 *  (`loadMemoryIndexStrict` validates only the top-level `entries` map). So the
 *  overlay row fetched under the LOCAL key can name a DIFFERENT record. Two rows
 *  that disagree on identity are never "the same memory, already synced" — and
 *  the write this guard protects derives its `.md` path from `entry.id`, so
 *  calling them equivalent lets archival write against a record the comparison
 *  never examined (round-21; same key/id-confusion class as the round-12 fix).
 *
 *  `createdAt` is lifecycle metadata too, not location metadata: two
 *  equal-`updatedAt` copies with different birth stamps are different records,
 *  so calling them equivalent would let archival restamp the local copy and
 *  clobber the sibling's value on the next merge.
 *
 *  `archivedReason`/`archivedAt` are lifecycle STATE, not mergeable provenance:
 *  two equal-`updatedAt` copies archived by DIFFERENT rules (e.g. `expired` vs
 *  `superseded-cleanup`) are genuinely divergent — unarchive restores
 *  active-vs-superseded FROM `archivedReason`, so treating them as equivalent
 *  would let archival/unarchival clobber the sibling's lifecycle state.
 *
 *  NEVER THROWS on a malformed field: an UNCOMPARABLE `entities` yields `false`
 *  ("not established as equivalent"), which every caller already treats as
 *  divergence — the fail-closed answer.
 *
 *  NOTE: this is a metadata-only comparison. The Markdown BODY is compared
 *  separately (it lives in the .md, not the index) by `isOverlayConflict`, which
 *  reads both trees' files — so a body-only sibling edit is still caught. */
export function sameMemoryContent(a: MemoryEntry, b: MemoryEntry): boolean {
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.title === b.title &&
    a.summary === b.summary &&
    a.importance === b.importance &&
    a.confidence === b.confidence &&
    a.createdAt === b.createdAt &&
    (a.validTo ?? null) === (b.validTo ?? null) &&
    (a.validFrom ?? null) === (b.validFrom ?? null) &&
    (a.supersedes ?? null) === (b.supersedes ?? null) &&
    (a.archivedReason ?? null) === (b.archivedReason ?? null) &&
    (a.archivedAt ?? null) === (b.archivedAt ?? null) &&
    a.type === b.type &&
    a.scope === b.scope &&
    (a.project ?? null) === (b.project ?? null) &&
    (a.trust ?? "unknown") === (b.trust ?? "unknown") &&
    compareStringSet(a.entities, b.entities) === "same"
  );
}

/** Extract a memory's body (the prose after the `# title` heading) from raw .md
 *  text, using the SAME strip logic as apply.ts's strict `readMemoryBody`
 *  (normalize CRLF → drop the `---\n…\n---` frontmatter → drop the leading
 *  `# heading` → strip trailing newlines). LENIENT: returns `null` instead of
 *  throwing when the .md lacks a frontmatter block or a `# heading`, because the
 *  caller treats an unreadable body as DIVERGENT (a safe skip), not an error. */
function extractBody(md: string): string | null {
  const norm = md.replace(/\r\n/g, "\n");
  if (!/^---\n[\s\S]*?\n---\n?/.test(norm)) return null;
  const afterFm = norm.replace(/^---\n[\s\S]*?\n---\n?/, "");
  if (!/^\n*# [^\n]*/.test(afterFm)) return null;
  return afterFm.replace(/^\n*# [^\n]*\n*/, "").replace(/\n+$/, "");
}

/** The repo-relative CANONICAL `.md` path for a row, derived from its own
 *  {type, project, id} exactly as the writer derives it — never the untrusted
 *  `entry.path`. Returns `null` when it cannot be derived (e.g. an invalid
 *  `type`, or an id that isn't a string), so the caller can fail closed. */
function canonicalRel(entry: MemoryEntry): string | null {
  try {
    return canonicalMemoryPath(entry);
  } catch {
    return null;
  }
}

/** Read a memory's body from `<root>/<rel>`. Returns `null` on ANY failure
 *  (no root, no derivable path, missing/unreadable file, or unparseable body) so
 *  the conflict check can treat a body it can't read on either side as
 *  divergence (the safe default). */
function readBodyAt(root: string | null, rel: string | null): string | null {
  if (!root || !rel) return null;
  try {
    return extractBody(readFileSync(resolve(join(root, rel)), "utf8"));
  } catch {
    return null;
  }
}

export interface ConflictRoots {
  /** Local device repo root (bodies resolved against `<local>/memory/...`). */
  local: string;
  /** Aggregated overlay worktree root, or null when no overlay is mounted. */
  overlay: string | null;
}

/** Decide whether the OVERLAY copy of a local row is a cross-device CONFLICT —
 *  i.e. a sibling-device edit we would clobber by archiving/restamping the local
 *  copy (day-only updatedAt can win the next merge). Shared by memory-archive
 *  (which SKIPS a conflicting id) and memory-unarchive (which ABORTS one).
 *
 *  This is a WRITE-SAFETY check, so it FAILS CLOSED: the only "no conflict"
 *  answers are ones we could actually establish.
 *
 *   - overlay row genuinely ABSENT (undefined/null) → NOT a conflict. This is the
 *     normal local-only path: there is no sibling copy to clobber.
 *   - overlay row PRESENT but UNCOMPARABLE (not a non-null non-array object, no
 *     usable string `updatedAt`, a MALFORMED COLLECTION field, or any field whose
 *     comparison throws) → CONFLICT. Round-16: this used to return false, and a
 *     missing `updatedAt` compared as `""` — i.e. "strictly older, local wins" —
 *     so archive/unarchive would restamp the local copy even though the sibling's
 *     state was never actually compared. That is exactly the clobbering write this
 *     guard exists to prevent.
 *   - overlay strictly NEWER updatedAt → conflict (a newer remote edit; clobber risk).
 *   - overlay strictly OLDER updatedAt → NOT a conflict (local wins).
 *   - EQUAL updatedAt → conflict IFF the copies substantively DIVERGE: any
 *     metadata field (`sameMemoryContent`) OR the Markdown BODY differs. Reading
 *     either body fails → treated as divergent (safe default). An equivalent
 *     already-synced copy (identical metadata AND body) is NOT a conflict.
 *
 *  Round-17: this function must also NEVER THROW. It runs inside the automatic
 *  `memory-archive --apply` consolidation at the end of a digest — unattended —
 *  so an exception here doesn't "fail closed", it ABORTS the whole run. A
 *  parseable-but-malformed overlay row (e.g. `{ updatedAt, entities: {} }`) used
 *  to do exactly that. Malformed shapes are now validated EXPLICITLY (above), and
 *  the whole comparison is additionally wrapped in a defensive catch that
 *  converts any residual throw into `true` (conflict) — a skipped id, never a
 *  crashed run. */
export function isOverlayConflict(
  local: MemoryEntry,
  overlay: unknown,
  roots: ConflictRoots,
): boolean {
  // Genuinely absent → nothing to clobber.
  if (overlay === undefined || overlay === null) return false;
  // Present but not a usable row → we cannot compare state, so refuse the write.
  if (typeof overlay !== "object" || Array.isArray(overlay)) return true;
  try {
    return divergesFromOverlay(local, overlay as MemoryEntry, roots);
  } catch {
    // Backstop for anything the explicit validation above didn't anticipate
    // (an exploding accessor, a proxy, a future field type). Uncomparable →
    // CONFLICT: skip this id rather than let the exception abort the run.
    return true;
  }
}

/** The comparison proper; only ever called with a non-null, non-array object
 *  overlay row. May throw — `isOverlayConflict` converts that into a conflict. */
function divergesFromOverlay(local: MemoryEntry, ov: MemoryEntry, roots: ConflictRoots): boolean {
  const ovUpdated = ov.updatedAt;
  if (typeof ovUpdated !== "string" || ovUpdated === "") return true; // uncomparable → conflict
  // A row whose collection fields aren't arrays is structurally corrupt; no
  // comparison against it can be trusted, so fail closed rather than diff it.
  if (!hasWellFormedCollections(ov) || !hasWellFormedCollections(local)) return true;
  const localUpdated = typeof local.updatedAt === "string" ? local.updatedAt : "";
  if (ovUpdated > localUpdated) return true;   // strictly-newer remote edit → clobber risk
  if (ovUpdated < localUpdated) return false;  // strictly-older → local authoritative
  // EQUAL updatedAt: a genuine same-day sibling edit blocks; an equivalent synced copy does not.
  if (!sameMemoryContent(local, ov)) return true; // metadata diverges → conflict
  // Metadata matches — the last place a sibling edit can hide is the BODY. Each
  // side's body is read from the path its OWN {type, project, id} derives, so
  // before comparing them we require those paths to AGREE: two rows whose
  // canonical paths differ are not two copies of one record, and diffing their
  // bodies would compare two DIFFERENT entries as if they were the same one.
  // (`sameMemoryContent` now compares id/type/project, so an agreeing pair is
  // the only pair that gets here — this pins that invariant explicitly and fails
  // closed if it ever regresses, rather than silently answering "equivalent".)
  const localRel = canonicalRel(local);
  const overlayRel = canonicalRel(ov);
  if (localRel === null || overlayRel === null || localRel !== overlayRel) return true;
  const localBody = readBodyAt(roots.local, localRel);
  const overlayBody = readBodyAt(roots.overlay, overlayRel);
  if (localBody === null || overlayBody === null) return true; // can't compare → safe skip
  return localBody !== overlayBody;
}
