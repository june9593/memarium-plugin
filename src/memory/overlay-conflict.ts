import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalMemoryPath } from "./gate.js";
import type { MemoryEntry } from "./types.js";

/** Order-independent equality for a memory's string tags (e.g. `entities`).
 *  A mere reorder between a local row and its aggregated copy is not a divergence. */
function sameStringSet(a: string[] | undefined, b: string[] | undefined): boolean {
  const sa = [...(a ?? [])].sort();
  const sb = [...(b ?? [])].sort();
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

/** True when two copies of the same memory id have SUBSTANTIVELY equivalent
 *  frontmatter/metadata — i.e. an already-synced copy, not a divergent
 *  sibling-device edit. Compares only CONTENT fields (now including `trust`,
 *  `validFrom`, and `project`, whose edits are real divergence); deliberately
 *  IGNORES provenance/location metadata that legitimately differs between a
 *  local row and its aggregated copy (`path`, `originDevice`, and the union-able
 *  `sourceSessions`/`sourceCommits`/`sourceFiles`, which merge-books unions
 *  rather than treats as divergence).
 *
 *  NOTE: this is a metadata-only comparison. The Markdown BODY is compared
 *  separately (it lives in the .md, not the index) by `isOverlayConflict`, which
 *  reads both trees' files — so a body-only sibling edit is still caught. */
export function sameMemoryContent(a: MemoryEntry, b: MemoryEntry): boolean {
  return (
    a.status === b.status &&
    a.title === b.title &&
    a.summary === b.summary &&
    a.importance === b.importance &&
    a.confidence === b.confidence &&
    (a.validTo ?? null) === (b.validTo ?? null) &&
    (a.validFrom ?? null) === (b.validFrom ?? null) &&
    (a.supersedes ?? null) === (b.supersedes ?? null) &&
    a.type === b.type &&
    a.scope === b.scope &&
    (a.project ?? null) === (b.project ?? null) &&
    (a.trust ?? "unknown") === (b.trust ?? "unknown") &&
    sameStringSet(a.entities, b.entities)
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

/** Read a memory's body from its CANONICAL .md under `root` (derived from
 *  {type,project,id}, never the untrusted entry.path — matching the derivation
 *  the writer uses). Returns `null` on ANY failure (missing/unreadable file,
 *  unsafe canonical path, or unparseable body) so the conflict check can treat
 *  a body it can't read on either side as divergence (the safe default). */
function readCanonicalBody(root: string | null, entry: MemoryEntry): string | null {
  if (!root) return null;
  try {
    const abs = resolve(join(root, canonicalMemoryPath(entry)));
    return extractBody(readFileSync(abs, "utf8"));
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
 *   - overlay absent/malformed row → NOT a conflict (local is authoritative).
 *   - overlay strictly NEWER updatedAt → conflict (a newer remote edit; clobber risk).
 *   - overlay strictly OLDER updatedAt → NOT a conflict (local wins).
 *   - EQUAL updatedAt → conflict IFF the copies substantively DIVERGE: any
 *     metadata field (`sameMemoryContent`) OR the Markdown BODY differs. Reading
 *     either body fails → treated as divergent (safe default). An equivalent
 *     already-synced copy (identical metadata AND body) is NOT a conflict. */
export function isOverlayConflict(
  local: MemoryEntry,
  overlay: unknown,
  roots: ConflictRoots,
): boolean {
  if (!overlay || typeof overlay !== "object" || Array.isArray(overlay)) return false;
  const ov = overlay as MemoryEntry;
  const ovUpdated = ov.updatedAt ?? "";
  const localUpdated = local.updatedAt ?? "";
  if (ovUpdated > localUpdated) return true;   // strictly-newer remote edit → clobber risk
  if (ovUpdated < localUpdated) return false;  // strictly-older → local authoritative
  // EQUAL updatedAt: a genuine same-day sibling edit blocks; an equivalent synced copy does not.
  if (!sameMemoryContent(local, ov)) return true; // metadata diverges → conflict
  // Metadata matches — the last place a sibling edit can hide is the BODY.
  const localBody = readCanonicalBody(roots.local, local);
  const overlayBody = readCanonicalBody(roots.overlay, ov);
  if (localBody === null || overlayBody === null) return true; // can't compare → safe skip
  return localBody !== overlayBody;
}
