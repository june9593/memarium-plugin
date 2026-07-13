import { readPluginConfig } from "../spool/plugin-config.js";
import { buildListProjectsPayload } from "./list-projects.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { loadQaIndex } from "../qa/index-store.js";
import { loadEntityIndex } from "../entity/index-store.js";
import { resolveMemoryView } from "../memory/source-resolver.js";

export interface StatusPayload {
  /** Session digest funnel, aggregated across all real projects. */
  sessions: {
    total: number;       // synced raw sessions
    digested: number;    // digested (referenced by an episodic memory) or skip-ledgered
    pending: number;     // total - digested
    coveragePct: number; // round(digested / total * 100), 0 when no sessions
  };
  /** Episodic memories = digest receipts (one per work thread), across projects. */
  episodes: number;
  /** Typed Memory OS layer entry counts (LOCAL device repo). */
  memory: { typedMemory: number; entities: number; qa: number };
  /** Cross-device memory view (P0b): is the aggregated overlay present + fresh,
   *  and how much sibling-device memory does recall/primer now see. */
  crossDevice: {
    /** True when `~/.memarium/aggregated` (npm sync's origin/main worktree) has a memory index. */
    overlayPresent: boolean;
    overlayPath: string | null;
    /** Entry counts: local-only repo, the merged view, and entries visible ONLY via the overlay. */
    memory: { local: number; merged: number; siblingOnly: number };
  };
  /** Projects with a non-empty backlog, most-pending first. */
  pendingByProject: { project: string; pending: number }[];
  meta: { sessionRepoPath: string };
}

/** Surface the digest coverage / backlog the product otherwise hides (#22):
 *  how many synced sessions have become durable artifacts, and how much is
 *  still pending. Read-only aggregation over the existing indexes. */
export function buildStatusPayload(cwd: string = process.cwd()): StatusPayload {
  const cfg = readPluginConfig();
  const lp = buildListProjectsPayload(cwd);

  let total = 0, digested = 0, pending = 0, episodes = 0;
  for (const p of lp.projects) {
    total += p.totalSessions;
    digested += p.consumedSessions;
    pending += p.pendingSessions;
    episodes += p.episodes;
  }

  const pendingByProject = lp.projects
    .filter((p) => p.pendingSessions > 0)
    .map((p) => ({ project: p.project, pending: p.pendingSessions }));

  const localIdx = loadMemoryIndex(cfg.repoPath);
  const localMem = Object.keys(localIdx.entries).length;
  const view = resolveMemoryView(cfg.repoPath);
  // "sibling-only" = ids in the merged view that are ABSENT from the local repo
  // (not just ids where the overlay copy won the merge — a shared id whose
  // overlay copy is merely newer still exists locally). This keeps
  // local + siblingOnly === merged.
  const siblingOnly = Object.keys(view.entries).filter((id) => !(id in localIdx.entries)).length;

  return {
    sessions: {
      total, digested, pending,
      coveragePct: total > 0 ? Math.round((digested / total) * 100) : 0,
    },
    episodes,
    memory: {
      typedMemory: localMem,
      entities: Object.keys(loadEntityIndex(cfg.repoPath).entries).length,
      qa: Object.keys(loadQaIndex(cfg.repoPath).entries).length,
    },
    crossDevice: {
      overlayPresent: view.overlayPresent,
      overlayPath: view.roots.overlay,
      memory: { local: localMem, merged: Object.keys(view.entries).length, siblingOnly },
    },
    pendingByProject,
    meta: { sessionRepoPath: cfg.repoPath },
  };
}

/** CLI entry: print the coverage payload as JSON to stdout. */
export async function statusCmd(): Promise<void> {
  process.stdout.write(JSON.stringify(buildStatusPayload(), null, 2) + "\n");
}
