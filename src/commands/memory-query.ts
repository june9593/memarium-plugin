import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { resolveMemoryView, type MemorySource } from "../memory/source-resolver.js";
import { scoreMemories, scoreArchived, isArchived, type ScoredMemory } from "../memory/score.js";
import { loadUsage, bumpUsage, overlayUsage } from "../memory/usage-store.js";
import { renderPrimer } from "../memory/primer.js";
import type { MemoryEntry, MemoryType } from "../memory/types.js";

export interface MemoryQueryOptions { cwd?: string; type?: string; q?: string; }

/** One read-only "cold storage" hit — a strongly-matching ARCHIVED entry
 *  surfaced by the R2 resurrect valve. A `local` hit is restorable HERE with
 *  `memory-unarchive <id>` (it lives in this device's index); an `overlay` hit
 *  is a sibling device's archived memory, so it must be restored on
 *  `originDevice` (memory-unarchive only touches the local index). */
export interface ColdStorageHit {
  id: string;
  title: string;
  score: number;
  archivedReason: string | null;
  source: MemorySource;
  originDevice: string | null;
}

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

// A real CONTENT hit (vs scope/importance/recency baseline) — same markers
// eval.ts uses. Only content-hit results are recorded as an "access"; bumping
// baseline entries would let an unrelated query (e.g. "kubernetes helm") slowly
// inflate high-importance memories and poison local preference.
const CONTENT_HIT_MARKERS = ["keyword", "file", "commit"];
const isContentHit = (s: ScoredMemory): boolean =>
  CONTENT_HIT_MARKERS.some((m) => s.whyRecalled.includes(m));
const BUMP_TOP_N = 5;

// R2 "resurrect valve" — when the ACTIVE recall has few content-matched hits,
// surface strongly-matching ARCHIVED entries in a read-only cold-storage
// section so aggressive auto-archival stays reversible. NO write on this path.
const COLD_FLOOR = 3;        // fire only when fewer than this many active content hits clear the floor…
const COLD_TOP_K = 3;        // …surface up to this many archived matches…
const COLD_SCORE_FLOOR = 2;  // …each of which must be a content match clearing this score.

// Project/scope eligibility — the SAME scope rule scoreMemories' isEligible
// applies to the primary pass. scoreArchived filters ONLY on status==="archived"
// (not scope), so cold-storage results must be scope-filtered here or they'd
// leak OTHER projects' archived memory into this project's recall.
function inScope(e: MemoryEntry, project: string | null): boolean {
  if (e.scope === "global" || e.scope === "user") return true;
  if (project && e.scope === `project:${project}`) return true;
  return project === null;
}

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
  // content-matched hits (baseline scope/importance hits don't count — the whole
  // point is "the live memory doesn't answer this query"), surface the top
  // strongly-matching ARCHIVED entries. scoreArchived filters ONLY on archived
  // status, so we (a) scope-filter to the query's project and (b) apply the
  // query's --type filter — SAME as the primary pass — so a `--type procedural`
  // query can't surface an archived `semantic` hit. NEVER writes/mutates status.
  const strongPrimary = scored.filter((s) => isContentHit(s) && s.score >= COLD_SCORE_FLOOR).length;
  let coldStorage: ColdStorageHit[] = [];
  if (strongPrimary < COLD_FLOOR && (opts.q ?? "").trim() !== "") {
    coldStorage = scoreArchived(entries, scoreQuery)
      .filter((s) => inScope(s.entry, project))
      .filter((s) => !scoreQuery.type || s.entry.type === scoreQuery.type)
      .filter((s) => isContentHit(s) && s.score >= COLD_SCORE_FLOOR)
      .slice(0, COLD_TOP_K)
      .map((s) => ({
        id: s.entry.id, title: s.entry.title, score: s.score, archivedReason: s.entry.archivedReason,
        // Origin decides which restore hint is honest: a `local` cold hit lives
        // in THIS device's index (memory-unarchive works); an `overlay` hit is
        // a sibling device's archived memory that memory-unarchive (local-only)
        // can't touch, so we point the user at its origin device instead.
        source: view.sources[s.entry.id] ?? "local",
        originDevice: s.entry.originDevice ?? null,
      }));
  }

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
  // machine payload for the skill (memory-query is consumed as JSON). The restore
  // instruction is per-hit: local hits can be unarchived HERE; overlay-only hits
  // live on another device and must be restored there (memory-unarchive is
  // local-only, so advertising it for an overlay hit would always report "not
  // archived").
  if (coldStorage.length) {
    console.error(`\n❄️ ${coldStorage.length} archived also matched:`);
    for (const c of coldStorage) {
      if (c.source === "overlay") {
        const dev = c.originDevice ? `device ${c.originDevice}` : "another device";
        console.error(`  ${c.id}  (${c.archivedReason})  — ${c.title}  — archived on ${dev}; restore it there`);
      } else {
        console.error(`  ${c.id}  (${c.archivedReason})  — ${c.title}  — memory-unarchive ${c.id} to restore`);
      }
    }
  }

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

