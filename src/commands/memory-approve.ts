import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { applyMemoryItems } from "../memory/apply.js";
import { readProposal, deleteProposal } from "../memory/proposal-store.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryApproveOptions { id?: string; }
export interface MemoryApproveReport {
  applied: number; written: number; superseded: number;
  primersRefreshed: string[]; path: string;
}

/** Invalidate the cached primer(s) the approved entry affects. SessionStart /
 *  memory-query live-render until the next digest rewrites the cache. A
 *  project-scoped entry touches one primer; a global/user entry touches all. */
function refreshPrimers(repoPath: string, entry: MemoryEntry): string[] {
  const dir = join(repoPath, "memory", "_primer");
  if (!existsSync(dir)) return [];
  const deleted: string[] = [];
  const del = (file: string) => { if (existsSync(file)) { rmSync(file); deleted.push(file); } };
  if (entry.project) {
    del(join(dir, `${entry.project}.md`));
  } else {
    for (const name of readdirSync(dir)) if (name.endsWith(".md")) del(join(dir, name));
  }
  return deleted;
}

export async function memoryApproveCmd(opts: MemoryApproveOptions): Promise<MemoryApproveReport> {
  if (!opts.id) throw new Error("memory-approve: --id <targetKey> is required");
  const cfg = readPluginConfig();
  const prop = readProposal(cfg.repoPath, opts.id);
  if (!prop) throw new Error(`memory-approve: no pending proposal for "${opts.id}"`);

  // Controlled apply: call the gate-agnostic primitive directly (no gate
  // pre-check). This is the ONLY caller permitted to apply a gated change.
  const report = applyMemoryItems(cfg.repoPath, [prop.proposal]);

  // Delete by the proposal's canonical targetKey (not the caller's id form).
  const path = deleteProposal(cfg.repoPath, prop.targetKey) ?? "";
  const primersRefreshed = refreshPrimers(cfg.repoPath, prop.proposal.entry);

  return {
    applied: 1, written: report.written, superseded: report.superseded,
    primersRefreshed, path,
  };
}
