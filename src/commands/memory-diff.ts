import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { listProposals, readProposal, type MemoryProposal } from "../memory/proposal-store.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryDiffOptions { id?: string; json?: boolean; }

interface FieldChange { field: string; old: string | null; new: string | null; }
interface DiffDisplay {
  targetKey: string;
  proposedEntryId: string;
  action: MemoryProposal["action"];
  type: string;
  title: string;
  summary: string;
  scope: string;
  status: string;
  importance: number;
  confidence: number;
  rationale: string | null;
  sourceSession: string | null;
  changedFields: string[];   // [] for create
  bodyLineCount: number;
  bodyPreview: string;       // first 3 lines, capped at 240 chars
}
interface DiffView {
  targetKey: string;
  proposedEntryId: string;
  action: MemoryProposal["action"];
  rationale: string | null;
  sourceSession: string | null;
  fieldChanges: FieldChange[];
  oldBody: string | null;   // reference to current live entry's file path (NOT its body); null on create
  newBody: string;
  display: DiffDisplay;
}

const FIELDS: (keyof MemoryEntry)[] = [
  "type", "scope", "project", "title", "summary", "status",
  "confidence", "importance", "supersedes", "validFrom", "validTo",
];

function str(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function bodyPreview(body: string): string {
  const first3 = body.split("\n").slice(0, 3).join("\n");
  return first3.length <= 240 ? first3 : first3.slice(0, 240);
}

function buildView(p: MemoryProposal, live: MemoryEntry | undefined): DiffView {
  const proposed = p.proposal.entry;
  const changes: FieldChange[] = [];
  for (const f of FIELDS) {
    const oldV = live ? str(live[f]) : null;
    const newV = str(proposed[f]);
    if (oldV !== newV) changes.push({ field: String(f), old: oldV, new: newV });
  }
  const isCreate = p.action === "create" || !live;
  const body = p.proposal.body;
  const display: DiffDisplay = {
    targetKey: p.targetKey,
    proposedEntryId: p.proposedEntryId,
    action: p.action,
    type: String(proposed.type),
    title: proposed.title,
    summary: proposed.summary,
    scope: String(proposed.scope),
    status: String(proposed.status),
    importance: proposed.importance,
    confidence: proposed.confidence,
    rationale: p.rationale,
    sourceSession: p.sourceSession,
    changedFields: isCreate ? [] : changes.map((c) => c.field),
    bodyLineCount: body.split("\n").length,
    bodyPreview: bodyPreview(body),
  };
  return {
    targetKey: p.targetKey, proposedEntryId: p.proposedEntryId, action: p.action,
    rationale: p.rationale, sourceSession: p.sourceSession,
    fieldChanges: changes, oldBody: live ? `(current: ${live.path})` : null, newBody: body,
    display,
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
    if (v.oldBody) lines.push(`current live entry: ${v.oldBody}  (body not shown — read the .md to compare)`);
    lines.push(`proposed body (${v.newBody.split("\n").length} line(s)):`);
    lines.push(v.newBody.split("\n").map((l) => `    ${l}`).join("\n"));
    lines.push(`\n→ apply: memory-approve --id ${v.targetKey}   |   discard: memory-reject --id ${v.targetKey}\n`);
  }
  return lines.join("\n") + "\n";
}

/** Read-only. Lists pending proposals (one if --id): a field-level diff against
 *  the CURRENT live entry, plus the proposed body and a reference (path) to the
 *  current live entry — NOT a line-by-line body diff. Never writes; exit 0 always. */
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
  } catch (e) {
    // Read-only + non-fatal: never throw. But surface a clear message instead
    // of silently printing nothing, so a real misconfiguration is visible.
    if (opts.json) { console.log("[]"); return; }
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`memory-diff: unable to read proposals (${msg})`);
  }
}
