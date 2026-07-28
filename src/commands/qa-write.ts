import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadQaIndex, saveQaIndex, upsertQa } from "../qa/index-store.js";
import { renderQaMarkdown, normalizeQaEntryForWrite } from "../qa/render.js";
import { normalizeSingleLine, qaId } from "../qa/id.js";
import type { QaEntry } from "../qa/types.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";

/** Returns true if `child` is equal to or a subdirectory of `parent` (both realpath-resolved). */
function isUnder(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent + sep);
}

/** Returns true when a project slug is safe to use as a single path component.
 *  Strict allowlist: only A-Z a-z 0-9 . _ - are permitted (no spaces, no Windows-
 *  reserved chars, no path separators, no NUL, no dot-only segments). */
const WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function isSafeProjectSlug(p: string): boolean {
  if (!/^[A-Za-z0-9._-]+$/.test(p)) return false;   // charset (also excludes spaces, : * ? etc.)
  if (p === "." || p === "..") return false;          // dot segments
  if (p.endsWith(".")) return false;                  // trailing dot (invalid on Windows)
  if (WIN_RESERVED.test(p.split(".")[0])) return false; // reserved device names (incl. CON.txt form)
  return true;
}

export interface QaWriteOptions { inputPath?: string; }
export interface QaWriteReport { written: number; paths: string[]; }

interface InputItem { entry: QaEntry; body: string; }

function qaPath(e: QaEntry): string {
  const scopeDir = e.project ?? "_global";
  const slug = e.id.split("/").pop() ?? e.id;
  return `memory/qa/${scopeDir}/${slug}.md`;
}

export async function qaWriteCmd(opts: QaWriteOptions): Promise<QaWriteReport> {
  if (!opts.inputPath || !existsSync(opts.inputPath)) {
    throw new Error(`qa-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync(opts.inputPath, "utf8")) as InputItem[];
  const cfg = readPluginConfig();
  const idx = loadQaIndex(cfg.repoPath);

  let written = 0;
  const paths: string[] = [];

  for (const { entry, body } of items) {
    entry.question = normalizeSingleLine(entry.question);
    entry.answerSummary = normalizeSingleLine(entry.answerSummary);
    // Backfill missing dates → today so the persisted md + live index agree with a
    // later rebuild (the renderer otherwise emits blanks; #55). project is set below.
    {
      const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
      const today = new Date().toISOString().slice(0, 10);
      if (!isDate(entry.createdAt)) entry.createdAt = today;
      if (!isDate(entry.updatedAt)) entry.updatedAt = today;
      // Arrays default to [] so md + live index agree with a rebuild. #55.
      for (const k of ["tags", "sources", "sourceMemoryIds", "sourceSessions", "relatedEntities"] as const) {
        if (!Array.isArray(entry[k])) entry[k] = [];
      }
    }
    // scope is authoritative for project membership. Derive a trimmed, validated
    // project slug, then canonicalize entry.scope so the stored scope matches
    // exactly what the scorer compares against (`project:<slug>`). Otherwise an
    // entry written under memory/qa/<slug>/ would be unretrievable.
    if (entry.scope.startsWith("project:")) {
      const slug = entry.scope.slice("project:".length).trim();
      if (!isSafeProjectSlug(slug)) {
        throw new Error(`qa-write: invalid project slug in scope ${JSON.stringify(entry.scope)}`);
      }
      entry.project = slug;
      entry.scope = `project:${slug}`;   // canonical (trimmed)
    } else {
      const s = entry.scope.trim();
      if (s !== "global" && s !== "user") {
        throw new Error(`qa-write: invalid scope ${JSON.stringify(entry.scope)} (expected "global", "user", or "project:<slug>")`);
      }
      entry.scope = s;          // canonical (trimmed)
      entry.project = null;
    }
    // CLI is authoritative for identity: always derive id/path from the
    // canonical question + scope/project, ignoring any agent-provided id/path.
    // This keeps the deterministic-slug + upsert-dedup contract stable
    // regardless of the payload.
    entry.id = qaId(entry.scope, entry.project, entry.question);
    entry.path = qaPath(entry);

    // Round-36: normalize at the WRITE BOUNDARY. Runs AFTER the date backfill
    // (which only prefix-checks `YYYY-MM-DD`, so `"2026-06-11\nid: forged"` gets
    // through it) and after id/path derivation from the already-single-lined
    // question — so the index KEY, the stored `id`, the file name and every
    // rendered frontmatter line hold the same bytes.
    normalizeQaEntryForWrite(entry);

    const qaRoot = resolve(join(cfg.repoPath, "memory", "qa"));
    const abs = resolve(join(cfg.repoPath, entry.path));

    assertNoSymlinkedComponent(cfg.repoPath, dirname(abs), "qa-write");

    if (abs !== qaRoot && !abs.startsWith(qaRoot + sep)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/: ${entry.path}`);
    }

    mkdirSync(qaRoot, { recursive: true });

    // Symlink guard: before creating the parent dir, verify that qaRoot itself is
    // not a symlink pointing outside the repo's memory/ directory.  We check
    // realpath(qaRoot) is still under realpath(cfg.repoPath) so that a
    // `memory/qa -> /tmp/evil` symlink is caught here, before any dirs are
    // created inside the attacker-controlled target.
    const realRepo = realpathSync(cfg.repoPath);
    const realRoot = realpathSync(qaRoot);
    if (!isUnder(realRoot, realRepo)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/ (symlink guard): ${entry.path}`);
    }

    mkdirSync(dirname(abs), { recursive: true });
    const realParent = realpathSync(dirname(abs));
    if (!isUnder(realParent, realRoot)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/ (symlink guard): ${entry.path}`);
    }

    // Leaf guard: if the target file already exists as a symlink, refuse —
    // writeFileSync would follow it and write content outside the repo. A
    // regular existing file is a normal upsert (overwrite in place); a missing
    // file (ENOENT) is a fresh write.
    let leafStat;
    try { leafStat = lstatSync(abs); } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (leafStat?.isSymbolicLink()) {
      throw new Error(`qa-write: refusing to write through a symlinked target file (symlink guard): ${entry.path}`);
    }
    writeFileSync(abs, renderQaMarkdown(entry, body));
    upsertQa(idx, entry);
    written++;
    paths.push(entry.path);
  }

  saveQaIndex(cfg.repoPath, idx);
  return { written, paths };
}
