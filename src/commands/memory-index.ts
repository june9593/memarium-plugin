import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { emptyMemoryIndex, type MemoryIndex } from "../memory/types.js";
import { saveMemoryIndex, upsertMemory } from "../memory/index-store.js";
import { parseMemoryMarkdown } from "../memory/parse.js";
import { healUndefinedFrontmatter } from "../_shared/heal-frontmatter.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";

export interface MemoryIndexReport { indexed: number; healed: number; }

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
  let healed = 0;
  // The heal step now writes md, so refuse to traverse/rewrite through a
  // symlinked ancestor or the memory/ leaf (could rewrite files outside the repo).
  assertNoSymlinkedComponent(cfg.repoPath, memRoot, "memory-index");
  if (existsSync(memRoot)) {
    for (const abs of walkMd(memRoot)) {
      // skip the generated primers
      if (abs.includes(`${join("memory", "_primer")}/`)) continue;
      let md = readFileSync(abs, "utf8");
      // Self-heal legacy `key: undefined` frontmatter (pre-#54) in place, so a
      // reindex clears the literals out of the md text — not just the index.
      const mtimeDate = new Date(statSync(abs).mtimeMs).toISOString().slice(0, 10);
      const fixed = healUndefinedFrontmatter(md, mtimeDate);
      if (fixed !== null) { writeFileSync(abs, fixed); md = fixed; healed++; }
      const entry = parseMemoryMarkdown(md);
      if (!entry) continue;
      entry.path = relative(cfg.repoPath, abs);
      upsertMemory(idx, entry);
      indexed++;
    }
  }
  saveMemoryIndex(cfg.repoPath, idx);
  return { indexed, healed };
}
