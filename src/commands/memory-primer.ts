import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { resolveMemoryView } from "../memory/source-resolver.js";
import { renderPrimer, HOOK_PRIMER_MAX_CHARS } from "../memory/primer.js";
import { bodyLoader } from "../memory/body.js";

export interface MemoryPrimerOptions { cwd?: string; }

/** Read-only: print the cwd project's primer markdown to stdout. NEVER writes
 *  (backs the SessionStart hook). The output is the compact form — core rules
 *  with their full body (read from the tree each entry came from), facts and
 *  procedures by title — capped at HOOK_PRIMER_MAX_CHARS so the hook stays under
 *  Claude Code's inline limit. Renders LIVE from the merged local+overlay
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
    const primer = renderPrimer(project, Object.values(view.entries), {
      compact: true, maxChars: HOOK_PRIMER_MAX_CHARS, coreBody: bodyLoader(view),
    });
    if (primer.trim()) process.stdout.write(primer);
  } catch {
    /* read-only + non-fatal: succeed silently */
  }
}
