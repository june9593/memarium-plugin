import { existsSync, readFileSync } from "node:fs";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { applyMemoryItems, type MemoryApplyItem } from "../memory/apply.js";
import { isGatedChange } from "../memory/gate.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryWriteOptions { inputPath?: string; }
export interface MemoryWriteReport { written: number; superseded: number; paths: string[]; }

interface InputItem { entry: MemoryEntry; body: string; }

export async function memoryWriteCmd(opts: MemoryWriteOptions): Promise<MemoryWriteReport> {
  if (!opts.inputPath || !existsSync(opts.inputPath)) {
    throw new Error(`memory-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync(opts.inputPath, "utf8")) as InputItem[];
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);

  // Hard gate (fail closed): if ANY item is a gated change, reject the whole
  // batch before writing anything. Gated changes must go through memory-propose.
  for (const { entry } of items) {
    if (isGatedChange(entry, idx.entries)) {
      throw new Error(
        `memory-write: refusing gated change to "${entry.id}" (core/procedural/pinned, or it edits/supersedes one) — use memory-propose`,
      );
    }
  }

  return applyMemoryItems(cfg.repoPath, items as MemoryApplyItem[]);
}
