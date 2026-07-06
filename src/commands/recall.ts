import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadBookIndexV2 } from "../digest/book-index-v2.js";
import { resolveProjectFromCwd } from "../_shared/project-resolve.js";

/**
 * `memarium recall` — three-stage progressive catalog.
 *
 * Stage 1 (default, ~2-5 KB): a project's TOPIC LIST plus 1-line
 * descriptions. The agent looks at this first to find which subsystem(s)
 * its task touches. Chronicles are NOT listed here — there are too many
 * (typical project: 50+ chronicles), and they aren't the right grain
 * for "is this relevant?" triage.
 *
 * Stage 2 (--topic <slug>, ~5-15 KB): for one chosen topic, list its
 * contributing CHRONICLES with frontmatter (title, files_touched,
 * commits, decisions, blockers, status). The agent reads the
 * frontmatter to decide which chronicles to fully Read.
 *
 * Stage 3: the agent uses the `Read` tool directly on a chronicle's
 * absolute path. No extra recall command needed.
 */

export interface RecallEntry {
  /** topic | chronicle.
   *  In stage 1 (default) only `topic` entries appear; in stage 2 (--topic)
   *  `chronicle` entries appear with frontmatter. */
  kind: "topic" | "chronicle";
  /** Project slug. */
  project: string;
  /** Display title (frontmatter title → first `# heading` → slug). */
  title: string;
  /** Short summary — for topics: 1 sentence from the topic body.
   *  For chronicles: a synthesized line from frontmatter facts. */
  summary: string;
  /** Absolute path the agent should pass to `Read`. */
  path: string;
  /** Stable id within its kind: topicSlug / threadId. */
  slug: string;
  /** Frontmatter facts that the agent triages on (chronicles only).
   *  Only populated in stage 2. */
  frontmatter?: ChronicleFrontmatter;
  /** ISO date — last write. */
  updatedAt: string;
  /** Tags from BookIndex / topic frontmatter. */
  tags: string[];
}

/** Subset of chronicle frontmatter the recall payload surfaces.
 *  Mirrors the AI-first fields documented in
 *  `skills/memarium/references/chronicle-format.md`. */
export interface ChronicleFrontmatter {
  files_touched?: string[];
  commits?: string[];
  decisions?: string[];
  blockers?: string[];
  next_steps?: string[];
  status?: string;
}

export interface RecallPayload {
  /** "stage-1-topics" or "stage-2-articles". Tells the consumer how to
   *  interpret the entries. */
  stage: "stage-1-topics" | "stage-2-articles";
  /** Project the catalog scopes to (null when --all). */
  project: string | null;
  /** Topic slug being expanded in stage 2 (null otherwise). */
  topic: string | null;
  /** Absolute path the LLM should pass to `Read` for chronicle bodies. */
  repoPath: string;
  entries: RecallEntry[];
  meta: {
    topics: number;
    chronicles: number;
    cwdUnresolved?: boolean;
    /** Hint shown by the recall skill when the agent should drill
     *  into a topic next. */
    nextStep?: string;
  };
}

export interface RecallOptions {
  cwd?: string;
  project?: string;
  /** Stage 2: list chronicles for this topic (project must also be set
   *  or resolvable from cwd). */
  topic?: string;
  /** Catalog every project (no filter). Use sparingly — at scale this
   *  blows past the 30 KB stage-1 budget. */
  all?: boolean;
}

export function buildRecallPayload(opts: RecallOptions = {}): RecallPayload {
  const cfg = readPluginConfig();
  const bookIndex = loadBookIndexV2(cfg.repoPath);

  let projectFilter: string | null = opts.project?.trim() || null;
  let cwdUnresolved = false;
  if (!projectFilter && !opts.all && opts.cwd) {
    projectFilter = resolveProjectFromCwd(opts.cwd, cfg.repoPath);
    if (!projectFilter) {
      cwdUnresolved = true;
    }
  }

  // Stage 2 — chronicle list for one topic.
  if (opts.topic) {
    return buildStage2(cfg.repoPath, bookIndex, projectFilter, opts.topic);
  }

  // Stage 1 — topic list.
  return buildStage1(cfg.repoPath, bookIndex, projectFilter, cwdUnresolved);
}

// ---------- stage 1: topic list ----------

function buildStage1(
  repoPath: string,
  bookIndex: ReturnType<typeof loadBookIndexV2>,
  projectFilter: string | null,
  cwdUnresolved: boolean,
): RecallPayload {
  const entries: RecallEntry[] = [];

  for (const t of Object.values(bookIndex.topics)) {
    const project = t.project || projectFromPath(t.path);
    if (!project) continue;
    if (projectFilter && project !== projectFilter) continue;
    entries.push({
      kind: "topic",
      project,
      title: titleForArtifact(repoPath, t.path, t.topicSlug),
      summary: summaryFor(repoPath, t.path),
      path: join(repoPath, t.path),
      slug: t.topicSlug,
      updatedAt: t.updatedAt,
      tags: [],
    });
  }

  // Topics newest first.
  entries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const topicCount = entries.length;
  return {
    stage: "stage-1-topics",
    project: projectFilter,
    topic: null,
    repoPath,
    entries,
    meta: {
      topics: topicCount,
      chronicles: 0,
      ...(cwdUnresolved ? { cwdUnresolved: true } : {}),
      nextStep: topicCount > 0
        ? `Pick a relevant topic, then run: \${CLAUDE_PLUGIN_ROOT}/bin/memarium-plugin.js recall --project <slug> --topic <topicSlug>`
        : "No topics yet for this project.",
    },
  };
}

// ---------- stage 2: chronicle list for one topic ----------

