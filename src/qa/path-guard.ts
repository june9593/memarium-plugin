import { lstatSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Refuse to operate on `targetAbs` if ANY path component between `repoPath`
 * and `targetAbs` is a symlink. Walks each existing component with lstatSync
 * (which does NOT follow links), so a symlinked ancestor (e.g. `memory`),
 * the leaf (`memory/qa`), or a broken symlink is all caught BEFORE any mkdir
 * or directory walk can follow it outside the repo. Components that don't
 * exist yet are fine — they'll be freshly created, and a fresh mkdir cannot
 * be a pre-existing symlink.
 */
export function assertNoSymlinkedComponent(repoPath: string, targetAbs: string, label: string): void {
  const rel = relative(repoPath, targetAbs);
  // Outside repoPath (or equal to it) → not our concern here. Use a precise
  // check: a literal ".." segment, NOT any name that merely starts with "..".
  if (rel === "" || rel === ".." || rel.startsWith(".." + sep)) return;
  let cur = repoPath;
  for (const seg of rel.split(sep)) {
    if (!seg) continue;
    cur = join(cur, seg);
    let st;
    try {
      st = lstatSync(cur);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return; // nothing below exists yet
      throw e;
    }
    if (st.isSymbolicLink()) {
      throw new Error(`${label}: refusing to operate through a symlinked path component (symlink guard): ${seg}`);
    }
  }
}
