import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadEntityIndex, saveEntityIndex, upsertEntity } from "../entity/index-store.js";
import { renderEntityMarkdown } from "../entity/render.js";
import type { EntityPage } from "../entity/types.js";

export interface EntityWriteOptions { inputPath?: string; }
export interface EntityWriteReport { written: number; paths: string[]; }

interface InputItem { entry: EntityPage; body: string; }

function entityPath(e: EntityPage): string {
  const scopeDir = e.project ?? "_global";
  const slug = e.id.split("/").pop() ?? e.id;
  return `memory/entities/${scopeDir}/${slug}.md`;
}

export async function entityWriteCmd(opts: EntityWriteOptions): Promise<EntityWriteReport> {
  if (!opts.inputPath || !existsSync(opts.inputPath)) {
    throw new Error(`entity-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync(opts.inputPath, "utf8")) as InputItem[];
  const cfg = readPluginConfig();
  const idx = loadEntityIndex(cfg.repoPath);

  let written = 0;
  const paths: string[] = [];

  for (const { entry, body } of items) {
    if (!entry.path) entry.path = entityPath(entry);

    // path-traversal guard: final resolved path must be within <repoPath>/memory/entities/
    const entRoot = resolve(join(cfg.repoPath, "memory", "entities"));
    // Ensure entRoot exists so realpathSync can resolve it
    mkdirSync(entRoot, { recursive: true });
    const memRoot = entRoot;
    const abs = resolve(join(cfg.repoPath, entry.path));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep)) {
      throw new Error(`entity-write: refusing to write outside memory/entities/: ${entry.path}`);
    }

    // Symlink-safe check: after creating the parent directory, verify via realpath that
    // the resolved parent is still within memory/entities/ (guards against symlinked dirs).
    mkdirSync(dirname(abs), { recursive: true });
    const realParent = realpathSync(dirname(abs));
    const realRoot = realpathSync(entRoot);
    if (realParent !== realRoot && !realParent.startsWith(realRoot + sep)) {
      throw new Error(`entity-write: refusing to write outside memory/entities/ (symlink guard): ${entry.path}`);
    }

    // Entity bodies are written verbatim — they reference other entities via
    // plain text, so there is no wikilink-resolution step here.
    const resolvedBody = body;

    writeFileSync(abs, renderEntityMarkdown(entry, resolvedBody));
    upsertEntity(idx, entry);
    written++;
    paths.push(entry.path);
  }

  saveEntityIndex(cfg.repoPath, idx);
  return { written, paths };
}
