import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { emptyEntityIndex, type EntityIndex } from "../entity/types.js";
import { saveEntityIndex, upsertEntity } from "../entity/index-store.js";
import { parseEntityMarkdown } from "../entity/parse.js";
import { healUndefinedFrontmatter } from "../_shared/heal-frontmatter.js";

export interface EntityIndexReport { indexed: number; healed: number; }

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

export async function entityIndexCmd(): Promise<EntityIndexReport> {
  const cfg = readPluginConfig();
  const entitiesRoot = join(cfg.repoPath, "memory", "entities");
  const idx: EntityIndex = emptyEntityIndex();
  let indexed = 0;
  let healed = 0;

  if (existsSync(entitiesRoot)) {
    for (const abs of walkMd(entitiesRoot)) {
      let md = readFileSync(abs, "utf8");
      const mtimeDate = new Date(statSync(abs).mtimeMs).toISOString().slice(0, 10);
      const fixed = healUndefinedFrontmatter(md, mtimeDate);
      if (fixed !== null) { writeFileSync(abs, fixed); md = fixed; healed++; }
      const entry = parseEntityMarkdown(md);
      if (!entry) continue;
      entry.path = relative(cfg.repoPath, abs);
      upsertEntity(idx, entry);
      indexed++;
    }
  }

  saveEntityIndex(cfg.repoPath, idx);
  return { indexed, healed };
}
