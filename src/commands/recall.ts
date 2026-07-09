import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { resolveMemoryView, resolveEntryAbsPath } from "../memory/source-resolver.js";
import { scoreMemories } from "../memory/score.js";
import { loadUsage, bumpUsage, overlayUsage } from "../memory/usage-store.js";
import { renderPrimer } from "../memory/primer.js";
import type { MemoryType } from "../memory/types.js";

/**
 * `memarium recall` — 2-stage progressive retrieval over the typed-memory index.
 *
 * Stage 1 (this command): score the project's typed memory against the task
 * keywords (`--q`) and return a ranked list — episodes (the arc / dead-ends /
 * decisions of past work) alongside matching semantic facts + procedural
 * gotchas, each with `whyRecalled` and an absolute `path`. ~small: title +
 * one-line summary per hit, bodies NOT loaded.
 *
 * Stage 2 (the agent, no extra command): `Read` the top 1–5 `path`s to pull the
 * full body of the most relevant hits.
 *
 * Reuses the same scoring engine as `memory-query` / `/memarium-context`
 * (`scoreMemories` over the local+overlay merged view). The old 3-stage walk
 * over `book/` (topics → chronicles → Read) is gone — there is one AI-native
 * knowledge layer now.
 */

const DEFAULT_LIMIT = 25;

// A real CONTENT hit (vs scope/importance/recency baseline) — same markers
// memory-query/eval use. Only content-hit results are recorded as an "access".
const CONTENT_HIT_MARKERS = ["keyword", "file", "commit"];
const BUMP_TOP_N = 5;

export interface RecallHit {
  id: string;
  type: MemoryType;
  title: string;
  summary: string;
  score: number;
  whyRecalled: string;
  /** Absolute path for the agent's `Read` tool (resolved against the entry's
   *  own tree — local repo or the read-only overlay worktree). */
  path: string | null;
  updatedAt: string;
  entities: string[];
  /** Which tree the entry came from. */
  source: "local" | "overlay";
}

export interface RecallPayload {
  stage: "stage-1-ranked";
  /** Project the recall scopes to (null when --all / unresolved cwd). */
  project: string | null;
  /** Echo of the free-text query used for scoring. */
  query: string;
  repoPath: string;
  entries: RecallHit[];
  /** Only populated when there's no query — a "what's in this project" overview
   *  (the same render the SessionStart primer uses). Omitted for a real query. */
  primer?: string;
  meta: {
    total: number;
    returned: number;
    cwdUnresolved?: boolean;
    nextStep: string;
  };
}

export interface RecallOptions {
  cwd?: string;
  project?: string;
  /** Free-text task keywords to score against (title/summary/entities +
   *  file/commit overlap). Empty → scope/importance/recency baseline. */
  q?: string;
  /** Recall across every project (no cwd/project filter). Use sparingly. */
  all?: boolean;
  /** Max hits returned (default 25). */
  limit?: number;
}

export function buildRecallPayload(opts: RecallOptions = {}): RecallPayload {
  const cfg = readPluginConfig();

  let projectFilter: string | null = opts.project?.trim() || null;
  let cwdUnresolved = false;
  if (!projectFilter && !opts.all && opts.cwd) {
    projectFilter = resolveProjectFromCwd(opts.cwd, cfg.repoPath);
    if (!projectFilter) cwdUnresolved = true;
  }

  // Merged local + aggregated-overlay memory (P0b) so recall sees sibling-device
  // memory. Read-only; pending proposals (outside the repo) are excluded for free.
  const view = resolveMemoryView(cfg.repoPath);
  const entries = Object.values(view.entries);
  const now = new Date().toISOString().slice(0, 10);

  // Overlay device-local usage before scoring so accessCount affects ranking.
  overlayUsage(entries, loadUsage(cfg.repoPath));

  const query = (opts.q ?? "").trim();
  const scored = scoreMemories(entries, { project: projectFilter, text: query, type: null, now });

  const limit = opts.limit && opts.limit > 0 ? opts.limit : DEFAULT_LIMIT;
  const hits: RecallHit[] = scored.slice(0, limit).map((s) => ({
    id: s.entry.id,
    type: s.entry.type,
    title: s.entry.title,
    summary: s.entry.summary,
    score: s.score,
    whyRecalled: s.whyRecalled,
    path: resolveEntryAbsPath(view, s.entry.id),
    updatedAt: s.entry.updatedAt,
    entities: s.entry.entities,
    source: view.sources[s.entry.id] ?? "local",
  }));

  const payload: RecallPayload = {
    stage: "stage-1-ranked",
    project: projectFilter,
    query,
    repoPath: cfg.repoPath,
    entries: hits,
    meta: {
      total: scored.length,
      returned: hits.length,
      ...(cwdUnresolved ? { cwdUnresolved: true } : {}),
      nextStep: hits.length > 0
        ? "Read the top 1–5 entry.path with the Read tool for full bodies (episodes carry the arc)."
        : (cwdUnresolved
            ? "cwd didn't resolve to a synced project — pass --project <slug> or --all."
            : "No memory yet for this project. Run /memarium to digest sessions."),
    },
  };

  // No query → this is a "what do we know here" overview; include the primer
  // (same live render as the SessionStart hook) as a coarse header.
  if (!query && projectFilter) {
    const primer = renderPrimer(projectFilter, entries);
    if (primer.trim()) payload.primer = primer;
  }

  return payload;
}

/** CLI entry: print payload as JSON to stdout, and (only on a real content-hit
 *  query) bump the device-local usage sidecar for the top hits. */
export async function recallCmd(opts: RecallOptions): Promise<void> {
  const payload = buildRecallPayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");

  // BUMP (the ONLY write side effect) — non-empty query + content hit only.
  // Reuse the repoPath buildRecallPayload already resolved (avoids a second
  // readPluginConfig + its migrate side-effect). Best-effort: usage is
  // non-essential telemetry and must never break recall.
  if (payload.query !== "") {
    try {
      const bumpIds = payload.entries
        .filter((h) => Number.isFinite(h.score) && CONTENT_HIT_MARKERS.some((m) => h.whyRecalled.includes(m)))
        .slice(0, BUMP_TOP_N)
        .map((h) => h.id);
      const now = new Date().toISOString().slice(0, 10);
      bumpUsage(payload.repoPath, bumpIds, now);
    } catch { /* usage is non-essential telemetry; never fail a recall over it */ }
  }
}
