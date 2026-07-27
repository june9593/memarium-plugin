import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { emptyQaIndex, type QaIndex } from "../qa/types.js";
import { saveQaIndex, upsertQa } from "../qa/index-store.js";
import { parseQaMarkdown } from "../qa/parse.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import { healUndefinedFrontmatter } from "../_shared/heal-frontmatter.js";

/** `skipped` = md files under memory/qa/ that did not parse (no frontmatter block,
 *  a missing id/kind, or a DUPLICATE frontmatter key — see the round-35 note in
 *  `readFrontmatterBlock`). Reported rather than silent so a corrupt/poisoned
 *  legacy file is visible instead of just vanishing. */
export interface QaIndexReport { indexed: number; healed: number; skipped: number; }

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
  let healed = 0;
  let skipped = 0;

  // Refuse to index through a symlinked ancestor or the memory/qa leaf itself
  // (could pull in files from outside the repo). Component walk uses lstatSync
  // which does not follow links, so symlinked ancestors are caught too.
  assertNoSymlinkedComponent(cfg.repoPath, qaRoot, "qa-index");

  if (existsSync(qaRoot)) {
    for (const abs of walkMd(qaRoot)) {
      let md = readFileSync(abs, "utf8");
      const mtimeDate = new Date(statSync(abs).mtimeMs).toISOString().slice(0, 10);
      const fixed = healUndefinedFrontmatter(md, mtimeDate);
      if (fixed !== null) { writeFileSync(abs, fixed); md = fixed; healed++; }
      const entry = parseQaMarkdown(md);
      // Unparseable (incl. a duplicate-key document the parser refuses): skip and
      // COUNT it. A rebuild must degrade past one bad file, never crash on it.
      if (!entry) { skipped++; continue; }
      entry.path = relative(cfg.repoPath, abs);
      upsertQa(idx, entry);
      indexed++;
    }
  }

  saveQaIndex(cfg.repoPath, idx);
  return { indexed, healed, skipped };
}
