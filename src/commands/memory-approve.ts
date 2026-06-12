import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { applyMemoryItems } from "../memory/apply.js";
import { readProposal, deleteProposal } from "../memory/proposal-store.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import { isSafePathSegment } from "../memory/gate.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryApproveOptions { id?: string; }
export interface MemoryApproveReport {
  applied: number; written: number; superseded: number;
  primersRefreshed: string[]; path: string;
}

/** Invalidate the cached primer(s) the approved entry affects. Only an explicit
 *  "project:<slug>" scope targets a single primer; anything else (global / user
 *  / unknown / malformed scope) invalidates ALL primers — matching the
 *  whole-store treatment elsewhere. Guards each delete with the symlink check
 *  and validates the derived slug so a crafted scope can't escape _primer/. */
function refreshPrimers(repoPath: string, entry: MemoryEntry): string[] {
  const dir = join(repoPath, "memory", "_primer");
  if (!existsSync(dir)) return [];
  assertNoSymlinkedComponent(repoPath, dir, "memory-approve");
  const deleted: string[] = [];
  const del = (file: string) => {
    if (!existsSync(file)) return;
    assertNoSymlinkedComponent(repoPath, file, "memory-approve");
    rmSync(file);
    deleted.push(file);
  };
  const deleteAll = () => {
    for (const name of readdirSync(dir)) if (name.endsWith(".md")) del(join(dir, name));
  };

  const scope = typeof entry.scope === "string" ? entry.scope : "";
  const project = scope.startsWith("project:") ? scope.slice("project:".length) : null;
  if (project && isSafePathSegment(project)) {
    del(join(dir, `${project}.md`));
  } else {
    deleteAll();
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

  // Dequeue BEFORE refreshing primers: if primer refresh throws (e.g. a
  // symlinked _primer trips the guard), the proposal is already removed so a
  // re-approve can't reapply the change.
  const path = deleteProposal(cfg.repoPath, prop.targetKey);
  if (!path) {
    throw new Error(
      `memory-approve: applied "${prop.targetKey}" to live memory, but its proposal could not be removed from the queue — remove it manually`,
    );
  }

  const primersRefreshed = refreshPrimers(cfg.repoPath, prop.proposal.entry);

  return {
    applied: 1, written: report.written, superseded: report.superseded,
    primersRefreshed, path,
  };
}
