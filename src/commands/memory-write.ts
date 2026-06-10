import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { loadMemoryIndex, saveMemoryIndex, upsertMemory } from "../memory/index-store.js";
import { renderMemoryMarkdown } from "../memory/render.js";
import type { MemoryEntry } from "../memory/types.js";

export interface MemoryWriteOptions { inputPath?: string; }
export interface MemoryWriteReport { written: number; superseded: number; paths: string[]; }

interface InputItem { entry: MemoryEntry; body: string; }

function memoryPath(e: MemoryEntry): string {
  const scopeDir = e.project ?? "_global";
  const slug = e.id.split("/").pop() ?? e.id;
  return `memory/${e.type}/${scopeDir}/${slug}.md`;
}

export async function memoryWriteCmd(opts: MemoryWriteOptions): Promise<MemoryWriteReport> {
  if (!opts.inputPath || !existsSync(opts.inputPath)) {
    throw new Error(`memory-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync(opts.inputPath, "utf8")) as InputItem[];
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);

  let written = 0, superseded = 0;
  const paths: string[] = [];
  for (const { entry, body } of items) {
    if (!entry.path) entry.path = memoryPath(entry);
    // path-traversal guard: final resolved path must be within <repoPath>/memory/
    const memRoot = resolve(join(cfg.repoPath, "memory"));
    const abs = resolve(join(cfg.repoPath, entry.path));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep)) {
      throw new Error(`memory-write: refusing to write outside memory/: ${entry.path}`);
    }
    // mark superseded target
    if (entry.supersedes && idx.entries[entry.supersedes]) {
      const target = idx.entries[entry.supersedes];
      target.status = "superseded";
      superseded++;
      // persist to the target's md so a later `memory-index` rebuild keeps it superseded
      const tabs = resolve(join(cfg.repoPath, target.path));
      if (existsSync(tabs)) {
        const md = readFileSync(tabs, "utf8").replace(/^status: .*$/m, "status: superseded");
        writeFileSync(tabs, md);
      }
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, renderMemoryMarkdown(entry, body));
    upsertMemory(idx, entry);
    written++;
    paths.push(entry.path);
  }
  saveMemoryIndex(cfg.repoPath, idx);
  return { written, superseded, paths };
}
