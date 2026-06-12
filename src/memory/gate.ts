import type { MemoryEntry, MemoryIndex } from "./types.js";

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

/** Gate the *change*, not just the proposed entry: the proposed entry, the live
 *  entry it overwrites in place, and the live entry it supersedes are all
 *  considered. Closes the supersede-bypass (a non-gated entry that supersedes a
 *  gated one would silently flip the gated entry to superseded via memory-write). */
export function isGatedChange(entry: MemoryEntry, live: MemoryIndex["entries"]): boolean {
  if (isGated(entry)) return true;
  if (isGated(live[entry.id])) return true;
  const sup = supersedesId(entry);
  if (sup && isGated(live[sup])) return true;
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

/** Canonical repo-relative path derived purely from {type, project, id}.
 *  Agent-supplied paths are NOT authoritative — see applyMemoryItems. */
export function canonicalMemoryPath(entry: MemoryEntry): string {
  const scopeDir = entry.project ?? "_global";
  const slug = entry.id.split("/").pop() ?? entry.id;
  return `memory/${entry.type}/${scopeDir}/${slug}.md`;
}
