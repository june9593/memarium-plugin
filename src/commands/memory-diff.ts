import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { listProposals, readProposal, type MemoryProposal } from "../memory/proposal-store.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryDiffOptions { id?: string; json?: boolean; }

interface FieldChange { field: string; old: string | null; new: string | null; }
interface DiffView {
  targetKey: string;
  proposedEntryId: string;
  action: MemoryProposal["action"];
  rationale: string | null;
  sourceSession: string | null;
  fieldChanges: FieldChange[];
  oldBody: string | null;
  newBody: string;
}

const FIELDS: (keyof MemoryEntry)[] = [
  "type", "scope", "project", "title", "summary", "status",
  "confidence", "importance", "supersedes", "validFrom", "validTo",
];

function str(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function buildView(p: MemoryProposal, live: MemoryEntry | undefined): DiffView {
  const proposed = p.proposal.entry;
  const changes: FieldChange[] = [];
  for (const f of FIELDS) {
    const oldV = live ? str(live[f]) : null;
    const newV = str(proposed[f]);
    if (oldV !== newV) changes.push({ field: String(f), old: oldV, new: newV });
  }
  return {
    targetKey: p.targetKey, proposedEntryId: p.proposedEntryId, action: p.action,
    rationale: p.rationale, sourceSession: p.sourceSession,
    fieldChanges: changes, oldBody: live ? `(current: ${live.path})` : null, newBody: p.proposal.body,
  };
}

function human(views: DiffView[]): string {
  if (views.length === 0) return "No pending memory proposals.\n";
  const lines: string[] = [`# ${views.length} pending memory proposal(s)\n`];
  for (const v of views) {
    lines.push(`## ${v.targetKey}  [${v.action}]  (proposes ${v.proposedEntryId})`);
    if (v.rationale) lines.push(`rationale: ${v.rationale}`);
    if (v.sourceSession) lines.push(`source: ${v.sourceSession}`);
    if (v.fieldChanges.length === 0) {
      lines.push("(no field changes vs current live entry — may be stale; consider memory-reject)");
    } else {
      lines.push("fields:");
      for (const c of v.fieldChanges) lines.push(`  - ${c.field}: ${c.old ?? "∅"} → ${c.new ?? "∅"}`);
    }
    lines.push("body:");
    if (v.oldBody) lines.push(`  old: ${v.oldBody}`);
    lines.push(`  new (${v.newBody.split("\n").length} line(s)):`);
    lines.push(v.newBody.split("\n").map((l) => `    ${l}`).join("\n"));
    lines.push(`\n→ apply: memory-approve --id ${v.targetKey}   |   discard: memory-reject --id ${v.targetKey}\n`);
  }
  return lines.join("\n") + "\n";
}

/** Read-only. Lists pending proposals (one if --id) with a field-level + body
 *  diff against the CURRENT live entry. Never writes; exit 0 always. */
export async function memoryDiffCmd(opts: MemoryDiffOptions): Promise<void> {
  try {
    const cfg = readPluginConfig();
    const idx = loadMemoryIndex(cfg.repoPath);
    let proposals: MemoryProposal[];
    if (opts.id) {
      const one = readProposal(cfg.repoPath, opts.id);
      proposals = one ? [one] : [];
    } else {
      proposals = listProposals(cfg.repoPath);
    }
    const views = proposals.map((p) => buildView(p, idx.entries[p.targetKey]));
    console.log(opts.json ? JSON.stringify(views, null, 2) : human(views).trimEnd());
  } catch {
    if (opts.json) console.log("[]");
  }
}
