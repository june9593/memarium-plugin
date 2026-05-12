// Plugin scan: walk ~/.claude/projects/, copy each session's jsonl into
// ~/.vibebook/session-repo/raw_sessions/<project>/<sessionId>.jsonl.
//
// Idempotent: a sessionId already present in the spool is skipped (no
// re-copy, no overwrite). This is what makes the orchestrator safe to
// re-run.
//
// We DELIBERATELY do not write any index file — sync CLI owns
// ~/.vibebook/session-repo/.vibebook/index.json. Plugin operates "directly
// on the filesystem" and trusts the file presence as the source of truth.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ClaudeCodeAdapter } from "../_shared/sources/claude-code.js";
import { isRealProjectPath } from "../_shared/digest/project-filter.js";
import { ensureSpoolDir } from "./ensure-dir.js";

export interface ScanOptions {
  /** If non-null, only import sessions belonging to this project slug. */
  projectFilter: string | null;
}

export interface ScanResult {
  imported: number;
  skipped: number;
  filteredAsPseudoProject: number;
  filteredByProject: number;
}

export async function scanAndImport(opts: ScanOptions): Promise<ScanResult> {
  const { rawSessionsDir } = ensureSpoolDir();

  const adapter = new ClaudeCodeAdapter();
  const result: ScanResult = {
    imported: 0,
    skipped: 0,
    filteredAsPseudoProject: 0,
    filteredByProject: 0,
  };

  for await (const discovered of adapter.discover()) {
    // DiscoveredSession only carries sourcePath/mtime/sha. We need to load() to
    // get the parsed NormalizedSession (sessionId + project slug).
    let normalized;
    try {
      normalized = await discovered.load();
    } catch {
      // Malformed jsonl — skip silently. Sync CLI tracks parse errors
      // properly; the plugin's job is just "import what's parseable".
      continue;
    }

    if (!isRealProjectPath(normalized.project)) {
      result.filteredAsPseudoProject++;
      continue;
    }
    if (opts.projectFilter && normalized.project !== opts.projectFilter) {
      result.filteredByProject++;
      continue;
    }

    const projectSpoolDir = join(rawSessionsDir, normalized.project);
    const dest = join(projectSpoolDir, `${normalized.sessionId}.jsonl`);
    if (existsSync(dest)) {
      result.skipped++;
      continue;
    }
    mkdirSync(projectSpoolDir, { recursive: true });
    copyFileSync(discovered.sourcePath, dest);
    result.imported++;
  }
  return result;
}
