import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadIndex } from "../_shared/index-store.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { consumedSessions } from "../digest/consumed.js";
import { extractSessionSignals, isMemariumMetaSession } from "../_shared/digest/session-signal.js";
import { isRealProjectPath } from "../_shared/digest/project-filter.js";
import { projectSlugFromPath } from "../_shared/slug.js";
import { resolveProjectFromCwdWithIndex } from "../_shared/project-resolve.js";
import type { IndexEntry } from "../_shared/types.js";

export interface PreparePayload {
  /** Project filter applied (or null for all). */
  project: string | null;
  /** Sessions in the raw index that aren't yet digested (no episodic memory
   *  references them) and aren't skip-ledgered, that survive isRealProjectPath.
   *  Sorted by endedAt ascending. */
  newSessions: PreparedSession[];
  /** Existing episodic memory ids grouped by project, so the skill avoids
   *  writing a duplicate episodic for an already-digested thread. */
  existingEpisodes: Record<string, string[]>;
  /** Aggregate counts for the skill's user-facing summary table. */
  meta: {
    totalSessionsInIndex: number;
    sessionsAlreadyDigested: number;
    sessionsFilteredByProject: number;
    sessionsFilteredAsPseudoProject: number;
    sessionsFilteredAsMemariumMeta: number;
    newSessionsCount: number;
  };
}

export interface PreparedSession {
  sessionId: string;
  shortId: string;
  tool: "claude" | "copilot";
  project: string;
  startedAt: string;
  endedAt: string;
  /** First user message, slugified (from the raw extract step). */
  nameSlug: string;
  /** Display title from the raw extract. */
  displayName: string;
  /** Repo-relative path to the synced .md (the skill should `Read` this
   *  path directly). */
  mdPath: string;
  /** First-300-char preview of joined user messages. */
  preview: string;
  /** 0..1 keyword-bucket signal (debug/architecture/discovery/reasoning/evaluation). */
  insightScore: number;
}

export interface PrepareOptions {
  /** Project slug filter; "" / undefined = all projects. */
  project?: string;
  /** Resolve project from this absolute cwd (via projectSlugFromPath +
   *  index lookup). Mutually exclusive with `project`; the skill uses this
   *  to support "auto-detect from where Claude was launched". */
  cwd?: string;
}

/**
 * Build the JSON payload that the in-session Claude reads via the
 * `/memarium` skill. Pure I/O over the user's already-synced raw_sessions.
 *
 * Algorithm:
 *   1. Load raw index (.memarium/index.json) — every synced session.
 *   2. Build the set of "consumed" session ids — already digested (episodic
 *      memory sourceSessions) or intentionally skipped (skip ledger). See
 *      src/digest/consumed.ts.
 *   3. For each unconsumed session:
 *        - apply isRealProjectPath filter
 *        - apply --project filter if given
 *        - read the .md, compute signals
 *   4. Sort by endedAt ASC, return.
 *
 * The skill's "Step 1 — Plan" calls this and prints the count + summary.
 */
export function buildPreparePayload(opts: PrepareOptions = {}): PreparePayload {
  const cfg = readPluginConfig();
  const indexFile = loadIndex(cfg.repoPath);

  // Resolve --cwd → project slug. Try the path-derived slug first (matches
  // how the adapters compute `project`); if no session exists for it, fall
  // back to scanning index entries whose projectRaw === cwd. If still
  // nothing, throw — no point pretending the user is in a known project.
  let projectFilter = opts.project?.trim() || null;
  if (!projectFilter && opts.cwd) {
    projectFilter = resolveProjectFromCwdWithIndex(opts.cwd, indexFile.entries);
    if (!projectFilter) {
      throw new Error(
        `no synced sessions found for cwd '${opts.cwd}' (derived slug '${projectSlugFromPath(opts.cwd)}'). Run \`memarium sync\` first or pass --project explicitly.`,
      );
    }
  }

  // consumed = already-digested (episodic sourceSessions) ∪ skip ledger
  const consumed = consumedSessions(cfg.repoPath);

  // 4. filter + read
  const meta = {
    totalSessionsInIndex: 0,
    sessionsAlreadyDigested: 0,
    sessionsFilteredByProject: 0,
    sessionsFilteredAsPseudoProject: 0,
    sessionsFilteredAsMemariumMeta: 0,
    newSessionsCount: 0,
  };
  const newSessions: PreparedSession[] = [];
  for (const entry of Object.values(indexFile.entries)) {
    meta.totalSessionsInIndex++;
    if (consumed.has(entry.sessionId)) {
      meta.sessionsAlreadyDigested++;
      continue;
    }
    if (!isRealProjectPath(entry.project)) {
      meta.sessionsFilteredAsPseudoProject++;
      continue;
    }
    if (projectFilter && entry.project !== projectFilter) {
      meta.sessionsFilteredByProject++;
      continue;
    }
    const mdRel = mdPathFor(entry);
    const mdAbs = join(cfg.repoPath, mdRel);
    if (!existsSync(mdAbs)) {
      // The .md is missing — could be a sync gap. Skip silently; user can
      // re-sync to recover.
      continue;
    }
    const mdBody = readFileSync(mdAbs, "utf8");
    if (isMemariumMetaSession(mdBody)) {
      // User's own /memarium invocation. Self-referential noise — exclude
      // before the LLM ever sees it. (See SessionSignals docs for the
      // detection heuristics.)
      meta.sessionsFilteredAsMemariumMeta++;
      continue;
    }
    const signals = extractSessionSignals(mdBody);
    newSessions.push({
      sessionId: entry.sessionId,
      shortId: entry.shortId,
      tool: entry.tool,
      project: entry.project,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      nameSlug: entry.nameSlug,
      displayName: entry.displayName,
      mdPath: mdRel,
      preview: signals.preview,
      insightScore: signals.insightScore,
    });
  }
  newSessions.sort((a, b) => (a.endedAt < b.endedAt ? -1 : a.endedAt > b.endedAt ? 1 : 0));
  meta.newSessionsCount = newSessions.length;

  // existing episodic memory ids grouped by project (dedup hint for the skill)
  const existingEpisodes: Record<string, string[]> = {};
  for (const e of Object.values(loadMemoryIndex(cfg.repoPath).entries)) {
    // Defensive: a parseable-but-malformed index must not break the digest.
    if (!e || typeof e !== "object") continue;
    const ep = e as { type?: unknown; project?: unknown; id?: unknown };
    if (ep.type === "episodic" && typeof ep.project === "string" && typeof ep.id === "string") {
      (existingEpisodes[ep.project] ??= []).push(ep.id);
    }
  }
  for (const list of Object.values(existingEpisodes)) list.sort();

  return {
    project: projectFilter,
    newSessions,
    existingEpisodes,
    meta,
  };
}

/** The IndexEntry stores the raw_sessions path. We want the human-readable
 *  .md path. */
function mdPathFor(entry: IndexEntry): string {
  // entry.relativePath is the .raw.json path. Swap suffix.
  return entry.relativePath.replace(/\.raw\.json(\.enc)?$/, `.md`);
}

/** CLI entry: print payload as JSON to stdout. */
export async function prepareCmd(opts: PrepareOptions): Promise<void> {
  const payload = buildPreparePayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
