import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadQaIndex, saveQaIndex, upsertQa } from "../qa/index-store.js";
import { renderQaMarkdown } from "../qa/render.js";
import { normalizeSingleLine, qaId } from "../qa/id.js";
import type { QaEntry } from "../qa/types.js";

/** Returns true if `child` is equal to or a subdirectory of `parent` (both realpath-resolved). */
function isUnder(child: string, parent: string): boolean {
  return child === parent || child.startsWith(parent + sep);
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
    if (!entry.id) entry.id = qaId(entry.scope, entry.project, entry.question);
    if (!entry.path) entry.path = qaPath(entry);

    const qaRoot = resolve(join(cfg.repoPath, "memory", "qa"));

    // Pre-check: refuse if memory/qa itself is a symlink (incl. broken symlink).
    // lstatSync does not follow the link, so this fires before any mkdir that
    // would otherwise create the link target outside the repo.
    let qaRootStat;
    try { qaRootStat = lstatSync(qaRoot); } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (qaRootStat?.isSymbolicLink()) {
      throw new Error(`qa-write: refusing to write outside memory/qa/ (symlink guard): ${entry.path}`);
    }

    mkdirSync(qaRoot, { recursive: true });
    const abs = resolve(join(cfg.repoPath, entry.path));
    if (abs !== qaRoot && !abs.startsWith(qaRoot + sep)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/: ${entry.path}`);
    }

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

    writeFileSync(abs, renderQaMarkdown(entry, body));
    upsertQa(idx, entry);
    written++;
    paths.push(entry.path);
  }

  saveQaIndex(cfg.repoPath, idx);
  return { written, paths };
}
