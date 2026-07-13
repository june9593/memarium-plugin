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
  if (!opts.inputPath) throw new Error("skip-write requires --input <path>");
  const cfg = readPluginConfig();
  const idx = loadSkips(cfg.repoPath);
  const raw = JSON.parse(readFileSync(opts.inputPath, "utf8"));
  const sessions = Array.isArray(raw) ? raw : (Array.isArray(raw?.sessions) ? raw.sessions : null);
  if (sessions === null) {
    throw new Error("skip-write: --input must be an array of {sessionId,reason?} or {sessions:[...]}");
  }
  for (const s of sessions) {
    if (!s || typeof s.sessionId !== "string" || (s.reason !== undefined && typeof s.reason !== "string")) {
      throw new Error("skip-write: each item must be { sessionId: string, reason?: string }");
    }
  }
  const at = new Date().toISOString().slice(0, 10);
  const added = upsertSkips(idx, sessions, at);
  saveSkips(cfg.repoPath, idx);
  return { skipped: added, total: Object.keys(idx.sessions).length };
}
