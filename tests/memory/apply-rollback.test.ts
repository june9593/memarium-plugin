import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MemoryEntry } from "../../src/memory/types.js";

/** Round-26 (PR #65): `applyMemoryItems` persists to TWO stores — the memory
 *  `.md` files and the index — and every `.md` write lands BEFORE the single
 *  `saveMemoryIndex`. Round-17 gave `memory-archive` / `memory-unarchive`
 *  snapshot+rollback for exactly that window, but the shared apply sink was never
 *  covered (it was pre-existing/out-of-scope in round-18). Round-25 made it
 *  IN-scope: applying an item that supersedes an ARCHIVED target now PATCHES that
 *  target's `.md` with a lifecycle transition (`archivedReason:
 *  superseded-cleanup` + a fresh `archivedAt`/`updatedAt`). If a later write or
 *  the index save then throws, round-18's atomic index save correctly leaves the
 *  OLD index on disk — but the patched `.md` keeps the NEW reason, so the two
 *  stores permanently disagree on a lifecycle-critical field.
 *
 *  `failSave` is hoisted because the vi.mock factory runs during the IMPORT
 *  phase, before this module's body evaluates (a plain `let` would be in TDZ).
 *  Default is passthrough, so the success-path lock exercises the real writer. */
const ctl = vi.hoisted(() => ({ failSave: false, failRenderId: null as string | null }));
vi.mock("../../src/memory/index-store.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/memory/index-store.js")>();
  return {
    ...actual,
    saveMemoryIndex: (repoRoot: string, idx: Parameters<typeof actual.saveMemoryIndex>[1]) => {
      if (ctl.failSave) throw new Error("simulated index save failure (ENOSPC)");
      return actual.saveMemoryIndex(repoRoot, idx);
    },
  };
});
/** Lets a test fail ONE item's render mid-batch, i.e. after an earlier item's
 *  `.md` has already landed — the write-phase half of the rollback window. */
vi.mock("../../src/memory/render.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/memory/render.js")>();
  return {
    ...actual,
    renderMemoryMarkdown: (entry: MemoryEntry, body: string) => {
      if (ctl.failRenderId !== null && entry.id === ctl.failRenderId) {
        throw new Error("simulated render failure (ENOSPC-equivalent)");
      }
      return actual.renderMemoryMarkdown(entry, body);
    },
  };
});

import { applyMemoryItems, writeMemoryEntryFile } from "../../src/memory/apply.js";

