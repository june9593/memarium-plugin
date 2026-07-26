import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

/** Round-18 (PR #65): `saveMemoryIndex` used to `writeFileSync` STRAIGHT onto
 *  `index.memory.json`, which truncates the target before it writes. A failure
 *  part-way through (ENOSPC is the canonical one) therefore left a TRUNCATED or
 *  half-written index on disk — and the round-17 rollback, which restores only
 *  the `.md` snapshots, would "roll back" into that corrupt-index state.
 *
 *  The fix is the same temp-file + `renameSync` idiom `usage-store.saveUsage`
 *  already uses: `rename(2)` inside one directory is atomic, so the index is
 *  always either the complete OLD content or the complete NEW content.
 *
 *  These tests inject the failure at each half of that idiom (the temp write and
 *  the rename) and assert the previous index survives BYTE-IDENTICAL, plus that
 *  a failed save leaves no temp litter behind.
 *
 *  `failWrite` deliberately models ENOSPC FAITHFULLY: a real out-of-space write
 *  does not fail cleanly — the target is already truncated and a partial prefix
 *  is on disk when the error surfaces. A mock that merely threw first would pass
 *  against the old non-atomic code and prove nothing. `ctl` is hoisted because
 *  the vi.mock factory runs during the import phase, before this module body
 *  evaluates; both flags default off so every other assertion uses the real fs. */
const ctl = vi.hoisted(() => ({ failWrite: false, failRename: false }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const enospc = (op: string) =>
    Object.assign(new Error(`ENOSPC: no space left on device, ${op}`), { code: "ENOSPC" });
  return {
    ...actual,
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) => {
      if (ctl.failWrite) {
        // Truncate whatever this write targets and land a short prefix, exactly
        // as the kernel would, THEN fail. Against the atomic implementation the
        // casualty is the throwaway temp file; against a direct write it is the
        // real index.
        const [target, data] = args;
        actual.writeFileSync(target, String(data).slice(0, 12));
        throw enospc("write");
      }
      return actual.writeFileSync(...args);
    },
    renameSync: (...args: Parameters<typeof actual.renameSync>) => {
      if (ctl.failRename) throw enospc("rename");
      return actual.renameSync(...args);
    },
  };
});

import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { loadMemoryIndex, saveMemoryIndex, MEMORY_INDEX_REL } from "../../src/memory/index-store.js";
import type { MemoryEntry, MemoryIndex } from "../../src/memory/types.js";

function entry(id: string, over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id, type: "semantic", scope: "project:p", project: "p",
    title: "t", summary: "s", path: `memory/semantic/p/${id.split("/").pop()}.md`,
    status: "active", confidence: 0.8, importance: 3,
    createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
    entities: [], originDevice: null, accessCount: 0, lastAccess: null, ...over,
  };
}

const idx = (...entries: MemoryEntry[]): MemoryIndex => ({
  version: 1,
  entries: Object.fromEntries(entries.map((e) => [e.id, e])),
});

describe("saveMemoryIndex — atomic temp+rename (a failed save can never truncate the index)", () => {
  let repo: string;
  const idxPath = () => join(repo, MEMORY_INDEX_REL);
  const dataDir = () => dirname(idxPath());
  /** Anything in the data dir that is NOT the index itself = temp litter. */
  const litter = () => readdirSync(dataDir()).filter((f) => f !== "index.memory.json");

  beforeEach(() => {
    ctl.failWrite = false;
    ctl.failRename = false;
    repo = mkdtempSync(join(tmpdir(), "vbp-memidx-atomic-"));
  });
  afterEach(() => {
    ctl.failWrite = false;
    ctl.failRename = false;
    rmSync(repo, { recursive: true, force: true });
  });

  it("leaves the PREVIOUS index byte-identical when the serialize/write fails", () => {
    saveMemoryIndex(repo, idx(entry("semantic/p/first"), entry("semantic/p/second")));
    const before = readFileSync(idxPath(), "utf8");
    expect(before.length).toBeGreaterThan(0);

    ctl.failWrite = true;
    expect(() => saveMemoryIndex(repo, idx(entry("semantic/p/replacement"))))
      .toThrow(/ENOSPC/);

    // Not truncated, not half-written: the exact bytes we had before.
    expect(readFileSync(idxPath(), "utf8")).toBe(before);
    // and still parseable, with the ORIGINAL entries (not the failed save's)
    expect(Object.keys(loadMemoryIndex(repo).entries).sort())
      .toEqual(["semantic/p/first", "semantic/p/second"]);
    expect(litter()).toEqual([]); // failed save cleaned up after itself
  });

  it("leaves the PREVIOUS index byte-identical when the rename fails", () => {
    saveMemoryIndex(repo, idx(entry("semantic/p/first"), entry("semantic/p/second")));
    const before = readFileSync(idxPath(), "utf8");

    ctl.failRename = true;
    expect(() => saveMemoryIndex(repo, idx(entry("semantic/p/replacement"))))
      .toThrow(/ENOSPC/);

    expect(readFileSync(idxPath(), "utf8")).toBe(before);
    expect(Object.keys(loadMemoryIndex(repo).entries).sort())
      .toEqual(["semantic/p/first", "semantic/p/second"]);
    // The temp file DID get written this time — it must not be left behind.
    expect(litter()).toEqual([]);
  });

  it("leaves NO index at all (not an empty file) when the very first save fails", () => {
    // Nothing to preserve here, but a half-created index would be worse than
    // none: `loadMemoryIndexStrict` would report `corrupt`, which the archival
    // write-guards treat as "refuse", wedging the command.
    ctl.failWrite = true;
    expect(() => saveMemoryIndex(repo, idx(entry("semantic/p/a")))).toThrow(/ENOSPC/);
    expect(existsSync(idxPath())).toBe(false);
    expect(readdirSync(dataDir())).toEqual([]);
  });

  it("control: the success path still writes the full index and leaves no temp file", () => {
    saveMemoryIndex(repo, idx(entry("semantic/p/a")));
    expect(litter()).toEqual([]);
    expect(readFileSync(idxPath(), "utf8")).toBe(
      JSON.stringify(idx(entry("semantic/p/a")), null, 2) + "\n",
    );

    // and an overwrite replaces it wholesale (rename over an existing target)
    saveMemoryIndex(repo, idx(entry("semantic/p/b")));
    expect(litter()).toEqual([]);
    expect(Object.keys(loadMemoryIndex(repo).entries)).toEqual(["semantic/p/b"]);
  });
});
