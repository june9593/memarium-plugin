import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { assertNoSymlinkedComponent } from "../qa/path-guard.js";
import { memariumHome } from "../memarium-home.js";
import type { MemoryEntry } from "./types.js";
import type { MemoryAction } from "./gate.js";

export interface MemoryProposal {
  proposalId: string;       // = flatTargetKey
  targetKey: string;        // live memory the change targets (supersedes ?? id)
  proposedEntryId: string;  // entry.id being written
  action: MemoryAction;     // create | update | replace (display; re-derived at apply)
  rationale: string | null;
  sourceSession: string | null;
  createdAt: string;        // ISO
  proposal: { entry: MemoryEntry; body: string };
}

/** Device-local queue dir, OUTSIDE the git repo so it never syncs/aggregates.
 *  Namespaced per session-repo so multiple repos on one device can't collide. */
export function proposalsDir(repoPath: string): string {
  const repoHash = createHash("sha256").update(resolve(repoPath)).digest("hex").slice(0, 12);
  return join(memariumHome(), "local-proposals", repoHash);
}

/** Refuse to operate if `local-proposals/` or its `<repoHash>/` subdir is a
 *  symlink, so the queue can't be redirected outside its intended location.
 *  We intentionally do NOT guard `~/.memarium` itself — a user may legitimately
 *  symlink their memarium home. */
function guardQueuePath(targetAbs: string): void {
  assertNoSymlinkedComponent(memariumHome(), targetAbs, "proposal-store");
}

/** Filesystem-safe queue key. Flattens "/" → "__" and rejects any traversal.
 *  Rejects keys already containing "__" so the mapping stays one-to-one. */
export function flatTargetKey(targetKey: string): string {
  if (targetKey.includes("__")) {
    throw new Error(`proposal-store: target key may not contain "__": ${JSON.stringify(targetKey)}`);
  }
  const flat = targetKey.split("/").join("__");
  if (flat.includes("..") || flat.includes("/") || flat.includes("\\") || flat.length === 0) {
    throw new Error(`proposal-store: unsafe target key ${JSON.stringify(targetKey)}`);
  }
  return flat;
}

/** Accept either a targetKey ("core/yue-workflow") or a flat id ("core__yue-workflow"). */
function fileFor(repoPath: string, idOrKey: string): string {
  const flat = idOrKey.includes("/") ? flatTargetKey(idOrKey) : flatTargetKey(idOrKey.split("__").join("/"));
  return join(proposalsDir(repoPath), `${flat}.json`);
}

export function writeProposal(repoPath: string, p: MemoryProposal): string {
  const dir = proposalsDir(repoPath);
  const file = join(dir, `${flatTargetKey(p.targetKey)}.json`);
  guardQueuePath(file); // guards dir components AND the leaf (a symlinked <target>.json is refused)
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(p, null, 2) + "\n");
  return file;
}

export function readProposal(repoPath: string, idOrKey: string): MemoryProposal | null {
  let file: string;
  try { file = fileFor(repoPath, idOrKey); } catch { return null; }
  // Guard OUTSIDE the try/catch so a symlink redirect refuses loudly rather
  // than being swallowed into a null "not found".
  guardQueuePath(file);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, "utf8")) as MemoryProposal; } catch { return null; }
}

export function listProposals(repoPath: string): MemoryProposal[] {
  const dir = proposalsDir(repoPath);
  guardQueuePath(dir);
  if (!existsSync(dir)) return [];
  const out: MemoryProposal[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    const file = join(dir, name);
    guardQueuePath(file); // refuse a symlinked proposal file loudly (outside the parse try/catch)
    try { out.push(JSON.parse(readFileSync(file, "utf8")) as MemoryProposal); }
    catch { /* skip corrupt proposal file */ }
  }
  return out;
}

export function deleteProposal(repoPath: string, idOrKey: string): string | null {
  let file: string;
  try { file = fileFor(repoPath, idOrKey); } catch { return null; }
  guardQueuePath(file);
  if (!existsSync(file)) return null;
  rmSync(file);
  return file;
}
