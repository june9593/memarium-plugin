import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { renderPrimer } from "../memory/primer.js";

export interface MemoryPrimerOptions { cwd?: string; }

/** Read-only: print the cwd project's primer markdown to stdout. NEVER writes
 *  (backs the SessionStart hook). Prefers the digest-written _primer file;
 *  falls back to rendering from the memory index in-memory. Silent + exit-0 on
 *  any failure or when there's no project. */
export async function memoryPrimerCmd(opts: MemoryPrimerOptions): Promise<void> {
  try {
    const cfg = readPluginConfig();
    const cwd = opts.cwd ?? process.cwd();
    const project = resolveProjectFromCwd(cwd, cfg.repoPath);
    if (!project) return;
    const fileP = join(cfg.repoPath, "memory", "_primer", `${project}.md`);
    if (existsSync(fileP)) {
      process.stdout.write(readFileSync(fileP, "utf8"));
      return;
    }
    const idx = loadMemoryIndex(cfg.repoPath);
    const primer = renderPrimer(project, Object.values(idx.entries));
    if (primer.trim()) process.stdout.write(primer);
  } catch {
    /* read-only + non-fatal: succeed silently */
  }
}