let home: string, repo: string;
beforeEach(() => {
  ctl.failSave = false;
  ctl.failRenderId = null;
  home = mkdtempSync(join(tmpdir(), "vbp-apply-rb-"));
  repo = join(home, ".memarium", "session-repo");
  mkdirSync(join(repo, ".memarium"), { recursive: true });
  vi.stubEnv("HOME", home);
  vi.stubEnv("MEMARIUM_DIR", "");
});
afterEach(() => {
  ctl.failSave = false;
  ctl.failRenderId = null;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

const idxPath = () => join(repo, ".memarium", "index.memory.json");
const readIdx = () => JSON.parse(readFileSync(idxPath(), "utf8"));
const mdPath = (slug: string) => join(repo, `memory/semantic/p/${slug}.md`);

function mk(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p",
    title: "t", summary: "s", path: "", status: "active", confidence: 0.9, importance: 5,
    createdAt: "2026-01-01", updatedAt: "2026-01-01", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  };
}

const slugEntry = (slug: string, over: Partial<MemoryEntry> = {}) =>
  mk({ id: `semantic/p/${slug}`, title: `${slug} fact`, path: "", ...over });

/** Seed `slug` as an ARCHIVED row in BOTH stores, the way memory-archive leaves it. */
function seedArchived(slug: string, reason = "unused-low-value"): void {
  const base = slugEntry(slug);
  applyMemoryItems(repo, [{ entry: { ...base }, body: `${slug} original body` }]);
  writeMemoryEntryFile(repo, {
    ...base, path: `memory/semantic/p/${slug}.md`,
    status: "archived" as MemoryEntry["status"], archivedAt: "2026-07-01", archivedReason: reason,
  });
  const idx = readIdx();
  idx.entries[`semantic/p/${slug}`] = {
    ...idx.entries[`semantic/p/${slug}`],
    status: "archived", archivedAt: "2026-07-01", archivedReason: reason,
  };
  writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
}

describe("applyMemoryItems rollback (round-26)", () => {
  it("a failed index save restores the superseded ARCHIVED target's .md byte-for-byte (reason NOT patched) and leaves the index untouched", () => {
    seedArchived("old");
    const targetBefore = readFileSync(mdPath("old"));
    const indexBefore = readFileSync(idxPath());
    expect(targetBefore.toString()).toContain("archivedReason: unused-low-value");

    ctl.failSave = true;
    expect(() =>
      applyMemoryItems(repo, [{
        entry: slugEntry("new", { supersedes: "semantic/p/old" }),
        body: "new body",
      }]),
    ).toThrow(/applyMemoryItems: index save failed — rolled back \d+ \.md rewrite\(s\): simulated index save failure/);

    // the lifecycle patch is UNDONE — the .md is byte-identical to the pre-run file…
    expect(readFileSync(mdPath("old")).equals(targetBefore)).toBe(true);
    expect(readFileSync(mdPath("old"), "utf8")).not.toContain("superseded-cleanup");
    // …the index file is untouched (atomic save left the whole old file)…
    expect(readFileSync(idxPath()).equals(indexBefore)).toBe(true);
    expect(readIdx().entries["semantic/p/old"].archivedReason).toBe("unused-low-value");
    expect(readIdx().entries["semantic/p/new"]).toBeUndefined();
    // …and the .md the failed run created is gone (it did not exist before).
    expect(existsSync(mdPath("new"))).toBe(false);
  });

  it("restores EVERY file a multi-item batch rewrote or patched, not just the last one", () => {
    // Two pre-existing rows that the batch UPDATES, plus an ARCHIVED supersede
    // target that the batch PATCHES, plus a brand-new entry the batch CREATES.
    applyMemoryItems(repo, [
      { entry: slugEntry("a"), body: "a original body" },
      { entry: slugEntry("b"), body: "b original body" },
    ]);
    seedArchived("old");
    const before = {
      a: readFileSync(mdPath("a")), b: readFileSync(mdPath("b")),
      old: readFileSync(mdPath("old")), index: readFileSync(idxPath()),
    };

    ctl.failSave = true;
    expect(() =>
      applyMemoryItems(repo, [
        { entry: slugEntry("a", { title: "a REWRITTEN" }), body: "a NEW body" },
        { entry: slugEntry("b", { title: "b REWRITTEN" }), body: "b NEW body" },
        { entry: slugEntry("new", { supersedes: "semantic/p/old" }), body: "new body" },
      ]),
    ).toThrow(/applyMemoryItems: index save failed — rolled back \d+ \.md rewrite\(s\)/);

    // every rewritten file is back, byte-for-byte — including the EARLIER ones
    expect(readFileSync(mdPath("a")).equals(before.a)).toBe(true);
    expect(readFileSync(mdPath("b")).equals(before.b)).toBe(true);
    expect(readFileSync(mdPath("old")).equals(before.old)).toBe(true);
    expect(readFileSync(mdPath("a"), "utf8")).toContain("a original body");
    expect(readFileSync(mdPath("b"), "utf8")).toContain("b original body");
    expect(readFileSync(mdPath("old"), "utf8")).not.toContain("superseded-cleanup");
    expect(existsSync(mdPath("new"))).toBe(false);
    expect(readFileSync(idxPath()).equals(before.index)).toBe(true);
  });

  it("a failure mid-WRITE (before the index save is even reached) rolls the batch back too", () => {
    applyMemoryItems(repo, [{ entry: slugEntry("a"), body: "a original body" }]);
    const beforeA = readFileSync(mdPath("a"));
    const beforeIndex = readFileSync(idxPath());

    // Second item's render blows up — AFTER item one's .md has already landed.
    ctl.failRenderId = "semantic/p/boom";
    expect(() =>
      applyMemoryItems(repo, [
        { entry: slugEntry("a", { title: "a REWRITTEN" }), body: "a NEW body" },
        { entry: slugEntry("boom"), body: "boom body" },
      ]),
    ).toThrow(/applyMemoryItems: a \.md write failed mid-batch — rolled back \d+ \.md rewrite\(s\)/);

    expect(readFileSync(mdPath("a")).equals(beforeA)).toBe(true);
    expect(readFileSync(mdPath("a"), "utf8")).toContain("a original body");
    expect(existsSync(mdPath("boom"))).toBe(false);
    expect(readFileSync(idxPath()).equals(beforeIndex)).toBe(true);
  });

  it("regression: the normal success path is unaffected by the snapshot/rollback wrapper", () => {
    seedArchived("old");
    const r = applyMemoryItems(repo, [
      { entry: slugEntry("a"), body: "a body" },
      { entry: slugEntry("new", { supersedes: "semantic/p/old" }), body: "new body" },
    ]);
    expect(r.written).toBe(2);
    expect(r.superseded).toBe(0); // archived target is recorded, never flipped
    expect(r.paths).toEqual(["memory/semantic/p/a.md", "memory/semantic/p/new.md"]);
    expect(readFileSync(mdPath("a"), "utf8")).toContain("a body");
    expect(readFileSync(mdPath("new"), "utf8")).toContain("new body");
    expect(readFileSync(mdPath("old"), "utf8")).toContain("archivedReason: superseded-cleanup");
    expect(readIdx().entries["semantic/p/old"].archivedReason).toBe("superseded-cleanup");
    expect(readIdx().entries["semantic/p/new"].status).toBe("active");
  });
});
