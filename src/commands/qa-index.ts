import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { emptyQaIndex, type QaIndex } from "../qa/types.js";
import { saveQaIndex, upsertQa } from "../qa/index-store.js";
import { parseQaMarkdown } from "../qa/parse.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";

export interface QaIndexReport { indexed: number; }

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

export async function qaIndexCmd(): Promise<QaIndexReport> {
  const cfg = readPluginConfig();
  const qaRoot = join(cfg.repoPath, "memory", "qa");
  const idx: QaIndex = emptyQaIndex();
  let indexed = 0;

  // Refuse to index through a symlinked ancestor or the memory/qa leaf itself
  // (could pull in files from outside the repo). Component walk uses lstatSync
  // which does not follow links, so symlinked ancestors are caught too.
  assertNoSymlinkedComponent(cfg.repoPath, qaRoot, "qa-index");

  if (existsSync(qaRoot)) {
    for (const abs of walkMd(qaRoot)) {
      const entry = parseQaMarkdown(readFileSync(abs, "utf8"));
      if (!entry) continue;
      entry.path = relative(cfg.repoPath, abs);
      upsertQa(idx, entry);
      indexed++;
    }
  }

  saveQaIndex(cfg.repoPath, idx);
  return { indexed };
}
