import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadMemoryIndex, MEMORY_INDEX_REL } from "../memory/index-store.js";
import { loadEntityIndex, ENTITY_INDEX_REL } from "../entity/index-store.js";
import { loadQaIndex, QA_INDEX_REL } from "../qa/index-store.js";
import { lintMemory, type LintFinding, type LintReport } from "../memory/lint.js";

export interface MemoryLintOptions { cwd?: string; json?: boolean; staleDays?: number; }

function corruptIndexFindings(repoPath: string): LintFinding[] {
  const out: LintFinding[] = [];
  const specs: Array<{ rel: string; layer: LintFinding["layer"] }> = [
    { rel: MEMORY_INDEX_REL, layer: "memory" },
    { rel: ENTITY_INDEX_REL, layer: "entity" },
    { rel: QA_INDEX_REL, layer: "qa" },
  ];
  for (const { rel, layer } of specs) {
    const p = join(repoPath, rel);
    if (!existsSync(p)) continue; // missing is fine (empty store)
    try {
      const parsed = JSON.parse(readFileSync(p, "utf8"));
      if (!parsed || parsed.version !== 1 || typeof parsed.entries !== "object" || parsed.entries === null || Array.isArray(parsed.entries)) {
        out.push({ check: "corrupt-index", severity: "error", layer, id: rel,
          detail: `index file is not a valid v1 index (version/entries shape) — load returned empty, findings for this layer may be incomplete` });
      }
    } catch {
      out.push({ check: "corrupt-index", severity: "error", layer, id: rel,
        detail: `index file is not valid JSON — load returned empty, findings for this layer may be incomplete` });
    }
  }
  return out;
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

/** Read-only diagnostic. Loads the committed indexes directly (NEVER via
 *  memory-query — that writes _primer). Never mutates the repo. Exit 0. */
export async function memoryLintCmd(opts: MemoryLintOptions): Promise<void> {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  let project: string | null = null;
  try { project = resolveProjectFromCwd(cwd, cfg.repoPath); } catch { project = null; }
  const now = new Date().toISOString().slice(0, 10);
  const report = lintMemory(
    loadMemoryIndex(cfg.repoPath),
    loadEntityIndex(cfg.repoPath),
    loadQaIndex(cfg.repoPath),
    { now,
      staleDays: Number.isFinite(opts.staleDays) && (opts.staleDays as number) > 0 ? Math.floor(opts.staleDays as number) : 90,
      project, generatedAt: now },
  );
  const corrupt = corruptIndexFindings(cfg.repoPath);
  if (corrupt.length) {
    report.issues = [...corrupt, ...report.issues];
    report.counts = { issues: report.issues.length, suggestions: report.suggestions.length };
  }
  process.stdout.write(opts.json ? JSON.stringify(report, null, 2) + "\n" : humanReport(report));
}
