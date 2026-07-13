import { readPluginConfig } from "../spool/plugin-config.js";
import { loadIndex } from "../_shared/index-store.js";
import { loadMemoryIndex } from "../memory/index-store.js";
import { consumedSessions } from "../digest/consumed.js";
import { isRealProjectPath } from "../_shared/digest/project-filter.js";

export interface ProjectStats {
  /** Project slug as derived by the sync adapters. */
  project: string;
  /** Total sessions synced for this project (including those already
   *  digested into chronicles). */
  totalSessions: number;
  /** Sessions already digested (referenced by an episodic memory) or
   *  skip-ledgered — once "decided", we don't reconsider. */
  consumedSessions: number;
  /** = totalSessions - consumedSessions. Drives the global-mode subagent
   *  fan-out: only project-mode loops over projects with `pendingSessions > 0`. */
  pendingSessions: number;
  /** Number of episodic memories (digest receipts) for this project. */
  episodes: number;
  /** Total memory entries (all types) for this project. */
  memories: number;
  /** Most recent `updatedAt` across this project's memory (`null` if none).
   *  Helpful for users skimming the list. */
  lastTouchedAt: string | null;
}

export interface ListProjectsPayload {
  projects: ProjectStats[];
  meta: {
    /** True if the user's cwd equals the configured repoPath. The skill
     *  uses this to decide between global-mode (fan-out) and project-mode. */
    isInSessionRepo: boolean;
    /** Configured repoPath, so the skill can show the user where to `cd`
     *  if they're not already there. */
    sessionRepoPath: string;
  };
}

/**
 * List every real project that has at least one synced session, with
 * per-project counts of pending vs already-digested sessions and existing
 * book artifacts. Pseudo-projects (those failing isRealProjectPath) are
 * excluded — they can't be digested anyway.
 *
 * The global-mode `/memarium` skill calls this to:
 *   1. show the user a table of "what's left",
 *   2. decide which projects to spawn subagents for (pendingSessions > 0),
 *   3. avoid re-digesting projects the user already handled in project-mode.
 */
export function buildListProjectsPayload(cwd: string = process.cwd()): ListProjectsPayload {
  const cfg = readPluginConfig();
  const indexFile = loadIndex(cfg.repoPath);
  const memIndex = loadMemoryIndex(cfg.repoPath);
  const consumed = consumedSessions(cfg.repoPath);

  const stats = new Map<string, ProjectStats>();
  const ensure = (project: string): ProjectStats => {
    let s = stats.get(project);
    if (!s) {
      s = {
        project,
        totalSessions: 0, consumedSessions: 0, pendingSessions: 0,
        episodes: 0, memories: 0, lastTouchedAt: null,
      };
      stats.set(project, s);
    }
    return s;
  };

  for (const e of Object.values(indexFile.entries)) {
    if (!isRealProjectPath(e.project)) continue;
    const s = ensure(e.project);
    s.totalSessions++;
    if (consumed.has(e.sessionId)) s.consumedSessions++;
  }
  for (const e of Object.values(memIndex.entries)) {
    // Defensive: a parseable-but-malformed index must not break mode detection.
    if (!e || typeof e !== "object") continue;
    const m = e as { project?: unknown; type?: unknown; updatedAt?: unknown };
    if (typeof m.project !== "string" || !isRealProjectPath(m.project)) continue;
    const s = ensure(m.project);
    s.memories++;
    if (m.type === "episodic") s.episodes++;
    if (typeof m.updatedAt === "string") s.lastTouchedAt = laterOf(s.lastTouchedAt, m.updatedAt);
  }

  for (const s of stats.values()) {
    s.pendingSessions = s.totalSessions - s.consumedSessions;
  }

  // Sort: most pending first; tie-break by project slug. Empty-pending at the
  // end so global-mode skill can early-cut after the first zero-pending row.
  const projects = [...stats.values()].sort((a, b) => {
    if (a.pendingSessions !== b.pendingSessions) return b.pendingSessions - a.pendingSessions;
    return a.project.localeCompare(b.project);
  });

  return {
    projects,
    meta: {
      isInSessionRepo: pathsEqual(cwd, cfg.repoPath),
      sessionRepoPath: cfg.repoPath,
    },
  };
}

function laterOf(a: string | null, b: string): string {
  if (!a) return b;
  return a > b ? a : b;
}

function pathsEqual(a: string, b: string): boolean {
  // Case-sensitive on macOS APFS by default; we deliberately don't
  // normalize symlinks (cwd through a symlink is a different "place" for
  // the skill's purposes — the user explicitly cd'd via that path).
  const trim = (p: string) => p.replace(/\/+$/, "");
  return trim(a) === trim(b);
}

/** CLI entry: print payload as JSON to stdout. */
export async function listProjectsCmd(): Promise<void> {
  const payload = buildListProjectsPayload();
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
