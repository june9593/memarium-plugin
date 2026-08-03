import { randomBytes } from "node:crypto";
import { closeSync, fchmodSync, fsyncSync, openSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
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

/** Mode for a target that does not exist yet.
 *
 *  ROUND-40 — deliberately NOT the umask default. Everything this helper writes
 *  (`index.memory.json`, the `access.json` usage sidecar) is personal memory
 *  content, and under the usual 022 umask a brand-new one lands 0644 —
 *  world-readable on a shared box. 0600 is the right floor for this data.
 *
 *  This DOES change the mode of newly created index/sidecar files versus
 *  pre-round-40 behaviour. That is intentional: it is strictly more restrictive,
 *  and a user who wants them group-readable can still `chmod` once — the
 *  preservation path below will then honour that choice forever after. */
const NEW_FILE_MODE = 0o600;

/** The permission bits (setuid/setgid/sticky included) `target` currently has,
 *  or `NEW_FILE_MODE` if it has none because it does not exist.
 *
 *  A stat failure of ANY kind — ENOENT, a dangling symlink, EACCES on the parent,
 *  a racing unlink — degrades to the restrictive default rather than propagating:
 *  a save must never abort because we could not read a permission bit, and
 *  "unknown" is exactly the case where guessing tight is the safe guess. */
function modeToPreserve(target: string): number {
  try {
    return statSync(target).mode & 0o7777;
  } catch {
    return NEW_FILE_MODE;
  }
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
 *  successfully created is ours to clean up.
 *
 *  ROUND-40 — create-then-rename does not inherit the target's PERMISSIONS the
 *  way the truncating `writeFileSync` it replaced did. The temp is a NEW file, so
 *  it gets the process default (umask-derived, typically 0644), and the rename
 *  then publishes that mode over the target's. A user who had deliberately locked
 *  their index down (`chmod 600 .memarium/index.memory.json`) silently lost the
 *  restriction on the next save — a privacy regression introduced by making the
 *  write atomic. So: re-apply the target's own mode before publishing.
 *
 *  `fchmodSync` ON THE OPEN DESCRIPTOR, not `openSync(tmp, "wx", mode)`:
 *   - the open-time mode argument is masked by the process umask, so it cannot
 *     faithfully reproduce e.g. 0600 (nor 0666, nor a setgid bit); only an
 *     explicit chmod sets the bits verbatim; and
 *   - chmod'ing the fd rather than the temp PATH closes a TOCTOU window — the fd
 *     is pinned to the inode we exclusively created, so no path swap in between
 *     can redirect the permission change at another file. */
export function writeFileAtomicSync(target: string, data: string): void {
  // Read the mode BEFORE we create the temp: `target` is still the file whose
  // permissions we are inheriting, and this must not fail the save (see above).
  const mode = modeToPreserve(target);
  const tmp = tempSiblingPath(target);
  const fd = openSync(tmp, "wx");
  // From here on `tmp` is OURS: every failure below must clean it up.
  try {
    try {
      writeFileSync(fd, data);
      // Publish the target's permissions, not the umask's. On the FD, so it can
      // only ever hit the inode we exclusively created.
      fchmodSync(fd, mode);
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
