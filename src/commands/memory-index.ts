import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { emptyMemoryIndex, type MemoryIndex } from "../memory/types.js";
import { saveMemoryIndex, upsertMemory } from "../memory/index-store.js";
import { parseMemoryMarkdown } from "../memory/parse.js";

export interface MemoryIndexReport { indexed: number; }

function walkMd(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    let entries;
    try { entries = readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
    }
  }
  return out;
}

export async function memoryIndexCmd(): Promise<MemoryIndexReport> {
  const cfg = readPluginConfig();
  const memRoot = join(cfg.repoPath, "memory");
  const idx: MemoryIndex = emptyMemoryIndex();
  let indexed = 0;
  if (existsSync(memRoot)) {
    for (const abs of walkMd(memRoot)) {
      // skip the generated primers
      if (abs.includes(`${join("memory", "_primer")}/`)) continue;
      const entry = parseMemoryMarkdown(readFileSync(abs, "utf8"));
      if (!entry) continue;
      entry.path = relative(cfg.repoPath, abs);
      upsertMemory(idx, entry);
      indexed++;
    }
  }
  saveMemoryIndex(cfg.repoPath, idx);
  return { indexed };
}
