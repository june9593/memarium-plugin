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

interface PlannedItem {
  entry: MemoryEntry;
  body: string;
  canonical: string;
  abs: string;
  // The id this supersedes (live OR an earlier same-batch item), plus the md to
  // flip to status:superseded (null when that path isn't safely under memory/).
  supersede: { targetId: string; mdPath: string | null } | null;
}

/** Gate-agnostic write primitive. Validates EVERYTHING up front — each new
 *  entry's path AND each supersede target's path — BEFORE any write, so a bad
 *  item or corrupt supersede target can't leave earlier items written but
 *  missing from the index. Preflight is order-aware: an item may supersede an
 *  entry created earlier in the same batch. Paths are derived, never trusted.
 *  Knows NOTHING about the gate. */
export function applyMemoryItems(repoPath: string, items: MemoryApplyItem[]): MemoryApplyReport {
  const idx = loadMemoryIndex(repoPath);
  const memRoot = resolve(join(repoPath, "memory"));

  // Entries that will exist as we go: live index + earlier same-batch items.
  const willExist: Record<string, MemoryEntry> = { ...idx.entries };
  const planned: PlannedItem[] = [];
  for (const { entry, body } of items) {
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

    let supersede: { targetId: string; mdPath: string | null } | null = null;
    const sup = supersedesId(entry);
    if (sup && willExist[sup]) {
      const target = willExist[sup];
      const tabs = resolve(join(repoPath, canonicalMemoryPath(target))); // may throw here (preflight)
      let mdPath: string | null = null;
      if (tabs === memRoot || tabs.startsWith(memRoot + sep)) {
        assertNoSymlinkedComponent(repoPath, tabs, "memory apply");
        mdPath = tabs;
      }
      supersede = { targetId: sup, mdPath };
    }

    planned.push({ entry, body, canonical, abs, supersede });
    willExist[entry.id] = entry; // visible to later items in this batch
  }

  // Write phase (every path validated above; no canonical-path computation here).
  let written = 0, superseded = 0;
  const paths: string[] = [];
  for (const { entry, body, canonical, abs, supersede } of planned) {
    entry.path = canonical;

    if (supersede && idx.entries[supersede.targetId]) {
      idx.entries[supersede.targetId].status = "superseded";
      superseded++;
      if (supersede.mdPath && existsSync(supersede.mdPath)) {
        const md = readFileSync(supersede.mdPath, "utf8").replace(/^status: .*$/m, "status: superseded");
        writeFileSync(supersede.mdPath, md);
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
