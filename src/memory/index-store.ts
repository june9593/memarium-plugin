import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeFileAtomicSync } from "../_shared/atomic-write.js";
import { REPO_DATA_DIR } from "../_shared/repo-data-dir.js";
import { emptyMemoryIndex, memoryKey, type MemoryEntry, type MemoryIndex } from "./types.js";

export const MEMORY_INDEX_REL = `${REPO_DATA_DIR}/index.memory.json`;

/** Outcome of a STRICT index read.
 *
 *  `loadMemoryIndex` deliberately collapses "no index file" and "an index file
 *  that exists but is unreadable/corrupt" into the SAME empty index. That is the
 *  right degradation for READ paths (recall/primer just see nothing), but it is
 *  wrong — and unsafe — on a MUTATION path that uses an index as a write GUARD:
 *  a corrupt overlay index would make every local id look overlay-ABSENT, so
 *  every candidate becomes archivable/restampable and the cross-device clobber
 *  guard fails open exactly when it matters most. Callers that guard writes must
 *  use this variant and treat `corrupt` as "refuse", not as "empty". */
export type MemoryIndexLoad =
  | { kind: "absent" }
  | { kind: "ok"; index: MemoryIndex }
  | { kind: "corrupt"; reason: string };

/** Read the memory index, distinguishing absent from corrupt. `ok` guarantees a
 *  v1 index whose `entries` is a real (non-null, non-array) object. */
export function loadMemoryIndexStrict(repoRoot: string): MemoryIndexLoad {
  const p = join(repoRoot, MEMORY_INDEX_REL);
  if (!existsSync(p)) return { kind: "absent" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(p, "utf8"));
  } catch (err) {
    return { kind: "corrupt", reason: `unparseable JSON (${(err as Error).message})` };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "corrupt", reason: "not a JSON object" };
  }
  const obj = parsed as { version?: unknown; entries?: unknown };
  if (obj.version !== 1) return { kind: "corrupt", reason: `unsupported index version ${JSON.stringify(obj.version)}` };
  if (!obj.entries || typeof obj.entries !== "object" || Array.isArray(obj.entries)) {
    return { kind: "corrupt", reason: "missing or non-object `entries` map" };
  }
  return { kind: "ok", index: parsed as MemoryIndex };
}

/** Lenient read for the many READ paths: absent OR corrupt → an empty index. */
export function loadMemoryIndex(repoRoot: string): MemoryIndex {
  const loaded = loadMemoryIndexStrict(repoRoot);
  return loaded.kind === "ok" ? loaded.index : emptyMemoryIndex();
}

/** ATOMIC whole-file write: serialize into a sibling temp file, flush it, then
 *  `renameSync` over the target. `rename(2)` within one directory is atomic, so
 *  the index on disk is ALWAYS either the complete old content or the complete
 *  new content — never a truncated middle state.
 *
 *  This is not a nicety. `writeFileSync` straight onto the target TRUNCATES it
 *  first, so a failure part-way through (ENOSPC being the canonical one) used to
 *  leave a half-written index behind — which `loadMemoryIndexStrict` then reports
 *  as `corrupt`, i.e. the fail-closed write guards refuse and the archival
 *  commands wedge. Worse, the archival commands roll their `.md` rewrites back
 *  when this function throws (see `rollbackMemoryWrites`): that rollback is only
 *  meaningful if the index it leaves in place is the intact PRE-run one, which
 *  is exactly what the rename buys.
 *
 *  The write itself is delegated to `_shared/atomic-write`, which `usage-store`'s
 *  `saveUsage` now shares (both had drifting copies of the idiom). Round-39: the
 *  temp file is created EXCLUSIVELY and under a UNIQUE name — `"w"` follows a
 *  pre-planted SYMLINK and truncates its target, and a deterministic
 *  `<file>.tmp-<pid>` name is shared by every writer in the process. Round-40:
 *  the target's permission bits are re-applied before the rename (a
 *  create-then-rename does not inherit them the way a truncating write did, so a
 *  `chmod 600 index.memory.json` was silently reverted to 0644), and an index
 *  created for the FIRST time is 0600 rather than umask-default. See that module
 *  for the full rationale. */
export function saveMemoryIndex(repoRoot: string, idx: MemoryIndex): void {
  const p = join(repoRoot, MEMORY_INDEX_REL);
  mkdirSync(dirname(p), { recursive: true });
  writeFileAtomicSync(p, JSON.stringify(idx, null, 2) + "\n");
}

export function upsertMemory(idx: MemoryIndex, entry: MemoryEntry): void {
  idx.entries[memoryKey(entry)] = entry;
}
