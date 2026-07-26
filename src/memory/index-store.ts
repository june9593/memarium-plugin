import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

export function saveMemoryIndex(repoRoot: string, idx: MemoryIndex): void {
  const p = join(repoRoot, MEMORY_INDEX_REL);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(idx, null, 2) + "\n");
}

export function upsertMemory(idx: MemoryIndex, entry: MemoryEntry): void {
  idx.entries[memoryKey(entry)] = entry;
}
