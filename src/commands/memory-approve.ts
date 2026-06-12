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

/** Invalidate the cached primer(s) the approved entry affects. SessionStart /
 *  memory-query live-render until the next digest rewrites the cache. The
 *  affected project is derived from entry.scope (authoritative): a
 *  "project:<slug>" scope touches that one primer; "global"/"user" (or an
 *  unknown/unsafe scope) touches all. Guards each delete with the symlink check
 *  and validates the derived slug so a crafted scope can't escape _primer/. */
function refreshPrimers(repoPath: string, entry: MemoryEntry): string[] {
  const dir = join(repoPath, "memory", "_primer");
  if (!existsSync(dir)) return [];
  // Guard the directory itself before any readdir/walk.
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
  let project: string | null;
  if (scope.startsWith("project:")) project = scope.slice("project:".length);
  else if (scope === "global" || scope === "user") project = null;
  else project = typeof entry.project === "string" ? entry.project : null;

  if (project && isSafePathSegment(project)) {
    del(join(dir, `${project}.md`));
  } else {
    // global/user scope, or an unknown/unsafe project → clear all primers
    // (safe: only touches _primer/*.md, and primers regenerate on next digest).
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
  const primersRefreshed = refreshPrimers(cfg.repoPath, prop.proposal.entry);

  // Don't mask a cleanup failure: the change is applied, but if the proposal
  // can't be removed from the queue the user must know (it would otherwise
  // keep showing as "pending" in memory-diff).
  const path = deleteProposal(cfg.repoPath, prop.targetKey);
  if (!path) {
    throw new Error(
      `memory-approve: applied "${prop.targetKey}" to live memory, but its proposal could not be removed from the queue — remove it manually`,
    );
  }

  return {
    applied: 1, written: report.written, superseded: report.superseded,
    primersRefreshed, path,
  };
}
