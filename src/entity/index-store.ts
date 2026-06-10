import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { REPO_DATA_DIR } from "../_shared/repo-data-dir.js";
import { emptyEntityIndex, entityKey, type EntityPage, type EntityIndex } from "./types.js";

export const ENTITY_INDEX_REL = `${REPO_DATA_DIR}/index.entity.json`;

export function loadEntityIndex(repoRoot: string): EntityIndex {
  const p = join(repoRoot, ENTITY_INDEX_REL);
  if (!existsSync(p)) return emptyEntityIndex();
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8")) as EntityIndex;
    if (parsed.version !== 1 || !parsed.entries) return emptyEntityIndex();
    return parsed;
  } catch {
    return emptyEntityIndex();
  }
}

export function saveEntityIndex(repoRoot: string, idx: EntityIndex): void {
  const p = join(repoRoot, ENTITY_INDEX_REL);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(idx, null, 2) + "\n");
}

export function upsertEntity(idx: EntityIndex, entry: EntityPage): void {
  idx.entries[entityKey(entry)] = entry;
}
