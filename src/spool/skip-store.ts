import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPO_DATA_DIR, dataDirAbs } from "../_shared/repo-data-dir.js";

/**
 * Local ledger of digest-SKIP'd sessions — replaces the book-era `skip:true`
 * chronicles. It records "this session was considered and intentionally NOT
 * turned into memory" so prepare/list-projects don't re-propose it every
 * digest, WITHOUT writing a memory entry that would pollute recall.
 *
 * Local-only: never staged by sync, never cross-device aggregated — exactly
 * like the old local `index.book.json` consumed-set (which also never synced).
 */
export const SKIP_INDEX_REL = `${REPO_DATA_DIR}/index.skips.json`;

export interface SkipEntry { reason: string; at: string; }
export interface SkipIndex { version: 1; sessions: Record<string, SkipEntry>; }

export function loadSkips(repoRoot: string): SkipIndex {
  const p = join(repoRoot, SKIP_INDEX_REL);
  if (!existsSync(p)) return { version: 1, sessions: {} };
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8")) as SkipIndex;
    if (parsed?.version !== 1 || typeof parsed.sessions !== "object" || !parsed.sessions) {
      return { version: 1, sessions: {} };
    }
    return parsed;
  } catch {
    return { version: 1, sessions: {} }; // corrupt → empty; never break a digest
  }
}

export function saveSkips(repoRoot: string, idx: SkipIndex): void {
  mkdirSync(dataDirAbs(repoRoot), { recursive: true });
  writeFileSync(join(repoRoot, SKIP_INDEX_REL), JSON.stringify(idx, null, 2) + "\n");
}

/** Idempotent upsert; returns how many sessions were newly added. Existing
 *  entries keep their original `at` (first-skip timestamp). */
export function upsertSkips(
  idx: SkipIndex,
  sessions: Array<{ sessionId: string; reason?: string }>,
  at: string,
): number {
  let added = 0;
  for (const s of sessions) {
    const id = (s?.sessionId ?? "").trim();
    if (!id) continue;
    if (!idx.sessions[id]) added++;
    idx.sessions[id] = { reason: (s.reason ?? "skipped").slice(0, 200), at: idx.sessions[id]?.at ?? at };
  }
  return added;
}
