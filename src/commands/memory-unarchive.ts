import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex, loadMemoryIndexStrict, saveMemoryIndex, type MemoryIndexLoad } from "../memory/index-store.js";
import { writeMemoryEntryFile, missingRewriteField, snapshotMemoryEntryFile, rollbackMemoryWrites } from "../memory/apply.js";
import { resolveMemoryView } from "../memory/source-resolver.js";
import { isOverlayConflict } from "../memory/overlay-conflict.js";
import { validEntryExists } from "../memory/lint.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryUnarchiveOptions {
  /** memory id to restore (e.g. "semantic/p/slug"). */
  id: string;
  /** Accepted for CLI symmetry with the other memory-* commands. repoPath is
   *  derived from memariumHome() (HOME-stubbable in tests), so cwd doesn't scope
   *  the store today. */
  cwd?: string;
}

/** Reversible counterpart to `memory-archive`: flip ONE archived entry back to
 *  its PRE-ARCHIVE status, clearing archivedAt/archivedReason and bumping
 *  updatedAt. The pre-archive status is recovered from archivedReason: an entry
 *  archived by the `superseded-cleanup` rule was ALREADY `superseded` before
 *  archival (its replacement is live), so it restores to `superseded` — NOT
 *  `active`, which would reintroduce an obsolete fact alongside its replacement.
 *  Every other reason restores to `active`. The entry's .md is rewritten through
 *  the guarded canonical-path writer (which bypasses the active-coercion
 *  allowlist, so persisting the caller-set status is faithful) and the index row
 *  is updated to match.
 *
 *  No-op (exit 0, message, nothing written) when the id is unknown OR already
 *  non-archived — so re-running it, or aiming it at an active entry, changes
 *  nothing. Idempotent by the same guard. ABORTS (throws, writes nothing) when
 *  the index row filed under the id carries a DIFFERENT id, since the canonical
 *  writer would follow that id and clobber an unrelated record — or when the row
 *  is INCOMPLETE (missing a field the .md re-render needs), since restoring it
 *  would persist a degraded record. */
