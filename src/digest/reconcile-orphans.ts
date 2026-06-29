import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { BookIndexV2, ChronicleEntry } from "./book-index-v2.js";
import { insertChronicle } from "./book-index-v2.js";

export interface OrphanReconcileResult {
  /** Repo-relative paths of orphan chronicle md that were registered. */
  healed: string[];
  /** Orphans that could not be registered, with the reason (reported, not fatal). */
  skipped: { path: string; reason: string }[];
}

function parseArr(v: string | undefined): string[] {
  const t = (v ?? "").trim();
  if (t === "[]" || t === "") return [];
  return t.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function unquote(v: string | undefined): string {
  const t = (v ?? "").trim();
  return t.replace(/^["']|["']$/g, "");
}

/**
 * Self-heal for #38: a fan-out reader that violates the "return JSON only"
 * contract can write a chronicle .md straight under book/<project>/chronicle/
 * without going through `publish`, so it never enters the index. Because the
 * catalog is deliberately index-driven (not FS-globbing), the entire project
 * then silently vanishes from book/index.md + never gets a book/<project>/index.md.
 *
 * This scans book/<project>/chronicle/*.md for well-formed chronicle md NOT in
 * the index, parses their frontmatter, and registers them so the next
 * index-driven catalog regen includes them. Mutates `idx` in place; the caller
 * persists it and regenerates. Malformed or duplicate-threadId orphans are
 * reported in `skipped`, never thrown — one bad file can't abort the heal.
 *
 * Note: orphans bypassed `publish`'s wikilink resolution, so any `[[links]]` in
 * their bodies stay literal. That's strictly better than the project being
 * invisible, and re-digesting the project rewrites them cleanly.
 */
export function reconcileOrphanChronicles(repoRoot: string, idx: BookIndexV2): OrphanReconcileResult {
  const healed: string[] = [];
  const skipped: { path: string; reason: string }[] = [];
  const bookRoot = join(repoRoot, "book");
  if (!existsSync(bookRoot)) return { healed, skipped };

  // Every path already tracked by the index — these are NOT orphans.
  const indexedPaths = new Set<string>();
  for (const c of Object.values(idx.chronicles)) if (c.path) indexedPaths.add(c.path);

  for (const project of readdirSync(bookRoot)) {
    // book/_meta is catalog scaffolding, never a project.
    if (project === "_meta") continue;
    const chronDir = join(bookRoot, project, "chronicle");
    if (!existsSync(chronDir) || !statSync(chronDir).isDirectory()) continue;

    for (const file of readdirSync(chronDir).sort()) {
      if (!file.endsWith(".md")) continue;
      const relPath = `book/${project}/chronicle/${file}`;
      if (indexedPaths.has(relPath)) continue; // already tracked

      let entry: ChronicleEntry | null;
      try {
        entry = parseChronicleMd(readFileSync(join(chronDir, file), "utf8"), project, relPath);
      } catch (err) {
        skipped.push({ path: relPath, reason: (err as Error).message });
        continue;
      }
      if (!entry) {
        skipped.push({ path: relPath, reason: "missing/invalid frontmatter (need threadId, title, sessionIds)" });
        continue;
      }
      // insertChronicle throws on duplicate threadId; we'd rather skip+report
      // than abort (an orphan whose threadId is already indexed at a different
      // path is a genuine conflict the user should resolve, not a silent merge).
      if (idx.chronicles[entry.threadId]) {
        skipped.push({ path: relPath, reason: `threadId '${entry.threadId}' already indexed at ${idx.chronicles[entry.threadId].path}` });
        continue;
      }
      insertChronicle(idx, entry);
      healed.push(relPath);
    }
  }
  return { healed, skipped };
}

/** Parse a chronicle .md's frontmatter into a ChronicleEntry. The on-disk
 *  directory is authoritative for `project` + `path` (that's where the file
 *  actually lives); dates come from `created`/`updated`. Returns null when the
 *  required identity fields are absent. */
function parseChronicleMd(md: string, project: string, relPath: string): ChronicleEntry | null {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const threadId = unquote(fm.threadId);
  const title = unquote(fm.title);
  const sessionIds = parseArr(fm.sessionIds);
  if (!threadId || !title || sessionIds.length === 0) return null;

  const created = unquote(fm.created) || unquote(fm.createdAt);
  const updated = unquote(fm.updated) || unquote(fm.updatedAt) || created;
  return {
    threadId,
    project,
    title,
    sessionIds,
    path: relPath,
    createdAt: created || updated,
    updatedAt: updated || created,
    tags: parseArr(fm.tags),
    skip: false,
  };
}
