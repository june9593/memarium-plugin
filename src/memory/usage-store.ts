import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { writeFileAtomicSync } from "../_shared/atomic-write.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import { memariumHome } from "../memarium-home.js";
import type { MemoryEntry } from "./types.js";

/** One memory's local usage signal. Lives ONLY in the device-local sidecar,
 *  never in the synced index. */
export interface UsageRecord { count: number; lastAccess: string }
export type UsageMap = Record<string, UsageRecord>;

/** Device-local usage dir, OUTSIDE the git repo so accessCount never syncs,
 *  aggregates, or churns the synced `index.memory.json`. Namespaced per
 *  session-repo (same scheme as the v4 proposal queue) so multiple repos on one
 *  device can't collide. */
export function usageDir(repoPath: string): string {
  const repoHash = createHash("sha256").update(resolve(repoPath)).digest("hex").slice(0, 12);
  return join(memariumHome(), "usage", repoHash);
}

function usageFile(repoPath: string): string {
  return join(usageDir(repoPath), "access.json");
}

/** Refuse to operate if any component under `~/.memarium` is a symlink, so the
 *  sidecar can't be redirected to write elsewhere. (We don't guard
 *  `~/.memarium` itself — a user may legitimately symlink their memarium home.) */
function guardUsagePath(targetAbs: string): void {
  assertNoSymlinkedComponent(memariumHome(), targetAbs, "usage-store");
}

/** Corrupt-safe load: a missing OR malformed sidecar yields an empty map and
 *  NEVER throws. A recall must not crash because the local usage file got
 *  truncated/garbled (these interrupt-written files are the most likely to
 *  corrupt). Malformed individual records are dropped, not trusted. */
export function loadUsage(repoPath: string): UsageMap {
  let file: string;
  try { file = usageFile(repoPath); } catch { return {}; }
  try { guardUsagePath(file); } catch { return {}; }
  if (!existsSync(file)) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(file, "utf8")); } catch { return {}; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: UsageMap = {};
  for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const count = (v as Record<string, unknown>).count;
    const lastAccess = (v as Record<string, unknown>).lastAccess;
    if (typeof count === "number" && isFinite(count)) {
      // Clamp to a non-negative integer. A hand-edited/corrupt sidecar could
      // carry a negative or fractional count; a negative count would actively
      // DEMOTE a memory (the opposite of the intent), so floor + max(0).
      out[id] = {
        count: Math.max(0, Math.floor(count)),
        lastAccess: typeof lastAccess === "string" ? lastAccess : "",
      };
    }
  }
  return out;
}

/** Atomic write: unique temp sibling + rename, so an interrupted write can't
 *  leave a half-written (corrupt) sidecar in place.
 *
 *  Round-39: this used to be its own copy of the idiom, with the SAME two holes
 *  `saveMemoryIndex` had — `writeFileSync`'s implicit `"w"` FOLLOWS a symlink
 *  planted at the temp path (and `guardUsagePath` only walks the DIRECTORY chain,
 *  so the temp leaf itself was unguarded), and `access.json.tmp-<pid>` is one
 *  shared name for every writer in the process. Both call sites now go through
 *  `_shared/atomic-write`, which creates the temp exclusively (`O_EXCL`) under a
 *  unique name. */
function saveUsage(repoPath: string, usage: UsageMap): void {
  const dir = usageDir(repoPath);
  guardUsagePath(dir);
  mkdirSync(dir, { recursive: true });
  writeFileAtomicSync(usageFile(repoPath), JSON.stringify(usage, null, 2) + "\n");
}

/** Increment count + set lastAccess for each id (load → mutate → atomic save).
 *  Touches ONLY the local sidecar — never the synced index. Each id counts at
 *  most +1 per call (deduped). No-op on empty input. */
export function bumpUsage(repoPath: string, ids: string[], now: string): void {
  if (ids.length === 0) return;
  const usage = loadUsage(repoPath);
  for (const id of new Set(ids)) {
    const rec = usage[id] ?? { count: 0, lastAccess: "" };
    rec.count += 1;
    rec.lastAccess = now;
    usage[id] = rec;
  }
  saveUsage(repoPath, usage);
}

/** Overlay local usage onto in-memory entries (mutates accessCount/lastAccess).
 *  IN-MEMORY ONLY — callers must never persist these entries back to the synced
 *  index (that would defeat the whole local-first design). Entries without a
 *  usage record keep their existing values. */
export function overlayUsage(entries: MemoryEntry[], usage: UsageMap): void {
  for (const e of entries) {
    const rec = usage[e.id];
    if (rec) {
      e.accessCount = rec.count;
      if (rec.lastAccess) e.lastAccess = rec.lastAccess;
    }
  }
}
