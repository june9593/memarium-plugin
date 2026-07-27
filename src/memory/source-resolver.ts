import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { memariumHome } from "../memarium-home.js";
import { epochMs } from "./dates.js";
import { loadMemoryIndex, MEMORY_INDEX_REL } from "./index-store.js";
import type { MemoryEntry } from "./types.js";

/**
 * Cross-device READ view over typed memory (P0b).
 *
 * `memarium sync` (npm CLI) aggregates every device's memory into origin/main
 * (merge-books: union by id, latest updatedAt wins) and mounts a read-only
 * worktree of main at `~/.memarium/aggregated/`. But the plugin's recall/primer
 * only ever read the LOCAL device repo, so the aggregated cross-device memory
 * was produced and never consumed (the Q2 gap). This resolver merges the local
 * index with the overlay index so recall on any device sees sibling-device
 * memory — while WRITES stay local-only and pending proposals (outside the repo)
 * are excluded for free.
 *
 * The view is `repo-indexed / non-proposal`: it does NOT filter by status —
 * `superseded` entries are kept so consumers can decide (scoreMemories/primer
 * hide them, but memory-query's conflicts block still needs them).
 */

export type MemorySource = "local" | "overlay";

export interface MemoryView {
  /** Merged entries, keyed by id (like a MemoryIndex). */
  entries: Record<string, MemoryEntry>;
  /** Per-id source: which tree the entry (and its md body) came from. */
  sources: Record<string, MemorySource>;
  /** Absolute roots to resolve each entry's repo-relative `path` against. */
  roots: { local: string; overlay: string | null };
  /** True when an aggregated overlay index file was found and read. */
  overlayPresent: boolean;
}

/** Where the npm CLI mounts the read-only origin/main overlay. The plugin only
 *  READS it; `memarium sync` maintains it (`reset --hard origin/main`). */
export function aggregatedOverlayPath(): string {
  return join(memariumHome(), "aggregated");
}

/**
 * Merge two id-keyed entry maps: union; on id collision, **latest `updatedAt`
 * wins; equal timestamp prefers `local`** (own-device authority + possibly
 * newer unpushed state). NOTE: this is a read-view override, NOT CI parity —
 * merge-books uses strict `>` and keeps the first-traversed device on ties.
 * Does NOT filter status (superseded kept; consumers filter).
 *
 * Round-31: "latest" is decided CHRONOLOGICALLY (shared `epochMs`), not by
 * comparing the raw strings, which this used to do. A raw compare is not
 * chronological for valid mixed ISO forms — `2026-05-05T23:00:00-10:00` is
 * 2026-05-06T09:00Z (genuinely NEWER than `2026-05-06T01:00:00Z`) yet sorts
 * lexically SMALLER, and `2026-05-06T01:00:00+14:00` is 2026-05-05T11:00Z
 * (genuinely OLDER than `2026-05-06`) yet sorts lexically LARGER — so the read
 * view could hand every consumer (recall, primer, memory-query, archive) the
 * OLDER copy of a memory. Worse, the cross-device WRITE guard
 * (`isOverlayConflict`) orders chronologically since round-30: leaving the read
 * merge lexical would make the two surfaces disagree about which copy is newer,
 * the same planner-vs-reader skew that already bit this PR at rounds 20→24.
 *
 * Deliberately NOT day-granular, unlike the write guard. `isOverlayConflict`
 * treats a same calendar day as a TIE so a same-day sibling EDIT still reaches
 * its substantive divergence check; the read merge has no such second stage — it
 * just needs one deterministic, chronologically-correct winner, and instant
 * ordering already matches what the old lexical compare did within a day (a
 * day-only `2026-06-05` loses to `2026-06-05T10:00:00Z` either way).
 *
 * UNREADABLE STAMPS (absent / non-string / unparseable → `epochMs` null): a
 * timestamp we cannot read cannot be PROVEN newer, so it never beats a readable
 * one — in either direction. That keeps a corrupt row from silently winning the
 * read view: under the old lexical compare a garbage string like `"not-a-date"`
 * outranked every real ISO date, so an unreadable overlay row displaced a
 * perfectly good local one (and vice versa). When BOTH sides are unreadable
 * there is nothing to order by, so it falls back to the documented tie behavior:
 * LOCAL wins.
 */
export function mergeIndexById(
  local: Record<string, MemoryEntry>,
  overlay: Record<string, MemoryEntry>,
): { entries: Record<string, MemoryEntry>; sources: Record<string, MemorySource> } {
  const entries: Record<string, MemoryEntry> = {};
  const sources: Record<string, MemorySource> = {};
  for (const [id, e] of Object.entries(overlay)) {
    entries[id] = e;
    sources[id] = "overlay";
  }
  for (const [id, e] of Object.entries(local)) {
    const ex = entries[id];
    if (!ex || localWins(e.updatedAt, ex.updatedAt)) {
      entries[id] = e;
      sources[id] = "local";
    }
  }
  return { entries, sources };
}

/** True when the LOCAL copy should own the merged slot for a colliding id.
 *  Overlay survives only when it is strictly, provably newer. */
function localWins(localAt: unknown, overlayAt: unknown): boolean {
  const localMs = epochMs(localAt);
  const overlayMs = epochMs(overlayAt);
  if (overlayMs === null) return true;   // overlay unreadable (or both) → can't be newer; tie → local
  if (localMs === null) return false;    // only local unreadable → can't be proven newer either
  return localMs >= overlayMs;           // `>=` → local wins on a tie (own-device authority)
}

/**
 * Build the merged local+overlay memory view. Gracefully degrades to local-only
 * when the overlay is absent (plugin-only / self-contained users, or `memarium
 * sync` not yet run). `overlayRoot` is injectable for tests; pass `null` to
 * force local-only.
 */
export function resolveMemoryView(
  repoPath: string,
  overlayRoot: string | null = aggregatedOverlayPath(),
): MemoryView {
  const local = loadMemoryIndex(repoPath).entries;

  let overlayEntries: Record<string, MemoryEntry> = {};
  let overlayPresent = false;
  if (overlayRoot && overlayRoot !== repoPath && existsSync(join(overlayRoot, MEMORY_INDEX_REL))) {
    overlayPresent = true;
    overlayEntries = loadMemoryIndex(overlayRoot).entries; // empty on corrupt → safe
  }

  const { entries, sources } = mergeIndexById(local, overlayEntries);
  return {
    entries,
    sources,
    roots: { local: repoPath, overlay: overlayPresent ? overlayRoot : null },
    overlayPresent,
  };
}

/**
 * Resolve an entry's repo-relative `path` to an ABSOLUTE path against the tree
 * it actually came from — local entries under `repoPath`, overlay-sourced
 * entries under the read-only overlay worktree. Resolving an overlay entry
 * against the local repo would yield a path that doesn't exist on disk, so any
 * consumer that hands the path to a `Read` tool (e.g. recall) must go through
 * this. Falls back to the local root when the source/overlay root is unknown.
 */
export function resolveEntryAbsPath(view: MemoryView, id: string): string | null {
  const e = view.entries[id];
  if (!e) return null;
  const root = view.sources[id] === "overlay" && view.roots.overlay
    ? view.roots.overlay
    : view.roots.local;
  return join(root, e.path);
}
