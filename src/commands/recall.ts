import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { resolveMemoryView, resolveEntryAbsPath } from "../memory/source-resolver.js";
import { scoreMemories } from "../memory/score.js";
import { loadUsage, bumpUsage, overlayUsage } from "../memory/usage-store.js";
import { renderPrimer } from "../memory/primer.js";
// R2 cold-storage valve — SHARED with `memory-query` (src/memory/cold-pass.ts).
// `recall` is the PRIMARY task-recall path (/memarium-recall), so archival's
// "a wrongly-archived memory resurfaces on demand" guarantee has to hold HERE,
// not only in /memarium-context's memory-query.
import { runColdPass, renderColdHints, renderColdNextStep, isContentHitReason, type ColdStorageHit } from "../memory/cold-pass.js";
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

// Only content-hit results are recorded as an "access" (marker list lives in
// cold-pass.ts, shared with memory-query/eval).
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
  /** R2 cold-storage valve (READ ONLY): strongly-matching ARCHIVED entries,
   *  surfaced only when the live/active recall answers the query weakly. This is
   *  what makes automatic archival reversible on the recall path — each hit
   *  carries its own vetted `restoreCommand` (null when it can't be restored
   *  here: the archive lives on another device, or its id isn't safe to put in a
   *  command). Consumers must run that string, never build one from `id`.
   *  Always present; `[]` when nothing cold matched or the primary recall was
   *  already strong. */
  coldStorage: ColdStorageHit[];
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
  const scoreQuery = { project: projectFilter, text: query, type: null, now };
  const scored = scoreMemories(entries, scoreQuery);

  // R2 resurrect valve (READ ONLY, shared with memory-query): scoreMemories
  // excludes every archived entry, so without this a wrongly-archived memory is
  // invisible on the primary /memarium-recall path. Fires only on a weak
  // content-matched primary recall; scope/type filtered like the primary pass;
  // NEVER writes or mutates status/index. Takes `view.entries` (the KEYED map)
  // rather than the value array so each cold hit's origin is resolved under the
  // same key `view.sources` is keyed with — never the row's untrusted `id`.
  const coldStorage = runColdPass({ entries: view.entries, scored, query: scoreQuery, sources: view.sources });

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
    coldStorage,
    meta: {
      total: scored.length,
      returned: hits.length,
      ...(cwdUnresolved ? { cwdUnresolved: true } : {}),
      nextStep: hits.length > 0
        ? "Read the top 1–5 entry.path with the Read tool for full bodies (episodes carry the arc)."
        : (cwdUnresolved
            ? "cwd didn't resolve to a synced project — pass --project <slug> or --all."
            // Cold-only recall: the restore instruction comes from the SHARED
            // origin-aware renderer, never a hard-coded local command — when every
            // cold hit is an overlay (sibling-device) archive, `memory-unarchive`
            // reads the LOCAL index and would just report "not archived".
            : coldStorage.length > 0
              ? renderColdNextStep(coldStorage)
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

/** CLI entry: print payload as JSON to stdout, print the cold-storage restore
 *  hint to stderr, and (only on a real content-hit query) bump the device-local
 *  usage sidecar for the top hits. */
export async function recallCmd(opts: RecallOptions): Promise<void> {
  const payload = buildRecallPayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");

  // Human hint for cold storage → stderr (stdout stays a clean machine payload
  // for /memarium-recall). Same renderer memory-query uses, so the restore
  // instruction is identical on both surfaces — and honest per hit: an overlay
  // hit can't be unarchived locally.
  for (const line of renderColdHints(payload.coldStorage)) console.error(line);

  // BUMP (the ONLY write side effect) — non-empty query + content hit only.
  // Reuse the repoPath buildRecallPayload already resolved (avoids a second
  // readPluginConfig + its migrate side-effect). Best-effort: usage is
  // non-essential telemetry and must never break recall. Cold hits are NEVER
  // bumped — surfacing an archived entry must not touch its usage record.
  if (payload.query !== "") {
    try {
      const bumpIds = payload.entries
        .filter((h) => Number.isFinite(h.score) && isContentHitReason(h.whyRecalled))
        .slice(0, BUMP_TOP_N)
        .map((h) => h.id);
      const now = new Date().toISOString().slice(0, 10);
      bumpUsage(payload.repoPath, bumpIds, now);
    } catch { /* usage is non-essential telemetry; never fail a recall over it */ }
  }
}
