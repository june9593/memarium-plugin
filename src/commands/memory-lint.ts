import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { loadEntityIndex } from "../entity/index-store.js";
import { loadQaIndex } from "../qa/index-store.js";
import { lintMemory, type LintFinding, type LintReport } from "../memory/lint.js";

export interface MemoryLintOptions { cwd?: string; json?: boolean; staleDays?: number; }

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
    { now, staleDays: Number.isFinite(opts.staleDays) ? (opts.staleDays as number) : 90, project, generatedAt: now },
  );
  process.stdout.write(opts.json ? JSON.stringify(report, null, 2) + "\n" : humanReport(report));
}
