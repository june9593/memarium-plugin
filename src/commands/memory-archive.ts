import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex, loadMemoryIndexStrict, saveMemoryIndex, type MemoryIndexLoad } from "../memory/index-store.js";
import { loadUsage } from "../memory/usage-store.js";
import { planArchival, ARCHIVE_DEFAULTS } from "../memory/archive.js";
import { loadKnownSessions } from "../memory/known-sessions.js";
import { validEntryExists } from "../memory/lint.js";
import { resolveMemoryView } from "../memory/source-resolver.js";
import { isOverlayConflict } from "../memory/overlay-conflict.js";
import { writeMemoryEntryFile, assertMemoryBodyRecoverable, isRewritableEntry, snapshotMemoryEntryFile, rollbackMemoryWrites } from "../memory/apply.js";
import type { MemoryEntry } from "../memory/types.js";

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
  // wrong-typed, a partial object missing the fields the plan + canonical-path
  // derivation need, or one filed under a key that disagrees with its own `id`)
  // must NOT crash consolidation — or, worse, act on the WRONG record.
  //
  // `validEntryExists` subsumes safeValues' check (non-null, non-array object) and
  // adds the key===id agreement that was missing: planArchival plans by `row.id`
  // and the apply loop resolves `idx.entries[id]`, so a row filed under key `bad`
  // carrying `id: "semantic/p/victim"` would plan — and then archive + rewrite —
  // the UNRELATED healthy `semantic/p/victim`. The round-6 identity guard cannot
  // catch that: writeMemoryEntryFile derives the canonical path from `entry.id`,
  // so the victim's own .md (which really does carry the victim's id) is accepted.
  // isRewritableEntry then drops rows that are key-consistent but still not
  // well-formed rewrite targets — a missing `type` (which would throw in
  // canonicalMemoryPath) or a missing `title`/`scope` (which the renderer would
  // serialize as the literal "undefined", degrading the record this command only
  // meant to stamp `archived` on) — or a `status` that isn't one of the four
  // MemoryEntry statuses at all (round-27: `planArchival`'s `archivable()` only
  // excludes `pinned`/`archived`, so a row reading `status: "blocked"` counted
  // as archivable and would be silently FLIPPED to `archived` by the expired /
  // unused-low-value rules — mutating a corrupt row this filter must skip).
  // Same predicate memory-unarchive validates with, so the two write paths can't
  // drift. Report how many rows, across both filters, were skipped.
  const rawCount = Object.keys(idx.entries ?? {}).length;
  const entries = Object.keys((idx.entries ?? {}) as Record<string, unknown>)
    .filter((key) => validEntryExists(idx.entries, key))
    .map((key) => (idx.entries as Record<string, MemoryEntry>)[key])
    .filter(isRewritableEntry);
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
  //   - overlay absent, or on an EARLIER calendar day than local → local is authoritative → archivable.
  //   - overlay on a LATER calendar day → a newer remote edit; archiving+restamping
  //     local (day-only updatedAt) could win the next merge and clobber it → skip.
  //   - overlay on the SAME calendar day → skip ONLY IF it substantively DIFFERS from
  //     local (a same-day sibling edit we could clobber, including a body-only edit); an
  //     equivalent synced copy is archivable normally. (Round-30: those orderings are
  //     chronological, not lexical — see `isOverlayConflict`.)
  //
  // The overlay index is read STRICTLY here. `loadMemoryIndex` intentionally turns
  // an unreadable/corrupt index into an EMPTY one — right for read paths, wrong on
  // this MUTATION path: with a corrupt overlay index EVERY local candidate would
  // look overlay-absent, so the whole store becomes archivable/restampable and can
  // clobber sibling state wholesale on the next merge. So we distinguish "overlay
  // genuinely absent / no index file" (proceed; the normal local-only case) from
  // "overlay index exists but is unreadable" (fail closed: archive NOTHING this run).
  const view = resolveMemoryView(cfg.repoPath);
  const overlayLoad: MemoryIndexLoad = view.roots.overlay
    ? loadMemoryIndexStrict(view.roots.overlay)
    : { kind: "absent" };

  let localWinners: MemoryEntry[];
  if (overlayLoad.kind === "corrupt") {
    console.warn(
      "memory-archive: overlay index unreadable — skipping archival this run to avoid clobbering sibling state",
    );
    localWinners = []; // archive nothing rather than archive everything
  } else {
    const overlayEntries: Record<string, unknown> = overlayLoad.kind === "ok" ? overlayLoad.index.entries : {};
    const inCrossDeviceConflict = (e: MemoryEntry): boolean =>
      isOverlayConflict(e, overlayEntries[e.id], { local: cfg.repoPath, overlay: view.roots.overlay });
    localWinners = entries.filter((e) => !inCrossDeviceConflict(e));
    const skippedOverlay = entries.length - localWinners.length;
    if (skippedOverlay > 0) {
      console.warn(`memory-archive: skipped ${skippedOverlay} id(s) in a cross-device conflict (a sibling holds a newer or divergent same-day copy)`);
    }
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
    // Defense in depth for the key/id confusion filtered above: re-assert at the
    // write sink that the row we resolve for this id is actually FILED under it.
    // The plan is a list of ids, but the write derives its .md path from the
    // resolved row's `id` — so if the two ever disagreed, we would rewrite a
    // record the plan never named. Skip rather than write the wrong file.
    if (!validEntryExists(idx.entries, id)) continue;
    const e = (idx.entries as Record<string, MemoryEntry>)[id];
    // Re-assert the row-shape gate at the write sink too: only a row complete
    // enough to be re-rendered faithfully may reach writeMemoryEntryFile.
    if (!isRewritableEntry(e)) continue;
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
  //
  // Round-17: validation up front is not enough on its own. The N .md rewrites
  // land BEFORE the single saveMemoryIndex, so a failure at (or after) the first
  // write leaves rewritten files claiming `archived` while the index still says
  // active — for the batch path, the WHOLE plan diverges at once, unattended
  // (digest runs this automatically). Capture every target's original bytes
  // first; on any failure restore all of them byte-for-byte and rethrow with
  // context. A rollback that itself fails is named as a PARTIAL ROLLBACK rather
  // than swallowed.
  //
  // Round-18: that rollback only reaches the .md side, so it restores real
  // CONSISTENCY only because saveMemoryIndex is atomic (temp file + rename) and
  // leaves the intact old index behind when it throws. Before that, an ENOSPC
  // could truncate the index mid-write and the "rollback" would land us on a
  // corrupt index rather than the pre-run state.
  const snapshots = planned.map((next) => snapshotMemoryEntryFile(cfg.repoPath, next));
  let archived = 0;
  try {
    for (const next of planned) {
      writeMemoryEntryFile(cfg.repoPath, next); // guarded canonical-path write (bypasses the active-coercion allowlist)
      idx.entries[next.id] = next;
      archived++;
    }
  } catch (err) {
    rollbackMemoryWrites("memory-archive: a .md rewrite failed mid-batch", snapshots, err);
  }
  if (archived > 0) {
    try {
      saveMemoryIndex(cfg.repoPath, idx);
    } catch (err) {
      rollbackMemoryWrites("memory-archive: index save failed", snapshots, err);
    }
  }
  console.log(opts.json ? JSON.stringify({ archived }) : `archived ${archived}`);
}
