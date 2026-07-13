import { readFileSync } from "node:fs";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadSkips, saveSkips, upsertSkips } from "../spool/skip-store.js";

export interface SkipWriteOptions { inputPath?: string; }
export interface SkipWriteReport { skipped: number; total: number; }

/**
 * Mark sessions as intentionally-not-digested in the local skip ledger, so the
 * digest doesn't re-propose them. Input JSON is either an array of
 * `{ sessionId, reason? }` or `{ sessions: [...] }`. Local-only ledger.
 */
export async function skipWriteCmd(opts: SkipWriteOptions): Promise<SkipWriteReport> {
  const cfg = readPluginConfig();
  const idx = loadSkips(cfg.repoPath);
  let sessions: Array<{ sessionId: string; reason?: string }> = [];
  if (opts.inputPath) {
    const raw = JSON.parse(readFileSync(opts.inputPath, "utf8"));
    const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.sessions) ? raw.sessions : []);
    sessions = arr;
  }
  const at = new Date().toISOString().slice(0, 10);
  const added = upsertSkips(idx, sessions, at);
  saveSkips(cfg.repoPath, idx);
  return { skipped: added, total: Object.keys(idx.sessions).length };
}
