import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { REPO_DATA_DIR } from "../_shared/repo-data-dir.js";
import { emptyMemoryIndex, memoryKey, type MemoryEntry, type MemoryIndex } from "./types.js";

export const MEMORY_INDEX_REL = `${REPO_DATA_DIR}/index.memory.json`;

export function loadMemoryIndex(repoRoot: string): MemoryIndex {
  const p = join(repoRoot, MEMORY_INDEX_REL);
  if (!existsSync(p)) return emptyMemoryIndex();
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8")) as MemoryIndex;
    if (parsed.version !== 1 || !parsed.entries) return emptyMemoryIndex();
    return parsed;
  } catch {
    return emptyMemoryIndex();
  }
}

export function saveMemoryIndex(repoRoot: string, idx: MemoryIndex): void {
  const p = join(repoRoot, MEMORY_INDEX_REL);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(idx, null, 2) + "\n");
}

export function upsertMemory(idx: MemoryIndex, entry: MemoryEntry): void {
  idx.entries[memoryKey(entry)] = entry;
}
