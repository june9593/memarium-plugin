import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { memariumHome } from "../memarium-home.js";
import { calendarDate, epochMs } from "./dates.js";
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
 * Merge two id-keyed entry maps: union; on id collision, **the later CALENDAR
 * DAY wins; the same day is a TIE and prefers `local`** (own-device authority +
 * possibly newer unpushed state). NOTE: this is a read-view override, NOT CI
 * parity — merge-books uses strict `>` and keeps the first-traversed device on
 * ties. Does NOT filter status (superseded kept; consumers filter).
 *
 * DAY GRANULARITY IS A CROSS-SURFACE CONTRACT — three places agree BY DESIGN and
 * a change to one must change all three:
 *   1. this READ merge,
 *   2. the cross-device WRITE guard (`isOverlayConflict`, overlay-conflict.ts),
 *      which treats a same calendar day as a TIE so a same-day sibling edit still
 *      reaches its substantive divergence check,
 *   3. the LIFECYCLE WRITERS (`memory-archive`, `memory-unarchive`, and the
 *      supersede transition in `applyMemoryItems`), which stamp `updatedAt` as a
 *      plain day-granular `YYYY-MM-DD`.
 * Because the writers only ever record a DAY, a stamp denotes a whole day, not an
 * instant — so two copies stamped the same day are genuinely UNORDERED.
 *
 * Round-31 ordered this merge by INSTANT (`epochMs`) instead, which is
 * chronologically correct but disagrees with (2): an equivalent overlay copy at
 * `2026-07-24T10:00Z` beat a local `2026-07-24` in the read view, while the write
 * guard called the same pair a tie and let local win. Read view and write guard
 * then disagreed about which copy is authoritative — the same planner-vs-reader
 * skew that already bit this PR at rounds 20→24, just inverted.
 *
 * Comparing the raw STRINGS (what this did before round-31) is not an option
 * either: it is not chronological for valid mixed ISO forms —
 * `2026-05-06T20:00:00-10:00` is 2026-05-07T06:00Z (a genuinely LATER day) yet
 * sorts lexically SMALLER than `2026-05-06T23:00:00Z`, and
 * `2026-05-06T01:00:00+14:00` is 2026-05-05T11:00Z (a genuinely EARLIER day) yet
 * sorts lexically LARGER than `2026-05-06`. So the DAY is compared through the
 * shared `calendarDate()` (UTC-normalized), and the instant only ever confirms
 * the direction once the days already differ.
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
 *  Overlay survives only when it is on a strictly, provably LATER calendar day —
 *  the same two-level rule `isOverlayConflict` applies (day picks the branch, the
 *  instant only confirms the direction once the days differ). */
function localWins(localAt: unknown, overlayAt: unknown): boolean {
  const localMs = epochMs(localAt);
  const overlayMs = epochMs(overlayAt);
  if (overlayMs === null) return true;   // overlay unreadable (or both) → can't be newer; tie → local
  if (localMs === null) return false;    // only local unreadable → can't be proven newer either
  // Same calendar DAY → the two are unordered (writers stamp days, not instants)
  // → TIE → local wins, exactly as the write guard resolves it.
  // Both stamps parsed above, so both calendarDate() calls are non-null here.
  if (calendarDate(localAt) === calendarDate(overlayAt)) return true;
  return localMs >= overlayMs;           // different days → later day wins (`>=` keeps the tie shape)
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
