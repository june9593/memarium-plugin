import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex, saveMemoryIndex } from "../memory/index-store.js";
import { writeMemoryEntryFile } from "../memory/apply.js";
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
 *  nothing. Idempotent by the same guard. */
export async function memoryUnarchiveCmd(opts: MemoryUnarchiveOptions): Promise<void> {
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  const e = idx.entries[opts.id] as MemoryEntry | undefined;
  if (!e || e.status !== "archived") {
    console.log(`not archived: ${opts.id}`);
    return;
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
  writeMemoryEntryFile(cfg.repoPath, next); // guarded canonical-path write (bypasses active-coercion allowlist)
  idx.entries[opts.id] = next;
  saveMemoryIndex(cfg.repoPath, idx);
  console.log(
    restoreSuperseded
      ? `restored ${opts.id} to superseded (its replacement is live; was archived as superseded-cleanup)`
      : pastValidTo
        ? `restored ${opts.id} (cleared past validTo=${e.validTo} so it is recallable again)`
        : `restored ${opts.id}`,
  );
}
