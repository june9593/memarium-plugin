import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { loadMemoryIndex, saveMemoryIndex, upsertMemory } from "./index-store.js";
import { renderMemoryMarkdown } from "./render.js";
import { canonicalMemoryPath } from "./gate.js";
import type { MemoryEntry } from "./types.js";

export interface MemoryApplyItem { entry: MemoryEntry; body: string; }
export interface MemoryApplyReport { written: number; superseded: number; paths: string[]; }

function normalizeRel(p: string): string {
  return p.split("\\").join("/");
}

/** Gate-agnostic write primitive. Canonicalizes + validates each entry's path
 *  (agent paths are NOT authoritative), supersede-flips targets, renders md,
 *  upserts the index, and saves. Knows NOTHING about the gate — both
 *  memory-write (with a gate pre-check) and memory-approve (no pre-check) call
 *  this. */
export function applyMemoryItems(repoPath: string, items: MemoryApplyItem[]): MemoryApplyReport {
  const idx = loadMemoryIndex(repoPath);
  let written = 0, superseded = 0;
  const paths: string[] = [];
  const memRoot = resolve(join(repoPath, "memory"));

  for (const { entry, body } of items) {
    // Path is derived, never trusted: reject a mismatched supplied path so a
    // non-gated entry cannot overwrite a gated file by pointing path at it.
    const canonical = canonicalMemoryPath(entry);
    if (entry.path && normalizeRel(entry.path) !== canonical) {
      throw new Error(
        `memory apply: entry.path "${entry.path}" does not match canonical path for ${entry.id} ("${canonical}")`,
      );
    }
    entry.path = canonical;

    // Defense-in-depth traversal guard on the final canonical path.
    const abs = resolve(join(repoPath, entry.path));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep)) {
      throw new Error(`memory apply: refusing to write outside memory/: ${entry.path}`);
    }

    // v3 supersede-flip: mark the replaced entry superseded in index + its md.
    if (typeof entry.supersedes === "string" && idx.entries[entry.supersedes]) {
      const target = idx.entries[entry.supersedes];
      target.status = "superseded";
      superseded++;
      const tabs = resolve(join(repoPath, target.path));
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
  saveMemoryIndex(repoPath, idx);
  return { written, superseded, paths };
}
