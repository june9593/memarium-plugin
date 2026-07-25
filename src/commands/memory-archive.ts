import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex, saveMemoryIndex } from "../memory/index-store.js";
import { loadUsage } from "../memory/usage-store.js";
import { planArchival, ARCHIVE_DEFAULTS } from "../memory/archive.js";
import { loadKnownSessions } from "../memory/known-sessions.js";
import { safeValues } from "../memory/lint.js";
import { resolveMemoryView } from "../memory/source-resolver.js";
import { writeMemoryEntryFile, assertMemoryBodyRecoverable } from "../memory/apply.js";
import type { MemoryEntry } from "../memory/types.js";

/** Order-independent equality for a memory's string tags (e.g. `entities`).
 *  A mere reorder between a local row and its aggregated copy is not a divergence. */
function sameStringSet(a: string[] | undefined, b: string[] | undefined): boolean {
  const sa = [...(a ?? [])].sort();
  const sb = [...(b ?? [])].sort();
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

/** True when two copies of the same memory id are SUBSTANTIVELY equivalent —
 *  i.e. an already-synced copy, not a divergent sibling-device edit. Compares
 *  only CONTENT fields; deliberately IGNORES provenance/location metadata that
 *  legitimately differs between a local row and its aggregated copy (`path`,
 *  `originDevice`, and the union-able `sourceSessions`/`sourceCommits`/
 *  `sourceFiles`, which merge-books unions rather than treats as divergence). */
export function sameMemoryContent(a: MemoryEntry, b: MemoryEntry): boolean {
  return (
    a.status === b.status &&
    a.title === b.title &&
    a.summary === b.summary &&
    a.importance === b.importance &&
    a.confidence === b.confidence &&
    (a.validTo ?? null) === (b.validTo ?? null) &&
    (a.supersedes ?? null) === (b.supersedes ?? null) &&
    a.type === b.type &&
    a.scope === b.scope &&
    sameStringSet(a.entities, b.entities)
  );
}

export interface MemoryArchiveOptions {
  /** Accepted for CLI symmetry with the other memory-* commands. Archive plans
   *  store-wide (the near-duplicate + stale-provenance rules are inherently
   *  cross-project), so cwd does not scope the plan today. */
  cwd?: string;
  json?: boolean;
  apply?: boolean;
}

/** Archive stale/unused memories out of recall — REVERSIBLE (an archived entry
 *  keeps its .md + index row; it's just skipped by recall/primer). Dry-run by
 *  default: prints the plan and writes nothing. `--apply` flips each planned,
 *  still-archivable entry to status:"archived" (+ archivedAt/archivedReason),
 *  rewrites its .md through the guarded canonical-path writer, and updates the
 *  index. The core/pinned/already-archived guard is re-asserted at the write
 *  sink so a stale plan can never archive a memory that became protected since
 *  planning. Idempotent: an already-archived entry is skipped, so re-running
 *  archives nothing new. */
export async function memoryArchiveCmd(opts: MemoryArchiveOptions): Promise<void> {
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  const now = new Date().toISOString().slice(0, 10);
  const usage = loadUsage(cfg.repoPath);
  const knownSessions = loadKnownSessions(cfg.repoPath); // Set | undefined
  // Digest runs this automatically, so a parseable-but-malformed index row (null,
  // or wrong-typed fields) must NOT crash consolidation. safeValues drops non-object
  // rows (same guard the lint path uses); report how many were skipped.
  const rawCount = Object.keys(idx.entries ?? {}).length;
  const entries = safeValues<MemoryEntry>(idx.entries);
  if (entries.length < rawCount) {
    console.warn(`memory-archive: skipped ${rawCount - entries.length} malformed index row(s)`);
  }

  // Cross-device clobber guard: the plan is built from the LOCAL index, but a
  // sibling device may hold a copy of the same id that GENUINELY DIVERGES — a
  // different device's differing edit we could clobber. We only want to skip
  // archival when that divergence is real; an already-synced EQUIVALENT copy
  // (which the aggregated overlay holds for nearly every local id) must remain
  // archivable, or a synced user could never archive anything.
  //
  // resolveMemoryView merges local+overlay (latest-updatedAt wins, LOCAL wins
  // ties), so the merged view can't distinguish "equivalent synced copy" from
  // "same-day sibling edit" — both resolve to "local". So we load the overlay's
  // OWN index and compare its row against the local row per id:
  //   - overlay absent, or strictly OLDER than local → local is authoritative → archivable.
  //   - overlay strictly NEWER than local → a newer remote edit; archiving+restamping
  //     local (day-only updatedAt) could win the next merge and clobber it → skip.
  //   - overlay EQUAL updatedAt → skip ONLY IF it substantively DIFFERS from local
  //     (a same-day sibling edit we could clobber); an equivalent synced copy is
  //     archivable normally.
  const view = resolveMemoryView(cfg.repoPath);
  const overlayEntries: Record<string, unknown> = view.roots.overlay
    ? loadMemoryIndex(view.roots.overlay).entries
    : {};
  const inCrossDeviceConflict = (e: MemoryEntry): boolean => {
    const ov = overlayEntries[e.id];
    if (!ov || typeof ov !== "object" || Array.isArray(ov)) return false; // absent/malformed overlay row → no conflict
    const ovEntry = ov as MemoryEntry;
    const ovUpdated = ovEntry.updatedAt ?? "";
    const localUpdated = e.updatedAt ?? "";
    if (ovUpdated > localUpdated) return true;   // strictly-newer remote edit → clobber risk → skip
    if (ovUpdated < localUpdated) return false;  // strictly-older → local authoritative → archivable
    // EQUAL updatedAt: a genuine same-day sibling edit blocks archival; an
    // equivalent already-synced copy does not.
    return !sameMemoryContent(e, ovEntry);
  };
  const localWinners = entries.filter((e) => !inCrossDeviceConflict(e));
  const skippedOverlay = entries.length - localWinners.length;
  if (skippedOverlay > 0) {
    console.warn(`memory-archive: skipped ${skippedOverlay} id(s) in a cross-device conflict (a sibling holds a newer or divergent same-day copy)`);
  }

  const plan = planArchival(localWinners, usage, { now, ...ARCHIVE_DEFAULTS, knownSessions });

  if (!opts.apply) {
    if (opts.json) console.log(JSON.stringify(plan, null, 2));
    else if (plan.archive.length === 0) console.log("nothing to archive");
    else plan.archive.forEach((a) => console.log(`archive ${a.id}  (${a.reason})`));
    return;
  }

  // Build the archive set, re-asserting the hard guard at the write sink
  // (mirrors planArchival's `archivable`): core is never archivable, pinned is
  // protected, and an already-archived entry is skipped for idempotency.
  const planned: MemoryEntry[] = [];
  for (const { id, reason } of plan.archive) {
    const e = idx.entries[id] as MemoryEntry | undefined;
    if (!e) continue;
    if (e.type === "core" || e.status === "pinned" || e.status === "archived") continue;
    planned.push({ ...e, status: "archived", archivedAt: now, archivedReason: reason, updatedAt: now });
  }

  // Whole-plan PREFLIGHT before the first write (matches applyMemoryItems'
  // discipline): validate every planned target's canonical path + symlink guard
  // AND that its existing body is recoverable, up front — so a later row with an
  // invalid canonical path / symlinked component / missing-or-corrupt .md can't
  // leave earlier .md already rewritten while saveMemoryIndex is never reached
  // (which would desync the files from the index, or clobber an entry with a
  // bodyless document). Throws here, before any write, on the first bad target.
  for (const next of planned) assertMemoryBodyRecoverable(cfg.repoPath, next);

  // Write phase — every target validated above.
  let archived = 0;
  for (const next of planned) {
    writeMemoryEntryFile(cfg.repoPath, next); // guarded canonical-path write (bypasses the active-coercion allowlist)
    idx.entries[next.id] = next;
    archived++;
  }
  if (archived > 0) saveMemoryIndex(cfg.repoPath, idx);
  console.log(opts.json ? JSON.stringify({ archived }) : `archived ${archived}`);
}
