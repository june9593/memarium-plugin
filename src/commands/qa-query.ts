import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadQaIndex } from "../qa/index-store.js";
import { scoreQa } from "../qa/score.js";
import type { QaKind } from "../qa/types.js";

export interface QaQueryOptions {
  cwd?: string;
  q?: string;
  kind?: string;
}

function isKind(s: string | undefined): QaKind | null {
  const ok: QaKind[] = ["compound", "troubleshooting", "decision", "operational"];
  return s && ok.includes(s as QaKind) ? (s as QaKind) : null;
}

/** Read-only, index-only: reads .vibebook/index.qa.json, scores, emits ranked
 *  metadata + path. Never opens the .md bodies (so no read guard needed). */
export async function qaQueryCmd(opts: QaQueryOptions): Promise<void> {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadQaIndex(cfg.repoPath);
  const now = new Date().toISOString().slice(0, 10);

  const scored = scoreQa(Object.values(idx.entries), {
    project,
    text: opts.q ?? "",
    kind: isKind(opts.kind),
    now,
  });

  process.stdout.write(JSON.stringify({ project, qa: scored }, null, 2) + "\n");
}
