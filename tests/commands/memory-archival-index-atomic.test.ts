import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Round-18 (PR #65): round-17 gave the archival commands a rollback that
 *  restores the `.md` snapshots when `saveMemoryIndex` throws. That rollback is
 *  only worth the name if the OTHER store — `index.memory.json` — is also intact
 *  when the save fails. It was not: `saveMemoryIndex` wrote straight onto the
 *  target, so an ENOSPC part-way through truncated it, and the "rollback"
 *  restored the `.md` into a state with a CORRUPT index.
 *
 *  `tests/memory/index-store-atomic.test.ts` covers the store in isolation.
 *  These tests are the end-to-end half: run the REAL commands against the REAL
 *  `saveMemoryIndex` (no index-store mock — unlike the round-17 rollback suite,
 *  which stubs the save out entirely and so never exercises the on-disk write),
 *  fail the underlying fs call, and assert BOTH stores come back byte-identical.
 *
 *  The injected failure is scoped to the index write so nothing else in the
 *  command path (the `.md` rewrites, the rollback's own restores) is disturbed.
 *  It matches BOTH shapes the store could use — a direct `writeFileSync(path,…)`
 *  and a `writeFileSync(fd,…)` into a temp file — so the test stays an honest
 *  regression guard rather than passing merely because the code moved. */
const ctl = vi.hoisted(() => ({ failIndexWrite: false }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const isIndex = (t: unknown) => typeof t === "string" && t.includes("index.memory.json");
  // fds opened against the index (or its temp), so an fd-based write is caught too
  const indexFds = new Set<number>();
  return {
    ...actual,
    openSync: (...args: Parameters<typeof actual.openSync>) => {
      const fd = actual.openSync(...args);
      if (isIndex(args[0])) indexFds.add(fd);
      return fd;
    },
    closeSync: (...args: Parameters<typeof actual.closeSync>) => {
      indexFds.delete(args[0]);
      return actual.closeSync(...args);
    },
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) => {
      const [target, data] = args;
      if (ctl.failIndexWrite && (isIndex(target) || (typeof target === "number" && indexFds.has(target)))) {
        // Faithful ENOSPC: truncate + short prefix, THEN throw. Against the
        // atomic implementation this hits the temp file, never the index.
        actual.writeFileSync(target, String(data).slice(0, 12));
        throw Object.assign(new Error("ENOSPC: no space left on device, write"), { code: "ENOSPC" });
      }
      return actual.writeFileSync(...args);
    },
  };
});

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { memoryArchiveCmd } from "../../src/commands/memory-archive.js";
import { memoryUnarchiveCmd } from "../../src/commands/memory-unarchive.js";

let home: string, repo: string;
beforeEach(() => {
  ctl.failIndexWrite = false;
  home = mkdtempSync(join(tmpdir(), "march-atomic-"));
  repo = join(home, ".memarium", "session-repo");
  mkdirSync(join(repo, ".memarium"), { recursive: true });
  vi.stubEnv("HOME", home);
  vi.stubEnv("MEMARIUM_DIR", ""); // force homedir-based memariumHome so the HOME stub drives repoPath
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  ctl.failIndexWrite = false;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

const idxPath = () => join(repo, ".memarium", "index.memory.json");
const readIndexRaw = () => readFileSync(idxPath(), "utf8");
const mdPath = (slug: string) => join(repo, `memory/semantic/p/${slug}.md`);
const readMd = (slug: string) => readFileSync(mdPath(slug), "utf8");
/** Anything in the data dir other than the index = temp litter left by a save. */
const litter = () => readdirSync(join(repo, ".memarium")).filter((f) => f !== "index.memory.json");

const base = {
  confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
  validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
  supersedes: null, entities: [] as string[], trust: "trusted" as const, originDevice: null,
  accessCount: 0, lastAccess: null,
};

/** An EXPIRED (therefore archivable) active semantic row. */
const expired = (slug: string) => ({
  id: `semantic/p/${slug}`, type: "semantic", scope: "project:p", project: "p",
  title: `${slug} fact`, summary: "s", path: `memory/semantic/p/${slug}.md`, status: "active",
  validTo: "2000-01-01", archivedAt: null, archivedReason: null, ...base,
});

/** An ARCHIVED row (an unarchive target). */
const archivedRow = (slug: string) => ({
  id: `semantic/p/${slug}`, type: "semantic", scope: "project:p", project: "p",
  title: `${slug} fact`, summary: "s", path: `memory/semantic/p/${slug}.md`, status: "archived",
  validTo: null, archivedAt: "2026-05-01", archivedReason: "expired", ...base,
});

function writeStore(entries: Record<string, unknown>) {
  writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
  mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
  for (const key of Object.keys(entries)) {
    const slug = key.split("/").pop()!;
    const row = entries[key] as { status: string };
    writeFileSync(
      mdPath(slug),
      `---\nid: semantic/p/${slug}\ntype: semantic\nstatus: ${row.status}\n---\n\n# ${slug} fact\n\nThe real body of semantic/p/${slug}.\n`,
    );
  }
}

describe("archival + a REAL failing index save — both stores survive intact", () => {
  it("memoryArchiveCmd --apply: index is byte-identical and still parseable, .md rolled back", async () => {
    writeStore({ "semantic/p/a": expired("a"), "semantic/p/b": expired("b") });
    const idxBefore = readIndexRaw();
    const aBefore = readMd("a");
    const bBefore = readMd("b");
    ctl.failIndexWrite = true;

    await expect(memoryArchiveCmd({ cwd: repo, apply: true }))
      .rejects.toThrow(/index save failed .*rolled back 2 \.md rewrite\(s\)/i);

    // THE round-18 assertion: the index the rollback returns us to is the whole
    // old index, not a truncated stump.
    expect(readIndexRaw()).toBe(idxBefore);
    expect(() => JSON.parse(readIndexRaw())).not.toThrow();
    expect(JSON.parse(readIndexRaw()).entries["semantic/p/a"].status).toBe("active");
    expect(JSON.parse(readIndexRaw()).entries["semantic/p/b"].status).toBe("active");
    // round-17's guarantee still holds too
    expect(readMd("a")).toBe(aBefore);
    expect(readMd("b")).toBe(bBefore);
    expect(litter()).toEqual([]); // the failed save cleaned up its temp file
  });

  it("memoryUnarchiveCmd: index is byte-identical and still parseable, .md rolled back", async () => {
    writeStore({ "semantic/p/c": archivedRow("c") });
    const idxBefore = readIndexRaw();
    const mdBefore = readMd("c");
    ctl.failIndexWrite = true;

    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/index save failed .*rolled back 1 \.md rewrite\(s\)/i);

    expect(readIndexRaw()).toBe(idxBefore);
    expect(JSON.parse(readIndexRaw()).entries["semantic/p/c"].status).toBe("archived");
    expect(readMd("c")).toBe(mdBefore);
    expect(litter()).toEqual([]);
  });

  it("control: with the fs write healthy, the same fixtures archive and write the index", async () => {
    // Proves the assertions above aren't passing because the commands no-op'd.
    writeStore({ "semantic/p/a": expired("a") });
    await memoryArchiveCmd({ cwd: repo, apply: true });
    expect(JSON.parse(readIndexRaw()).entries["semantic/p/a"].status).toBe("archived");
    expect(readMd("a")).toMatch(/^status: archived$/m);
    expect(litter()).toEqual([]);
  });
});
