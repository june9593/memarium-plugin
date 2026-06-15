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

function typeLabel(d: DiffDisplay): string {
  return d.status === "pinned" ? `[${d.type}] [pinned]` : `[${d.type}]`;
}

/** Default mode: scannable, one proposal per 3 short lines. No body, no ∅. */
function renderList(views: DiffView[]): string {
  if (views.length === 0) return "No pending memory proposals.";
  const lines: string[] = [
    `${views.length} pending memory proposal(s) — review before approving (do NOT blind-approve)`,
    "",
  ];
  views.forEach((v, i) => {
    const d = v.display;
    const changes = d.changedFields.length ? ` · changes: ${d.changedFields.join(", ")}` : "";
    lines.push(`[${i + 1}] ${typeLabel(d)} ${d.targetKey} (${d.action}${changes})`);
    lines.push(`    ${d.summary}`);
    const src = d.sourceSession ? `src ${d.sourceSession} · ` : "";
    lines.push(`    ${src}imp ${d.importance}`);
  });
  lines.push("");
  lines.push("Full body: memory-diff --id <targetKey>");
  lines.push("Apply: memory-approve --id <targetKey> (one at a time) · Discard: memory-reject --id <targetKey>");
  return lines.join("\n");
}

/** --id mode: one proposal in full — body + (for updates) old→new field changes. */
function renderDetail(v: DiffView): string {
  const d = v.display;
  const lines: string[] = [
    `${typeLabel(d)} ${d.targetKey} (${d.action})`,
    `src ${d.sourceSession ?? "—"} · imp ${d.importance} · conf ${d.confidence}`,
  ];
  if (d.rationale) lines.push(`rationale: ${d.rationale}`);
  if (d.action !== "create" && v.fieldChanges.length) {
    lines.push("changes:");
    for (const c of v.fieldChanges) lines.push(`  ${c.field}: ${c.old ?? "(none)"} → ${c.new ?? "(none)"}`);
  }
  lines.push("--- proposed body ---");
  lines.push(v.newBody.split("\n").map((l) => `    ${l}`).join("\n"));
  lines.push("");
  lines.push(`Apply: memory-approve --id ${d.targetKey} · Discard: memory-reject --id ${d.targetKey}`);
  return lines.join("\n");
}

/** Read-only. Returns pending proposals as DiffView[] (one if --id): a field-level diff against
 *  the CURRENT live entry, plus the proposed body and a reference (path) to the
 *  current live entry — NOT a line-by-line body diff. Never writes; exit 0 always. */
export async function buildMemoryDiffViews(opts: MemoryDiffOptions): Promise<DiffView[]> {
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  let proposals: MemoryProposal[];
  if (opts.id) {
    const one = readProposal(cfg.repoPath, opts.id);
    proposals = one ? [one] : [];
  } else {
    proposals = listProposals(cfg.repoPath);
  }
  return proposals.map((p) => buildView(p, idx.entries[p.targetKey]));
}

/** Read-only. Lists pending proposals (one if --id): a field-level diff against
 *  the CURRENT live entry, plus the proposed body and a reference (path) to the
 *  current live entry — NOT a line-by-line body diff. Never writes; exit 0 always. */
export async function memoryDiffCmd(opts: MemoryDiffOptions): Promise<void> {
  try {
    const views = await buildMemoryDiffViews(opts);
    if (opts.json) { console.log(JSON.stringify(views, null, 2)); return; }
    if (opts.id) { console.log(views.length ? renderDetail(views[0]) : "No pending memory proposals."); return; }
    console.log(renderList(views));
  } catch (e) {
    // Read-only + non-fatal: never throw. But surface a clear message instead
    // of silently printing nothing, so a real misconfiguration is visible.
    if (opts.json) { console.log("[]"); return; }
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`memory-diff: unable to read proposals (${msg})`);
  }
}
