import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { resolveMemoryView } from "../memory/source-resolver.js";
import { scoreMemories, isArchived, type ScoredMemory } from "../memory/score.js";
import { loadUsage, bumpUsage, overlayUsage } from "../memory/usage-store.js";
import { renderPrimer } from "../memory/primer.js";
// R2 cold-storage valve — SHARED with `recall` (src/memory/cold-pass.ts) so both
// primary recall surfaces honour archival's "wrongly-archived resurfaces on
// demand" guarantee identically.
import { runColdPass, renderColdHints, isContentHit, type ColdStorageHit } from "../memory/cold-pass.js";
import type { MemoryEntry, MemoryType } from "../memory/types.js";

export interface MemoryQueryOptions { cwd?: string; type?: string; q?: string; }

export type { ColdStorageHit };

export interface MemoryQueryResult {
  project: string | null;
  primer: string;
  core: ScoredMemory[];
  procedures: ScoredMemory[];
  semantic: ScoredMemory[];
  untrustedSemantic: ScoredMemory[];
  episodes: ScoredMemory[];
  conflicts: { entry: MemoryEntry; score: number; whyRecalled: string }[];
  coldStorage: ColdStorageHit[];
  meta: { total: number; project: string | null };
}

function isType(s: string | undefined): MemoryType | null {
  const ok = ["core", "semantic", "episodic", "procedural"];
  return s && ok.includes(s) ? (s as MemoryType) : null;
}

// Only content-hit results are recorded as an "access" (see cold-pass.ts for the
// marker list) — bumping baseline entries would let an unrelated query (e.g.
// "kubernetes helm") slowly inflate high-importance memories and poison local
// preference.
const BUMP_TOP_N = 5;

export async function memoryQueryCmd(opts: MemoryQueryOptions): Promise<MemoryQueryResult> {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  // Merge local + aggregated-overlay memory (P0b) so recall sees sibling-device
  // memory. Read-only; writes stay local; pending proposals (outside the repo)
  // are excluded for free; superseded kept (conflicts block needs them).
  const view = resolveMemoryView(cfg.repoPath);
  const entries = Object.values(view.entries);
  const now = new Date().toISOString().slice(0, 10);

  // Overlay device-local usage onto the in-memory entries BEFORE scoring, so
  // accessCount/lastAccess affect ranking. This runs on EVERY path (incl. the
  // empty-q primer refresh used by /memarium-context) — overlay is read-only and
  // never persisted back to the synced index. (Bumping is separate; see below.)
  const usage = loadUsage(cfg.repoPath);
  overlayUsage(entries, usage);

  const scoreQuery = {
    project, text: opts.q ?? "", type: isType(opts.type), now,
  };
  const scored = scoreMemories(entries, scoreQuery);

  const byType = (t: MemoryType): ScoredMemory[] => scored.filter((s) => s.entry.type === t);

  // primer: render on query so it always reflects current memory (merged view).
  // We do NOT persist it to memory/_primer/<project>.md anymore — memory-primer
  // renders live from the same merged view, so a written file would just be a
  // stale, local-only snapshot of a cross-device render (P0b detail B).
  let primer = "";
  if (project) {
    primer = renderPrimer(project, entries);
  }

  // Archived is out of recall on ALL read surfaces — exclude it here too. An
  // entry archived via the "expired" rule keeps validTo !== null, so without this
  // guard it would still match the time-bounded rule and leak into every payload's
  // conflicts section (the R2 cold-storage valve is the ONLY archived read path).
  const conflicts = entries
    .filter((e) => !isArchived(e) && (e.status === "superseded" || e.supersedes !== null || e.validTo !== null))
    .map((e) => ({
      entry: e,
      score: 0,
      whyRecalled:
        e.status === "superseded" ? "superseded"
        : e.supersedes !== null ? "supersedes-other"
        : "time-bounded",
    }));

  // Split semantic by trust (#23): only `trusted` semantic is shown as plain
  // "Project facts"; untrusted/unknown semantic goes in a SEPARATE group so the
  // skill can surface it flagged ("⚠️ unverified source — don't treat as fact")
  // instead of silently mixing it in. Same split the primer auto-injection uses.
  const semanticAll = byType("semantic");
  const isTrusted = (s: ScoredMemory): boolean => (s.entry.trust ?? "unknown") === "trusted";

  // R2 resurrect valve (READ ONLY): if the active recall produced few
  // content-matched hits, surface the top strongly-matching ARCHIVED entries.
  // Shared with `recall` — see src/memory/cold-pass.ts for the gate, the scope/
  // type filtering and the trust handling. NEVER writes/mutates status. Passes
  // `view.entries` (the KEYED map) so each hit's origin resolves under the same
  // key `view.sources` is keyed with, never the row's untrusted `id`.
  const coldStorage: ColdStorageHit[] = runColdPass({
    entries: view.entries, scored, query: scoreQuery, sources: view.sources,
  });

  const payload: MemoryQueryResult = {
    project,
    primer,
    core: byType("core"),
    procedures: byType("procedural"),
    semantic: semanticAll.filter(isTrusted),
    untrustedSemantic: semanticAll.filter((s) => !isTrusted(s)),
    episodes: byType("episodic"),
    conflicts,
    coldStorage,
    meta: { total: scored.length, project },
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");

  // Human hint for cold storage → stderr, so the JSON on stdout stays a clean
  // machine payload for the skill (memory-query is consumed as JSON). Lines are
  // rendered by the shared cold pass so `recall` prints the identical hint.
  for (const line of renderColdHints(coldStorage)) console.error(line);

  // BUMP (the ONLY write side effect) — only on a real recall: non-empty query
  // AND a content hit. Take the top BUMP_TOP_N content-hit, finite-scored
  // results (scored is already sorted desc). Empty-q refreshes and pure
  // scope/importance/recency baseline hits never bump. Writes the local sidecar
  // only — never the synced index. Best-effort: usage tracking must never break
  // recall, so any sidecar write failure is swallowed.
  if ((opts.q ?? "").trim() !== "") {
    try {
      const bumpIds = scored
        .filter((s) => Number.isFinite(s.score) && isContentHit(s))
        .slice(0, BUMP_TOP_N)
        .map((s) => s.entry.id);
      bumpUsage(cfg.repoPath, bumpIds, now);
    } catch { /* usage is non-essential telemetry; never fail a recall over it */ }
  }

  return payload;
}

