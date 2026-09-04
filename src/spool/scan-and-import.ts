// Plugin scan: walk supported local session stores, render each session into
// the spool as .md (matching npm sync's writer output byte-for-byte), and
// upsert per-session entries into ~/.memarium/session-repo/.memarium/index.json.
//
// This is the plugin equivalent of npm sync.ts's main loop (sync.ts:80-125),
// minus git/migration. Plugin and sync are co-owners of raw_sessions/
// and index.json; both write via the same upsertEntry path keyed by
// {tool}:{sessionId}, so concurrent writes are conflict-free.
//
// Idempotent: hasUnchanged() check on the existing index entry skips sessions
// whose source jsonl mtime + sha256 are unchanged. First call on a fresh spool
// imports everything; subsequent calls only import what's new or changed.

import { existsSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";
import { ClaudeCodeAdapter } from "../_shared/sources/claude-code.js";
import { VSCodeCopilotAdapter } from "../_shared/sources/vscode-copilot.js";
import { CodexAdapter } from "../_shared/sources/codex.js";
import type { SourceAdapter } from "../_shared/sources/base.js";
import { isRealProjectPath } from "../_shared/digest/project-filter.js";
import { loadIndex, saveIndex, upsertEntry, hasUnchanged, keyFor } from "../_shared/index-store.js";
import type { IndexEntry, IndexFile } from "../_shared/types.js";
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

  // Keep the autonomous plugin aligned with npm sync: Claude Code,
  // VS Code Copilot Chat, and Codex Desktop / interactive Codex CLI.
  const adapters: SourceAdapter[] = [
    new ClaudeCodeAdapter(),
    new VSCodeCopilotAdapter(),
    new CodexAdapter(),
  ];
  const idx = loadIndex(spoolRoot);
  const pendingRemovals: { indexKey: string; previousPath: string }[] = [];

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

      // Skip empty-shell sessions — VS Code creates a chatSessions/<id>.jsonl
      // for every chat tab opened (even ones immediately closed). Without
      // this guard we'd write one 1970-01-01/untitled__<id>.md per shell
      // (epoch fallback because startedAt stays empty). Matches the
      // empty-skip behavior of memarium (npm) >=0.7.1.
      if (session.messages.length === 0) {
        result.skipped++;
        continue;
      }

      // Write rendered .md. 0.2.0 dropped .raw.json (npm memarium >=0.6
      // dropped it too); the .md carries everything via manifest +
      // content blocks. includeReasoning=true matches npm sync's default;
      // we don't read config here (plugin must work without
      // ~/.memarium/config.json).
      const indexKey = keyFor(session.tool, session.sessionId);
      const previousPath = idx.entries[indexKey]?.relativePath;
      const written = writeSession(spoolRoot, session, { includeReasoning: true });
      if (previousPath && previousPath !== written.md) {
        pendingRemovals.push({ indexKey, previousPath });
      }

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
        relativePath: written.md,
        sourcePath: session.sourcePath,
        sourceMtimeMs: discovered.sourceMtimeMs,
        sourceSha256: discovered.sourceSha256,
      };
      upsertEntry(idx, entry);
      result.imported++;
    }
  }

  // Persist the index in the same format npm sync uses, so a later
  // `memarium sync` (if user installs npm CLI later) sees plugin-written
  // entries as already-known and doesn't re-render them.
  saveIndex(spoolRoot, idx);
  for (const { indexKey, previousPath } of pendingRemovals) {
    removeSupersededRenderedSession(spoolRoot, idx, indexKey, previousPath);
  }

  return result;
}

function removeSupersededRenderedSession(
  spoolRoot: string,
  idx: IndexFile,
  currentKey: string,
  previousPath: string,
): void {
  const rawRoot = resolve(spoolRoot, "raw_sessions");
  const previousAbs = resolve(spoolRoot, previousPath);
  if (!previousAbs.startsWith(rawRoot + sep)) return;
  const shared = Object.entries(idx.entries).some(([key, entry]) =>
    key !== currentKey && entry.relativePath === previousPath,
  );
  if (shared || !existsSync(previousAbs)) return;
  try { rmSync(previousAbs); } catch { /* best-effort orphan cleanup */ }
}
