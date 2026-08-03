import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

/** ROUND-39 (PR #65) — the round-18 atomic write opened its temp file with
 *  `"w"` at a DETERMINISTIC path (`index.memory.json.tmp-<pid>`). Two holes:
 *
 *  (a) `"w"` is `O_CREAT|O_TRUNC` WITHOUT `O_EXCL`, and it FOLLOWS SYMLINKS. A
 *      symlink pre-planted at that path made an index save open and TRUNCATE the
 *      link's target — an arbitrary-file write — and the subsequent
 *      `renameSync(tmp, index)` then moved the SYMLINK over the index, so the
 *      new index content landed in the attacker's file. The data dir is a synced
 *      git worktree, so the path is very much guessable.
 *  (b) One name per pid means two writers in the SAME process share one temp file
 *      and can splice each other's serialize.
 *
 *  The fix is `"wx"` (`O_CREAT|O_EXCL`, which never follows a symlink and fails
 *  loudly on any pre-existing path) plus a unique pid+counter+random name.
 *
 *  The mock plants the adversarial path in the ONLY window that matters: between
 *  the temp name being chosen and the open of it. That is a faithful model of the
 *  race (and works regardless of the now-unpredictable name). Against `"w"` the
 *  planted path is followed; against `"wx"` the open fails with EEXIST. */
const ctl = vi.hoisted(() => ({
  plant: null as null | ((tmpPath: string) => void),
  opened: [] as string[],
}));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    openSync: (path: Parameters<typeof actual.openSync>[0], ...rest: unknown[]) => {
      if (typeof path === "string" && path.includes(".tmp-")) {
        ctl.opened.push(path);
        const plant = ctl.plant;
        ctl.plant = null;   // one-shot: only the next temp open is targeted
        if (plant) plant(path);
      }
      return (actual.openSync as (...a: unknown[]) => number)(path, ...rest);
    },
  };
});

import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync, writeFileSync, symlinkSync, lstatSync, chmodSync, statSync } from "node:fs";
import { loadMemoryIndex, saveMemoryIndex, MEMORY_INDEX_REL } from "../../src/memory/index-store.js";
import type { MemoryEntry, MemoryIndex } from "../../src/memory/types.js";

function entry(id: string): MemoryEntry {
  return {
    id, type: "semantic", scope: "project:p", project: "p",
    title: "t", summary: "s", path: `memory/semantic/p/${id.split("/").pop()}.md`,
    status: "active", confidence: 0.8, importance: 3,
    createdAt: "2026-07-01", updatedAt: "2026-07-01", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
    entities: [], originDevice: null, accessCount: 0, lastAccess: null,
  };
}
const idx = (...entries: MemoryEntry[]): MemoryIndex => ({
  version: 1,
  entries: Object.fromEntries(entries.map((e) => [e.id, e])),
});

describe("saveMemoryIndex — exclusive, unique temp file (round-39)", () => {
  let sandbox: string, repo: string;
  const idxPath = () => join(repo, MEMORY_INDEX_REL);
  const dataDir = () => dirname(idxPath());
  /** Anything in the data dir that is NOT the index itself. */
  const others = () => readdirSync(dataDir()).filter((f) => f !== "index.memory.json");

  beforeEach(() => {
    ctl.plant = null;
    ctl.opened = [];
    sandbox = mkdtempSync(join(tmpdir(), "vbp-memidx-excl-"));
    repo = join(sandbox, "repo");
  });
  afterEach(() => {
    ctl.plant = null;
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("a SYMLINK planted at the temp path never has its target written or truncated", () => {
    saveMemoryIndex(repo, idx(entry("semantic/p/first")));
    const before = readFileSync(idxPath(), "utf8");

    const sentinel = join(sandbox, "sentinel.txt");
    writeFileSync(sentinel, "PRECIOUS — must survive byte-identical\n");
    chmodSync(sentinel, 0o600);
    ctl.plant = (tmp) => symlinkSync(sentinel, tmp);

    // Pre-fix: no throw at all — the save "succeeded" INTO the sentinel.
    expect(() => saveMemoryIndex(repo, idx(entry("semantic/p/second")))).toThrow(/EEXIST/);

    // The whole point: the symlink's target is untouched.
    expect(readFileSync(sentinel, "utf8")).toBe("PRECIOUS — must survive byte-identical\n");
    // Round-40: the mode chmod must not reach it through the symlink either.
    expect(statSync(sentinel).mode & 0o777).toBe(0o600);
    // ...and the real index is neither replaced nor turned into a symlink.
    expect(readFileSync(idxPath(), "utf8")).toBe(before);
    expect(lstatSync(idxPath()).isSymbolicLink()).toBe(false);
    expect(Object.keys(loadMemoryIndex(repo).entries)).toEqual(["semantic/p/first"]);
    // We do NOT unlink a path we did not create — the planted symlink stays put.
    expect(others()).toHaveLength(1);
  });

  it("a pre-existing FILE at the temp path is not truncated, and the index survives byte-identical", () => {
    saveMemoryIndex(repo, idx(entry("semantic/p/first")));
    const before = readFileSync(idxPath(), "utf8");

    // Models a concurrent writer that drew the same name (deterministic pre-fix).
    ctl.plant = (tmp) => writeFileSync(tmp, "ANOTHER WRITER'S IN-FLIGHT DATA");
    expect(() => saveMemoryIndex(repo, idx(entry("semantic/p/second")))).toThrow(/EEXIST/);

    const collided = join(dataDir(), others()[0]);
    expect(readFileSync(collided, "utf8")).toBe("ANOTHER WRITER'S IN-FLIGHT DATA");
    expect(readFileSync(idxPath(), "utf8")).toBe(before);
    expect(Object.keys(loadMemoryIndex(repo).entries)).toEqual(["semantic/p/first"]);
  });

  it("two saves in the same process use DIFFERENT temp paths", () => {
    saveMemoryIndex(repo, idx(entry("semantic/p/a")));
    saveMemoryIndex(repo, idx(entry("semantic/p/b")));
    expect(ctl.opened).toHaveLength(2);
    expect(ctl.opened[0]).not.toBe(ctl.opened[1]);   // pre-fix these were identical
    for (const p of ctl.opened) expect(p).toContain(`.tmp-${process.pid}-`);
  });

  it("control: the normal save path still works and leaves no temp file behind", () => {
    saveMemoryIndex(repo, idx(entry("semantic/p/a")));
    expect(existsSync(idxPath())).toBe(true);
    expect(others()).toEqual([]);
    expect(readFileSync(idxPath(), "utf8")).toBe(
      JSON.stringify(idx(entry("semantic/p/a")), null, 2) + "\n",
    );

    saveMemoryIndex(repo, idx(entry("semantic/p/b")));
    expect(others()).toEqual([]);
    expect(Object.keys(loadMemoryIndex(repo).entries)).toEqual(["semantic/p/b"]);
  });
});
