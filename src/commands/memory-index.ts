import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { readPluginConfig } from "../spool/plugin-config.js";
import { emptyMemoryIndex, type MemoryIndex } from "../memory/types.js";
import { saveMemoryIndex, upsertMemory } from "../memory/index-store.js";
import { parseMemoryMarkdown } from "../memory/parse.js";
import { healUndefinedFrontmatter } from "../_shared/heal-frontmatter.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";

/** `skipped` = md files that ARE memory documents but did not parse (no
 *  frontmatter block, a missing id/type, or a DUPLICATE frontmatter key — see the
 *  round-35 note in `readFrontmatterBlock`). Reported rather than silent so a
 *  corrupt/poisoned legacy file is visible instead of just vanishing from the
 *  index. Files under the DERIVED subtrees are not memory documents at all and
 *  are excluded before parsing — see `DERIVED_MEMORY_SUBTREES`. */
export interface MemoryIndexReport { indexed: number; healed: number; skipped: number; }

/** Direct children of `memory/` that are NOT typed memory documents:
 *   • `_primer/` — generated per-device primer output;
 *   • `entities/` + `qa/` — the DERIVED layers, whose frontmatter intentionally
 *     carries no memory `type`/`id` and which own their own rebuilds
 *     (`entity-index` / `qa-index`, each rooted at its own subtree).
 *
 *  ROUND-37 (regression fix): round-34 added the `skipped` counter, but the walk
 *  still descended into `entities/` and `qa/`, so `parseMemoryMarkdown` refused
 *  EVERY healthy entity and Q&A page and the rebuild reported all of them as
 *  malformed — a false-positive storm that buries the one genuinely corrupt file
 *  the counter exists to surface. A canonical memory path is always
 *  `memory/<core|semantic|episodic|procedural>/…`, so excluding these three
 *  first segments can never exclude a real memory. It also stops the heal step
 *  from rewriting derived pages that the derived rebuilds heal themselves. */
const DERIVED_MEMORY_SUBTREES: ReadonlySet<string> = new Set(["_primer", "entities", "qa"]);

/** True when `abs` lives under one of the derived subtrees of `memRoot`. Compares
 *  the first path SEGMENT (not a substring), so a project directory that merely
 *  contains one of those words is unaffected. */
function isDerivedMemoryPath(memRoot: string, abs: string): boolean {
  const rel = relative(memRoot, abs);
  if (rel.startsWith("..")) return false; // outside memory/ — not ours to classify
  return DERIVED_MEMORY_SUBTREES.has(rel.split(sep)[0]);
}

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
  let skipped = 0;
  // The heal step now writes md, so refuse to traverse/rewrite through a
  // symlinked ancestor or the memory/ leaf (could rewrite files outside the repo).
  assertNoSymlinkedComponent(cfg.repoPath, memRoot, "memory-index");
  if (existsSync(memRoot)) {
    for (const abs of walkMd(memRoot)) {
      // Skip the generated primers AND the derived entity/qa layers — they are
      // not memory documents, so parsing them (and COUNTING the refusal) would
      // report every healthy page as malformed.
      if (isDerivedMemoryPath(memRoot, abs)) continue;
      let md = readFileSync(abs, "utf8");
      // Self-heal legacy `key: undefined` frontmatter (pre-#54) in place, so a
      // reindex clears the literals out of the md text — not just the index.
      const mtimeDate = new Date(statSync(abs).mtimeMs).toISOString().slice(0, 10);
      const fixed = healUndefinedFrontmatter(md, mtimeDate);
      if (fixed !== null) { writeFileSync(abs, fixed); md = fixed; healed++; }
      const entry = parseMemoryMarkdown(md);
      // Unparseable (incl. a duplicate-key document the parser refuses): skip and
      // COUNT it. A rebuild must degrade past one bad file, never crash on it.
      if (!entry) { skipped++; continue; }
      entry.path = relative(cfg.repoPath, abs);
      upsertMemory(idx, entry);
      indexed++;
    }
  }
  saveMemoryIndex(cfg.repoPath, idx);
  return { indexed, healed, skipped };
}
