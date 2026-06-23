import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { scoreMemories, type ScoredMemory } from "../memory/score.js";
import { loadUsage, bumpUsage, overlayUsage } from "../memory/usage-store.js";
import { renderPrimer } from "../memory/primer.js";
import type { MemoryType } from "../memory/types.js";

export interface MemoryQueryOptions { cwd?: string; type?: string; q?: string; }

function isType(s: string | undefined): MemoryType | null {
  const ok = ["core", "semantic", "episodic", "procedural"];
  return s && ok.includes(s) ? (s as MemoryType) : null;
}

// A real CONTENT hit (vs scope/importance/recency baseline) — same markers
// eval.ts uses. Only content-hit results are recorded as an "access"; bumping
// baseline entries would let an unrelated query (e.g. "kubernetes helm") slowly
// inflate high-importance memories and poison local preference.
const CONTENT_HIT_MARKERS = ["keyword", "file", "commit"];
const BUMP_TOP_N = 5;

export async function memoryQueryCmd(opts: MemoryQueryOptions): Promise<void> {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadMemoryIndex(cfg.repoPath);
  const entries = Object.values(idx.entries);
  const now = new Date().toISOString().slice(0, 10);

  // Overlay device-local usage onto the in-memory entries BEFORE scoring, so
  // accessCount/lastAccess affect ranking. This runs on EVERY path (incl. the
  // empty-q primer refresh used by /vibebook-context) — overlay is read-only and
  // never persisted back to the synced index. (Bumping is separate; see below.)
  const usage = loadUsage(cfg.repoPath);
  overlayUsage(entries, usage);

  const scored = scoreMemories(entries, {
    project, text: opts.q ?? "", type: isType(opts.type), now,
  });

  const byType = (t: MemoryType): ScoredMemory[] => scored.filter((s) => s.entry.type === t);

  // primer: refresh on query so it always reflects current memory
  let primer = "";
  if (project) {
    primer = renderPrimer(project, entries);
    const abs = join(cfg.repoPath, "memory", "_primer", `${project}.md`);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, primer);
  }

  const conflicts = entries
    .filter((e) => e.status === "superseded" || e.supersedes !== null || e.validTo !== null)
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

  const payload = {
    project,
    primer,
    core: byType("core"),
    procedures: byType("procedural"),
    semantic: semanticAll.filter(isTrusted),
    untrustedSemantic: semanticAll.filter((s) => !isTrusted(s)),
    episodes: byType("episodic"),
    conflicts,
    meta: { total: scored.length, project },
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");

  // BUMP (the ONLY write side effect) — only on a real recall: non-empty query
  // AND a content hit. Take the top BUMP_TOP_N content-hit, finite-scored
  // results (scored is already sorted desc). Empty-q refreshes and pure
  // scope/importance/recency baseline hits never bump. Writes the local sidecar
  // only — never the synced index. Best-effort: usage tracking must never break
  // recall, so any sidecar write failure is swallowed.
  if ((opts.q ?? "").trim() !== "") {
    try {
      const bumpIds = scored
        .filter((s) => Number.isFinite(s.score) && CONTENT_HIT_MARKERS.some((m) => s.whyRecalled.includes(m)))
        .slice(0, BUMP_TOP_N)
        .map((s) => s.entry.id);
      bumpUsage(cfg.repoPath, bumpIds, now);
    } catch { /* usage is non-essential telemetry; never fail a recall over it */ }
  }
}

