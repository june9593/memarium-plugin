import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { resolveMemoryView } from "../memory/source-resolver.js";
import { renderPrimer } from "../memory/primer.js";

export interface MemoryPrimerOptions { cwd?: string; }

/** Read-only: print the cwd project's primer markdown to stdout. NEVER writes
 *  (backs the SessionStart hook). Renders LIVE from the merged local+overlay
 *  memory view (P0b) so the primer includes sibling-device memory; does NOT
 *  read the `memory/_primer/<project>.md` file — that's a per-device generated
 *  artifact (merge-books doesn't aggregate it) and would be a stale, local-only
 *  snapshot. Silent + exit-0 on any failure or when there's no project. */
export async function memoryPrimerCmd(opts: MemoryPrimerOptions): Promise<void> {
  try {
    const cfg = readPluginConfig();
    const cwd = opts.cwd ?? process.cwd();
    const project = resolveProjectFromCwd(cwd, cfg.repoPath);
    if (!project) return;
    const view = resolveMemoryView(cfg.repoPath);
    const primer = renderPrimer(project, Object.values(view.entries));
    if (primer.trim()) process.stdout.write(primer);
  } catch {
    /* read-only + non-fatal: succeed silently */
  }
}
