import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { loadMemoryIndex, saveMemoryIndex, upsertMemory } from "./index-store.js";
import { renderMemoryMarkdown } from "./render.js";
import { canonicalMemoryPath, supersedesId } from "./gate.js";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import type { MemoryEntry } from "./types.js";

export interface MemoryApplyItem { entry: MemoryEntry; body: string; }
export interface MemoryApplyReport { written: number; superseded: number; paths: string[]; }

function normalizeRel(p: string): string {
  return p.split("\\").join("/");
}

/** Gate-agnostic write primitive. Validates every item's path up front
 *  (canonical match, under-memory/, symlink guard) BEFORE writing anything, so
 *  a bad item can't leave earlier items written to disk but missing from the
 *  index. Then supersede-flips targets, renders md, upserts, and saves once.
 *  Knows NOTHING about the gate — both memory-write (with a gate pre-check) and
 *  memory-approve (no pre-check) call this. Paths are derived, never trusted. */
export function applyMemoryItems(repoPath: string, items: MemoryApplyItem[]): MemoryApplyReport {
  const idx = loadMemoryIndex(repoPath);
  const memRoot = resolve(join(repoPath, "memory"));

  // Preflight: validate ALL items before any write.
  const planned = items.map(({ entry, body }) => {
    const canonical = canonicalMemoryPath(entry);
    if (entry.path && normalizeRel(entry.path) !== canonical) {
      throw new Error(
        `memory apply: entry.path "${entry.path}" does not match canonical path for ${entry.id} ("${canonical}")`,
      );
    }
    const abs = resolve(join(repoPath, canonical));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep)) {
      throw new Error(`memory apply: refusing to write outside memory/: ${canonical}`);
    }
    assertNoSymlinkedComponent(repoPath, abs, "memory apply");
    return { entry, body, canonical, abs };
  });

  // Write phase (every item validated above).
  let written = 0, superseded = 0;
  const paths: string[] = [];
  for (const { entry, body, canonical, abs } of planned) {
    entry.path = canonical;

    // v3 supersede-flip: mark the replaced entry superseded in index + its md.
    // Derive the target md path canonically (don't trust the stored path) and
    // guard it the same way as the entry we write.
    const sup = supersedesId(entry);
    if (sup && idx.entries[sup]) {
      const target = idx.entries[sup];
      target.status = "superseded";
      superseded++;
      const tabs = resolve(join(repoPath, canonicalMemoryPath(target)));
      if (tabs === memRoot || tabs.startsWith(memRoot + sep)) {
        assertNoSymlinkedComponent(repoPath, tabs, "memory apply");
        if (existsSync(tabs)) {
          const md = readFileSync(tabs, "utf8").replace(/^status: .*$/m, "status: superseded");
          writeFileSync(tabs, md);
        }
      }
    }

    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, renderMemoryMarkdown(entry, body));
    upsertMemory(idx, entry);
    written++;
    paths.push(canonical);
  }
  saveMemoryIndex(repoPath, idx);
  return { written, superseded, paths };
}