function buildStage2(
  repoPath: string,
  bookIndex: ReturnType<typeof loadBookIndexV2>,
  projectFilter: string | null,
  topicSlug: string,
): RecallPayload {
  const entries: RecallEntry[] = [];

  // Find the topic so we know which contributing chronicles to surface.
  const topic = Object.values(bookIndex.topics).find((t) => {
    const proj = t.project || projectFromPath(t.path);
    return t.topicSlug === topicSlug && (!projectFilter || proj === projectFilter);
  });

  if (topic) {
    const contributing = new Set(topic.contributingThreads ?? []);
    for (const c of Object.values(bookIndex.chronicles)) {
      if (c.skip) continue;
      if (!contributing.has(c.threadId)) continue;
      const project = c.project || projectFromPath(c.path) || "_unknown";
      const fm = readChronicleFrontmatter(repoPath, c.path);
      entries.push({
        kind: "chronicle",
        project,
        title: titleForArtifact(repoPath, c.path, c.title || c.threadId),
        summary: summarizeFrontmatter(fm),
        path: join(repoPath, c.path),
        slug: c.threadId,
        frontmatter: fm,
        updatedAt: c.updatedAt,
        tags: c.tags ?? [],
      });
    }
  }

  // Chronicles newest first.
  entries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  return {
    stage: "stage-2-articles",
    project: projectFilter,
    topic: topicSlug,
    repoPath,
    entries,
    meta: {
      topics: 0,
      chronicles: entries.filter((e) => e.kind === "chronicle").length,
      nextStep: "Read full bodies via the Read tool on entry.path.",
    },
  };
}

// ---------- helpers ----------

function projectFromPath(path: string | undefined): string | null {
  if (!path) return null;
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] !== "book") return null;
  return parts[1] || null;
}

function titleForArtifact(repoPath: string, repoRel: string, fallback: string): string {
  const abs = join(repoPath, repoRel);
  if (!existsSync(abs)) return fallback;
  const head = readFileSync(abs, "utf8").slice(0, 1024);
  const hMatch = head.match(/^#\s+(.+?)\s*$/m);
  if (hMatch) return hMatch[1].trim();
  const fmMatch = head.match(/^---[\s\S]*?\ntitle:\s*(.+?)\s*\n[\s\S]*?---/);
  if (fmMatch) return fmMatch[1].replace(/^["']|["']$/g, "").trim();
  return fallback;
}

function summaryFor(repoPath: string, repoRel: string): string {
  const abs = join(repoPath, repoRel);
  if (!existsSync(abs)) return "";
  const body = readFileSync(abs, "utf8");
  const stripped = body.replace(/^---[\s\S]*?---\s*\n/, "");
  const lines = stripped.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#") || line.startsWith("---")) continue;
    if (line.startsWith("- ") || line.startsWith("* ")) continue;
    if (line.startsWith(">") || line.startsWith("```")) continue;
    const plain = line
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1");
    return plain.length > 200 ? plain.slice(0, 200) + "…" : plain;
  }
  return "";
}

/** Parse the AI-first frontmatter fields out of a chronicle md.
 *  Tiny line-based YAML subset parser: supports `key: scalar` and
 *  `key:\n  - item\n  - item` shapes. Avoids pulling in a full YAML
 *  dep just for the recall payload's narrow needs. */
function readChronicleFrontmatter(repoPath: string, repoRel: string): ChronicleFrontmatter {
  const abs = join(repoPath, repoRel);
  if (!existsSync(abs)) return {};
  const body = readFileSync(abs, "utf8");
  const m = body.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};

  const lines = m[1].split("\n");
  const result: ChronicleFrontmatter = {};
  const lists: Record<string, string[]> = {};
  let currentList: string | null = null;

  // Walk line-by-line so list items only attach to the key whose block
  // they're under (regex-only approach over-matched into sibling keys).
  for (const raw of lines) {
    const line = raw;
    if (line.match(/^\s+-\s+/)) {
      // List item: belongs to currentList if we're under one.
      if (currentList) {
        const item = line.replace(/^\s+-\s+/, "").trim().replace(/^["']|["']$/g, "");
        if (item) lists[currentList]!.push(item);
      }
      continue;
    }
    // Top-level key.
    const m2 = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m2) {
      currentList = null;
      continue;
    }
    const key = m2[1];
    const after = m2[2].trim();
    if (after === "") {
      // List or block scalar.
      currentList = key;
      lists[key] = [];
    } else {
      currentList = null;
      // Scalar value.
      const cleaned = after.replace(/^["']|["']$/g, "");
      if (key === "status") result.status = cleaned;
    }
  }

  if (lists.files_touched) result.files_touched = lists.files_touched;
  if (lists.commits) result.commits = lists.commits;
  if (lists.decisions) result.decisions = lists.decisions;
  if (lists.blockers) result.blockers = lists.blockers;
  if (lists.next_steps) result.next_steps = lists.next_steps;
  return result;
}

function summarizeFrontmatter(fm: ChronicleFrontmatter): string {
  const bits: string[] = [];
  if (fm.status) bits.push(`status=${fm.status}`);
  if (fm.files_touched?.length) bits.push(`${fm.files_touched.length} files`);
  if (fm.commits?.length) bits.push(`${fm.commits.length} commits`);
  if (fm.decisions?.length) bits.push(`${fm.decisions.length} decisions`);
  if (fm.blockers?.length) bits.push(`${fm.blockers.length} blockers`);
  return bits.join(" · ") || "(no AI-first frontmatter — legacy chronicle)";
}

/** CLI entry: print payload as JSON to stdout. */
export async function recallCmd(opts: RecallOptions): Promise<void> {
  const payload = buildRecallPayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
