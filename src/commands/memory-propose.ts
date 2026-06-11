import { existsSync, readFileSync } from "node:fs";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { isGatedChange, targetKey, deriveAction } from "../memory/gate.js";
import { writeProposal, flatTargetKey, type MemoryProposal } from "../memory/proposal-store.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryProposeOptions { inputPath?: string; }
export interface MemoryProposeReport { proposed: number; paths: string[] }

interface InputItem { entry: MemoryEntry; body: string; rationale?: string; sourceSession?: string; }

export async function memoryProposeCmd(opts: MemoryProposeOptions): Promise<MemoryProposeReport> {
  if (!opts.inputPath || !existsSync(opts.inputPath)) {
    throw new Error(`memory-propose: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync(opts.inputPath, "utf8")) as InputItem[];
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);

  // Validate every item is a gated change before writing any proposal.
  for (const { entry } of items) {
    if (!isGatedChange(entry, idx.entries)) {
      throw new Error(
        `memory-propose: "${entry.id}" is not a gated change (not core/procedural/pinned and does not edit/supersede one) — use memory-write`,
      );
    }
  }

  const paths: string[] = [];
  for (const { entry, body, rationale, sourceSession } of items) {
    const tKey = targetKey(entry);
    const p: MemoryProposal = {
      proposalId: flatTargetKey(tKey),
      targetKey: tKey,
      proposedEntryId: entry.id,
      action: deriveAction(entry, idx.entries),
      rationale: rationale ?? null,
      sourceSession: sourceSession ?? null,
      createdAt: new Date().toISOString(),
      proposal: { entry, body },
    };
    paths.push(writeProposal(cfg.repoPath, p));
  }
  return { proposed: items.length, paths };
}
