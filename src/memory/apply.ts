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
  // The live entry this supersedes (already in the index), if any. `mdPath` is
  // the on-disk md to flip to status:superseded, or null when the target's
  // canonical path is not under memory/ (flip the index status only).
  supersede: { target: MemoryEntry; mdPath: string | null } | null;
}

/** Gate-agnostic write primitive. Validates EVERYTHING up front — each new
 *  entry's path AND each supersede target's path (resolved canonically from the
 *  live entry, which can itself throw if that entry is malformed) — BEFORE any
 *  write, so a bad item or a corrupt supersede target can't leave earlier items
 *  written to disk but missing from the index. Paths are derived, never trusted.
 *  Knows NOTHING about the gate. */
export function applyMemoryItems(repoPath: string, items: MemoryApplyItem[]): MemoryApplyReport {
  const idx = loadMemoryIndex(repoPath);
  const memRoot = resolve(join(repoPath, "memory"));

  // Preflight: validate ALL items (and their supersede targets) before any write.
  const planned: PlannedItem[] = items.map(({ entry, body }) => {
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

    // Resolve the supersede target's md path here (in preflight) so the write
    // phase can never throw from canonicalMemoryPath(target) mid-batch.
    let supersede: { target: MemoryEntry; mdPath: string | null } | null = null;
    const sup = supersedesId(entry);
    if (sup && idx.entries[sup]) {
      const target = idx.entries[sup];
      const tabs = resolve(join(repoPath, canonicalMemoryPath(target))); // may throw here (preflight)
      let mdPath: string | null = null;
      if (tabs === memRoot || tabs.startsWith(memRoot + sep)) {
        assertNoSymlinkedComponent(repoPath, tabs, "memory apply");
        mdPath = tabs;
      }
      supersede = { target, mdPath };
    }

    return { entry, body, canonical, abs, supersede };
  });

  // Write phase (everything validated above; no canonical-path computation here).
  let written = 0, superseded = 0;
  const paths: string[] = [];
  for (const { entry, body, canonical, abs, supersede } of planned) {
    entry.path = canonical;

    if (supersede) {
      supersede.target.status = "superseded";
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
