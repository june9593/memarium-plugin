import { readPluginConfig } from "../spool/plugin-config.js";
import { readProposal, deleteProposal } from "../memory/proposal-store.js";

export interface MemoryRejectOptions { id?: string; }
export interface MemoryRejectReport { rejected: number; path: string; }

export async function memoryRejectCmd(opts: MemoryRejectOptions): Promise<MemoryRejectReport> {
  if (!opts.id) throw new Error("memory-reject: --id <targetKey> is required");
  const cfg = readPluginConfig();
  const prop = readProposal(cfg.repoPath, opts.id);
  if (!prop) {
    throw new Error(`memory-reject: no pending proposal for "${opts.id}"`);
  }
  const path = deleteProposal(cfg.repoPath, prop.targetKey) ?? "";
  return { rejected: 1, path };
}
