// Plugin scan: walk ~/.claude/projects/, render each session into the spool
// as .md + .raw.json (matching npm sync's writer output byte-for-byte), and
// upsert per-session entries into ~/.vibebook/session-repo/.vibebook/index.json.
//
// This is the plugin equivalent of npm sync.ts's main loop (sync.ts:80-125),
// minus git/encrypt/migration. Plugin and sync are co-owners of raw_sessions/
// and index.json; both write via the same upsertEntry path keyed by
// {tool}:{sessionId}, so concurrent writes are conflict-free.
//
// Idempotent: hasUnchanged() check on the existing index entry skips sessions
// whose source jsonl mtime + sha256 are unchanged. First call on a fresh spool
// imports everything; subsequent calls only import what's new or changed.

import { ClaudeCodeAdapter } from "../_shared/sources/claude-code.js";
import { VSCodeCopilotAdapter } from "../_shared/sources/vscode-copilot.js";
import type { SourceAdapter } from "../_shared/sources/base.js";
import { isRealProjectPath } from "../_shared/digest/project-filter.js";
import { loadIndex, saveIndex, upsertEntry, hasUnchanged } from "../_shared/index-store.js";
import type { IndexEntry } from "../_shared/types.js";
import { ensureSpoolDir } from "./ensure-dir.js";
import { writeSession } from "./writer.js";

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
  const { spoolRoot } = ensureSpoolDir();

  // Both adapters: Claude Code (~/.claude/projects/) AND VS Code Copilot
  // Chat (its workspaceStorage). npm sync.ts:75-78 runs both in sequence;
  // plugin must mirror that or we silently miss every Copilot session.
  const adapters: SourceAdapter[] = [
    new ClaudeCodeAdapter(),
    new VSCodeCopilotAdapter(),
  ];
  const idx = loadIndex(spoolRoot);

  const result: ScanResult = {
    imported: 0,
    skipped: 0,
    filteredAsPseudoProject: 0,
    filteredByProject: 0,
  };

  for (const adapter of adapters) {
    for await (const discovered of adapter.discover()) {
      let session;
      try {
        session = await discovered.load();
      } catch {
        // Malformed jsonl — sync CLI tracks parse errors; plugin best-effort skips.
        continue;
      }

      if (!isRealProjectPath(session.project)) {
        result.filteredAsPseudoProject++;
        continue;
      }
      if (opts.projectFilter && session.project !== opts.projectFilter) {
        result.filteredByProject++;
        continue;
      }

      if (hasUnchanged(idx, session.tool, session.sessionId, discovered.sourceMtimeMs, discovered.sourceSha256)) {
        result.skipped++;
        continue;
      }

      // Write rendered .md + .raw.json. includeReasoning=true matches npm
      // sync's default; we don't read config here (plugin must work without
      // ~/.vibebook/config.json).
      const written = writeSession(spoolRoot, session, { includeReasoning: true });

      const entry: IndexEntry = {
        sessionId: session.sessionId,
        shortId: session.shortId,
        tool: session.tool,
        project: session.project,
        projectRaw: session.projectRaw,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        nameSlug: session.nameSlug,
        displayName: session.displayName,
        relativePath: written.raw,
        sourcePath: session.sourcePath,
        sourceMtimeMs: discovered.sourceMtimeMs,
        sourceSha256: discovered.sourceSha256,
      };
      upsertEntry(idx, entry);
      result.imported++;
    }
  }

  // Persist the index in the same format npm sync uses, so a later
  // `vibebook sync` (if user installs npm CLI later) sees plugin-written
  // entries as already-known and doesn't re-render them.
  saveIndex(spoolRoot, idx);

  return result;
}
