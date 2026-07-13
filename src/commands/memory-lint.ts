import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { MEMORY_INDEX_REL } from "../memory/index-store.js";
import { ENTITY_INDEX_REL } from "../entity/index-store.js";
import { QA_INDEX_REL } from "../qa/index-store.js";
import { emptyMemoryIndex, type MemoryIndex, type MemoryEntry } from "../memory/types.js";
import { emptyEntityIndex, type EntityIndex } from "../entity/types.js";
import { emptyQaIndex, type QaIndex } from "../qa/types.js";
import { lintMemory, type LintFinding, type LintReport } from "../memory/lint.js";
import { writeProposal, flatTargetKey, type MemoryProposal } from "../memory/proposal-store.js";
import { targetKey, deriveAction, canonicalMemoryPath } from "../memory/gate.js";

export interface MemoryLintOptions { cwd?: string; json?: boolean; fix?: boolean; }

/** Recover a memory's body (the prose after the `# title` heading) from its md,
 *  so a --fix proposal preserves content and only flips status. */
function readBody(repoPath: string, entry: MemoryEntry): string {
  try {
    const md = readFileSync(join(repoPath, entry.path), "utf8");
    const afterFm = md.replace(/^---\n[\s\S]*?\n---\n?/, ""); // drop frontmatter
    return afterFm.replace(/^\s*#[^\n]*\n+/, "").trim();        // drop the leading "# Title" heading
  } catch { return ""; }
}

/** --fix: queue a review proposal for each `expired` finding that flips the live
 *  entry to `status: superseded`. Goes through the proposal queue (human review),
 *  NEVER a direct write (#14) — and writes ONLY to the device-local queue outside
 *  the repo, so the repo itself stays untouched. Returns the queued target keys. */
function proposeStalenessFixes(repoPath: string, idx: MemoryIndex, report: LintReport, now: string): string[] {
  const queued: string[] = [];
  for (const f of report.issues) {
    if (f.layer !== "memory" || f.check !== "expired") continue;
    const live = idx.entries[f.id];
    if (!live || live.status === "superseded") continue;
    const fixed: MemoryEntry = { ...live, status: "superseded", updatedAt: now };
    fixed.path = canonicalMemoryPath(fixed);
    const tKey = targetKey(fixed);
    const p: MemoryProposal = {
      proposalId: flatTargetKey(tKey),
      targetKey: tKey,
      proposedEntryId: fixed.id,
      action: deriveAction(fixed, idx.entries),
      rationale: `auto-staleness: ${f.detail} → mark superseded`,
      sourceSession: null,
      createdAt: new Date().toISOString(), // full ISO, matching memory-propose + the MemoryProposal.createdAt contract
      proposal: { entry: fixed, body: readBody(repoPath, live) },
    };
    writeProposal(repoPath, p);
    queued.push(tKey);
  }
  return queued;
}

function readIndexOnce<T extends { version: number; entries: object }>(
  repoPath: string, rel: string, layer: LintFinding["layer"], empty: T,
): { index: T; finding: LintFinding | null } {
  const p = join(repoPath, rel);
  if (!existsSync(p)) return { index: empty, finding: null };
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(p, "utf8")); }
  catch {
    return { index: empty, finding: { check: "corrupt-index", severity: "error", layer, id: rel,
      detail: "index file is not valid JSON — treated as empty; findings for this layer may be incomplete" } };
  }
  const ok = parsed && typeof parsed === "object" && (parsed as Record<string, unknown>).version === 1 &&
    typeof (parsed as Record<string, unknown>).entries === "object" &&
    (parsed as Record<string, unknown>).entries !== null &&
    !Array.isArray((parsed as Record<string, unknown>).entries);
  if (!ok) {
    return { index: empty, finding: { check: "corrupt-index", severity: "error", layer, id: rel,
      detail: "index file is not a valid v1 index (version/entries shape) — treated as empty; findings for this layer may be incomplete" } };
  }
  return { index: parsed as T, finding: null };
}

function humanReport(r: LintReport): string {
  const lines: string[] = [];
  lines.push(`# memory-lint — ${r.counts.issues} issue(s), ${r.counts.suggestions} suggestion(s)`);
  const group = (title: string, fs: LintFinding[]) => {
    if (fs.length === 0) return;
    lines.push(`\n## ${title}`);
    for (const f of fs) {
      lines.push(`- [${f.severity}] ${f.layer}/${f.check} — ${f.id}: ${f.detail}` +
        (f.refs && f.refs.length ? ` (refs: ${f.refs.join(", ")})` : ""));
    }
  };
  group("Issues", r.issues);
  group("Suggestions", r.suggestions);
  if (r.counts.issues === 0 && r.counts.suggestions === 0) lines.push("\n✓ clean");
  return lines.join("\n") + "\n";
}

/** Read-only diagnostic. Reads and parses each index file once, lints all three layers,
 *  then prepends any corrupt-index findings. Never mutates the repo. Exit 0. */
export async function memoryLintCmd(opts: MemoryLintOptions): Promise<void> {
  const cfg = readPluginConfig();
  let project: string | null = null;
  if (opts.cwd) {
    try { project = resolveProjectFromCwd(opts.cwd, cfg.repoPath); } catch { project = null; }
  }
  const now = new Date().toISOString().slice(0, 10);
  const m = readIndexOnce<MemoryIndex>(cfg.repoPath, MEMORY_INDEX_REL, "memory", emptyMemoryIndex());
  const e = readIndexOnce<EntityIndex>(cfg.repoPath, ENTITY_INDEX_REL, "entity", emptyEntityIndex());
  const q = readIndexOnce<QaIndex>(cfg.repoPath, QA_INDEX_REL, "qa", emptyQaIndex());
  const report = lintMemory(m.index, e.index, q.index, { now, project, generatedAt: now });
  const corrupt = [m.finding, e.finding, q.finding].filter((f): f is LintFinding => f !== null);
  if (corrupt.length) {
    report.issues = [...corrupt, ...report.issues];
    report.counts = { issues: report.issues.length, suggestions: report.suggestions.length };
  }
  // --fix queues review proposals (status→superseded) for expired entries; it
  // does NOT touch the repo — the human still approves via memory-diff/approve.
  const fixed = opts.fix ? proposeStalenessFixes(cfg.repoPath, m.index, report, now) : [];
  if (opts.json) {
    process.stdout.write(JSON.stringify(opts.fix ? { ...report, fixesProposed: fixed } : report, null, 2) + "\n");
  } else {
    let out = humanReport(report);
    if (opts.fix) {
      out += fixed.length
        ? `\n${fixed.length} staleness fix(es) queued as proposals — review with \`memory-diff\` then \`memory-approve\`:\n` +
          fixed.map((k) => `  - ${k}`).join("\n") + "\n"
        : "\nNo auto-fixable staleness (no expired active entries).\n";
    }
    process.stdout.write(out);
  }
}
