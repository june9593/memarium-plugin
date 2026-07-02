import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
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
  return join(homedir(), ".memarium", "aggregated");
}

/**
 * Merge two id-keyed entry maps: union; on id collision, **latest `updatedAt`
 * wins; equal timestamp prefers `local`** (own-device authority + possibly
 * newer unpushed state). NOTE: this is a read-view override, NOT CI parity —
 * merge-books uses strict `>` and keeps the first-traversed device on ties.
 * Does NOT filter status (superseded kept; consumers filter).
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
    // `>=` → local wins on a tie; overlay only survives when strictly newer.
    if (!ex || (e.updatedAt ?? "") >= (ex.updatedAt ?? "")) {
      entries[id] = e;
      sources[id] = "local";
    }
  }
  return { entries, sources };
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