export async function memoryUnarchiveCmd(opts: MemoryUnarchiveOptions): Promise<void> {
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  const rows = (idx.entries ?? {}) as Record<string, unknown>;
  const raw = rows[opts.id];
  // Genuinely unknown id (absent or a null tombstone) → the documented no-op.
  if (raw === undefined || raw === null) {
    console.log(`not archived: ${opts.id}`);
    return;
  }
  // Round-12: the row is PRESENT, but it must actually be filed under its own id.
  // `writeMemoryEntryFile` derives the canonical .md path from `entry.id`, so a
  // corrupt row filed under `semantic/p/a` while carrying `id: "semantic/p/b"`
  // would be rewritten OVER the unrelated `semantic/p/b` record — and the round-6
  // identity guard would wave it through, because that .md genuinely carries
  // `semantic/p/b`. There is no safe repair here (we cannot know which of the key
  // and the id is the truth), so ABORT and change nothing.
  if (!validEntryExists(rows, opts.id)) {
    throw new Error(`refusing to unarchive ${opts.id}: index row is corrupt (key/id mismatch)`);
  }
  const e = rows[opts.id] as MemoryEntry;
  if (e.status !== "archived") {
    console.log(`not archived: ${opts.id}`);
    return;
  }
  // Round-15: key===id agreement still doesn't prove the row is WELL-FORMED. A
  // partial archived row (valid id/type/project but no `title`, or no `scope`)
  // would sail into writeMemoryEntryFile, and renderMemoryMarkdown would
  // serialize the missing fields as the literal string "undefined" (`title:
  // undefined`, `scope: undefined`, plus a `# undefined` heading) — restoring the
  // entry as a DEGRADED record. There is no safe repair (we can't invent a title),
  // so ABORT and change nothing. Same shared predicate memory-archive filters on,
  // so both write paths into the rewriter demand the same completeness.
  const missing = missingRewriteField(e);
  if (missing) {
    throw new Error(`refusing to unarchive ${opts.id}: index row is incomplete (missing ${missing})`);
  }
  // Cross-device clobber guard (mirrors memory-archive's): restoring a stale
  // LOCAL archived row → active and stamping today's (day-only) updatedAt could
  // win the next merge and clobber a NEWER or same-day DIVERGENT sibling edit the
  // aggregated overlay holds for this id. Compare the overlay's OWN row against
  // the local one; on a genuine conflict, ABORT (one id) rather than silently
  // clobber — the user must resolve it on the device that made the newer edit.
  //
  // Read the overlay index STRICTLY: `loadMemoryIndex` turns a corrupt index into
  // an EMPTY one, which would make this id look overlay-absent and wave the
  // restore through — the guard failing open precisely when the sibling's state is
  // unknown. "No overlay index file at all" still means local-only (proceed);
  // "an overlay index that exists but can't be read" means REFUSE.
  const view = resolveMemoryView(cfg.repoPath);
  const overlayLoad: MemoryIndexLoad = view.roots.overlay
    ? loadMemoryIndexStrict(view.roots.overlay)
    : { kind: "absent" };
  if (overlayLoad.kind === "corrupt") {
    throw new Error(
      `refusing to unarchive ${opts.id}: the aggregated overlay index is unreadable — ` +
      `cannot rule out a newer/divergent copy on another device`,
    );
  }
  const overlayEntries: Record<string, unknown> = overlayLoad.kind === "ok" ? overlayLoad.index.entries : {};
  if (isOverlayConflict(e, overlayEntries[opts.id], { local: cfg.repoPath, overlay: view.roots.overlay })) {
    throw new Error(
      `refusing to unarchive ${opts.id}: a newer/divergent copy exists on another device — resolve there`,
    );
  }
  const now = new Date().toISOString().slice(0, 10);
  // Restore the PRE-ARCHIVE status. `superseded-cleanup` only ever archives an
  // entry that was already `superseded` (Rule 1 in planArchival), so reactivating
  // it to "active" would resurrect an obsolete fact next to its live replacement.
  // Restore it to "superseded" instead; everything else restores to "active".
  const restoreSuperseded = e.archivedReason === "superseded-cleanup";
  // If this entry was archived by the "expired" rule it kept a past validTo.
  // Restoring it to ACTIVE with that validTo intact would make it INVISIBLE on
  // both tiers: scoreMemories/primer/entity reject it as expired (validTo<=now)
  // AND the R2 cold valve no longer sees it (it isn't archived). So clear a
  // past validTo to null on restore; a null/future validTo is left untouched.
  // ONLY for the active-restore path — a restored-superseded entry keeps its
  // validTo untouched (it's hidden by its superseded status regardless).
  const pastValidTo = !restoreSuperseded &&
    typeof e.validTo === "string" && e.validTo !== "" && e.validTo <= now;
  // Fresh spread — writeMemoryEntryFile mutates entry.path to the canonical path.
  const next: MemoryEntry = {
    ...e, status: restoreSuperseded ? "superseded" : "active",
    archivedAt: null, archivedReason: null, updatedAt: now,
    ...(pastValidTo ? { validTo: null } : {}),
  };
  // Capture the .md's CURRENT bytes before touching it, so a failed index save
  // below can put the file back exactly as it was.
  const snapshot = snapshotMemoryEntryFile(cfg.repoPath, next);
  writeMemoryEntryFile(cfg.repoPath, next); // guarded canonical-path write (bypasses active-coercion allowlist)
  idx.entries[opts.id] = next;
  // Round-17: the .md rewrite above already landed. If saveMemoryIndex now fails,
  // the .md says active/superseded while the index still says archived — the two
  // stores silently disagree, and nothing later reconciles them. Undo the rewrite
  // byte-for-byte and rethrow with context (a rollback that itself fails is named
  // in the message rather than hidden). Complements — does not replace — the
  // pre-write validation above.
  //
  // Round-18: undoing the .md restores the PAIR only because saveMemoryIndex is
  // atomic (temp file + rename), so a throwing save leaves the whole old index on
  // disk. A non-atomic save could truncate it, and this rollback would then
  // "restore" us into a corrupt-index state.
  try {
    saveMemoryIndex(cfg.repoPath, idx);
  } catch (err) {
    rollbackMemoryWrites(`unarchive ${opts.id}: index save failed`, [snapshot], err);
  }
  console.log(
    restoreSuperseded
      ? `restored ${opts.id} to superseded (its replacement is live; was archived as superseded-cleanup)`
      : pastValidTo
        ? `restored ${opts.id} (cleared past validTo=${e.validTo} so it is recallable again)`
        : `restored ${opts.id}`,
  );
}
