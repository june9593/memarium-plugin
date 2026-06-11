import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { REPO_DATA_DIR } from "../_shared/repo-data-dir.js";
import { emptyQaIndex, qaKey, type QaEntry, type QaIndex } from "./types.js";

export const QA_INDEX_REL = `${REPO_DATA_DIR}/index.qa.json`;

export function loadQaIndex(repoRoot: string): QaIndex {
  const p = join(repoRoot, QA_INDEX_REL);
  if (!existsSync(p)) return emptyQaIndex();
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8")) as QaIndex;
    if (parsed.version !== 1 || !parsed.entries) return emptyQaIndex();
    return parsed;
  } catch {
    return emptyQaIndex();
  }
}

export function saveQaIndex(repoRoot: string, idx: QaIndex): void {
  const p = join(repoRoot, QA_INDEX_REL);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(idx, null, 2) + "\n");
}

export function upsertQa(idx: QaIndex, entry: QaEntry): void {
  idx.entries[qaKey(entry)] = entry;
}
