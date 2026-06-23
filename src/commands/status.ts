import { readPluginConfig } from "../spool/plugin-config.js";
import { buildListProjectsPayload } from "./list-projects.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { loadQaIndex } from "../qa/index-store.js";
import { loadEntityIndex } from "../entity/index-store.js";

export interface StatusPayload {
  /** Session digest funnel, aggregated across all real projects. */
  sessions: {
    total: number;       // synced raw sessions
    digested: number;    // referenced by ≥1 chronicle (or skip-marked)
    pending: number;     // total - digested
    coveragePct: number; // round(digested / total * 100), 0 when no sessions
  };
  /** Book layer (chronicles / topics / cards) totals. */
  book: { chronicles: number; topics: number; cards: number };
  /** Typed Memory OS layer entry counts. */
  memory: { typedMemory: number; entities: number; qa: number };
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

  let total = 0, digested = 0, pending = 0, chronicles = 0, topics = 0, cards = 0;
  for (const p of lp.projects) {
    total += p.totalSessions;
    digested += p.consumedSessions;
    pending += p.pendingSessions;
    chronicles += p.chronicles;
    topics += p.topics;
    cards += p.cards;
  }

  const pendingByProject = lp.projects
    .filter((p) => p.pendingSessions > 0)
    .map((p) => ({ project: p.project, pending: p.pendingSessions }));

  return {
    sessions: {
      total, digested, pending,
      coveragePct: total > 0 ? Math.round((digested / total) * 100) : 0,
    },
    book: { chronicles, topics, cards },
    memory: {
      typedMemory: Object.keys(loadMemoryIndex(cfg.repoPath).entries).length,
      entities: Object.keys(loadEntityIndex(cfg.repoPath).entries).length,
      qa: Object.keys(loadQaIndex(cfg.repoPath).entries).length,
    },
    pendingByProject,
    meta: { sessionRepoPath: cfg.repoPath },
  };
}

/** CLI entry: print the coverage payload as JSON to stdout. */
export async function statusCmd(): Promise<void> {
  process.stdout.write(JSON.stringify(buildStatusPayload(), null, 2) + "\n");
}
