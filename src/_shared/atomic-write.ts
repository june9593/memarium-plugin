import { randomBytes } from "node:crypto";
import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

/** Monotonic per-process counter, so two writes cannot draw the same suffix even
 *  inside one millisecond and even if `randomBytes` were somehow repeated. */
let seq = 0;

/** A UNIQUE temp sibling of `target`.
 *
 *  Sibling (same directory) is load-bearing: `rename(2)` is only atomic WITHIN a
 *  filesystem, and a temp in `/tmp` would fail with EXDEV across devices.
 *
 *  Unique is load-bearing too. A DETERMINISTIC name (`<file>.tmp-<pid>`, which is
 *  what both call sites used through round-38) is shared by every writer in the
 *  same process — two saves of the same file, or two repos resolving to the same
 *  dir — so one writer's serialize could interleave with the other's, and the
 *  rename would publish a spliced file. pid + counter + 8 random hex digits makes
 *  the name unguessable from outside and unrepeatable from inside. */
function tempSiblingPath(target: string): string {
  seq = (seq + 1) % 0x1000000;
  const uniq = `${process.pid}-${seq.toString(36)}-${randomBytes(4).toString("hex")}`;
  return join(dirname(target), `${basename(target)}.tmp-${uniq}`);
}

/** ATOMIC whole-file write: serialize into a unique temp sibling, flush it, then
 *  `renameSync` over `target`. `rename(2)` within one directory is atomic, so the
 *  file on disk is ALWAYS either the complete old content or the complete new
 *  content — never a truncated middle state. Shared by `saveMemoryIndex` and
 *  `usage-store.saveUsage`, which had two drifting copies of this idiom.
 *
 *  ROUND-39 — the temp file is created EXCLUSIVELY (`"wx"` = `O_CREAT|O_EXCL`),
 *  not with `"w"`. `"w"` is `O_CREAT|O_TRUNC` WITHOUT `O_EXCL`, and it FOLLOWS
 *  SYMLINKS: anything pre-planted at the temp path — a symlink to `~/.ssh/config`,
 *  to a source file, to another repo's index — was silently opened and TRUNCATED,
 *  turning an index save into an arbitrary-file write. (This codebase already
 *  treats symlinked paths as an attack surface: see `assertNoSymlinkedComponent`
 *  in `qa/path-guard.ts`, which the memory write paths run. That guard covers the
 *  DIRECTORY chain; `O_EXCL` is what covers the leaf we are about to create.)
 *  `"wx"` fails loudly with EEXIST instead — on a symlink, a regular file, or a
 *  concurrent writer that happened to draw the same name.
 *
 *  Note the `openSync` sits OUTSIDE the cleanup `try` ON PURPOSE: if the open
 *  fails we did NOT create that path, so removing it would be deleting someone
 *  else's file (exactly the thing this fix exists to prevent). Only a temp we
 *  successfully created is ours to clean up. */
export function writeFileAtomicSync(target: string, data: string): void {
  const tmp = tempSiblingPath(target);
  const fd = openSync(tmp, "wx");
  // From here on `tmp` is OURS: every failure below must clean it up.
  try {
    try {
      writeFileSync(fd, data);
      // Flush BEFORE publishing: with delayed allocation an ENOSPC can surface
      // only at fsync/close time, and the rename must never publish a short file.
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, target);
  } catch (err) {
    try { rmSync(tmp, { force: true }); } catch { /* best effort — never mask `err` */ }
    throw err;
  }
}
