import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Round-17 (PR #65): the two archival commands persist to TWO stores — the .md
 *  files and the index — and the .md rewrite(s) land FIRST. If `saveMemoryIndex`
 *  then fails, the .md say `archived` (or `active`) while the index still says
 *  the opposite; for memory-archive's BATCH path the whole plan diverges at once.
 *  The fix captures each target's original bytes before the rewrite and restores
 *  them byte-for-byte when the index save throws.
 *
 *  `failSave` is hoisted because the vi.mock factory runs during the IMPORT
 *  phase, before this module's body evaluates (a plain `let` would be in TDZ).
 *  Default is passthrough, so every other assertion here exercises the real writer. */
const ctl = vi.hoisted(() => ({ failSave: false }));
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

import { memoryArchiveCmd } from "../../src/commands/memory-archive.js";
import { memoryUnarchiveCmd } from "../../src/commands/memory-unarchive.js";
import { rollbackMemoryWrites } from "../../src/memory/apply.js";

let home: string, repo: string;
beforeEach(() => {
  ctl.failSave = false;
  home = mkdtempSync(join(tmpdir(), "march-rb-"));
  repo = join(home, ".memarium", "session-repo");
  mkdirSync(join(repo, ".memarium"), { recursive: true });
  vi.stubEnv("HOME", home);
  vi.stubEnv("MEMARIUM_DIR", ""); // force homedir-based memariumHome so the HOME stub drives repoPath
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  ctl.failSave = false;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

const idxPath = () => join(repo, ".memarium", "index.memory.json");
const readIndex = () => JSON.parse(readFileSync(idxPath(), "utf8"));
const readIndexStatus = (id: string) => readIndex().entries[id].status as string;
const mdPath = (slug: string) => join(repo, `memory/semantic/p/${slug}.md`);
const readMd = (slug: string) => readFileSync(mdPath(slug), "utf8");

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
const archived = (slug: string) => ({
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

describe("memoryUnarchiveCmd — rolls back the .md rewrite when the index save fails", () => {
  it("throws with rollback context and leaves BOTH stores byte-identical", async () => {
    writeStore({ "semantic/p/c": archived("c") });
    const idxBefore = readFileSync(idxPath(), "utf8");
    const mdBefore = readMd("c");
    ctl.failSave = true;

    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/index save failed .*rolled back 1 \.md rewrite\(s\)/i);
    // the ORIGINAL failure is preserved, not swallowed
    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/simulated index save failure/i);

    expect(readMd("c")).toBe(mdBefore);                        // .md restored byte-for-byte
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);   // index unchanged
    expect(readIndexStatus("semantic/p/c")).toBe("archived");  // still archived on BOTH sides
  });

  it("control: the same fixture DOES restore when the index save succeeds", async () => {
    // Proves the rollback assertions above aren't passing because the command
    // was a no-op — this fixture genuinely rewrites the .md and the index.
    writeStore({ "semantic/p/c": archived("c") });
    const mdBefore = readMd("c");

    await memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo });

    expect(readIndexStatus("semantic/p/c")).toBe("active");
    expect(readMd("c")).not.toBe(mdBefore);
    expect(readMd("c")).toMatch(/^status: active$/m);
  });
});

describe("memoryArchiveCmd --apply — rolls back the WHOLE batch when the index save fails", () => {
  it("restores every rewritten .md (2-file batch) and leaves the index unchanged", async () => {
    // The batch path is the worse case: N .md are rewritten before the SINGLE
    // saveMemoryIndex, so a failing save diverges all N at once.
    writeStore({ "semantic/p/a": expired("a"), "semantic/p/b": expired("b") });
    const idxBefore = readFileSync(idxPath(), "utf8");
    const aBefore = readMd("a");
    const bBefore = readMd("b");
    ctl.failSave = true;

    await expect(memoryArchiveCmd({ cwd: repo, apply: true }))
      .rejects.toThrow(/index save failed .*rolled back 2 \.md rewrite\(s\)/i);

    expect(readMd("a")).toBe(aBefore);                         // EVERY file rolled back
    expect(readMd("b")).toBe(bBefore);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);   // index unchanged
    expect(readIndexStatus("semantic/p/a")).toBe("active");
    expect(readIndexStatus("semantic/p/b")).toBe("active");
  });

  it("control: the same 2-file batch DOES archive when the index save succeeds", async () => {
    writeStore({ "semantic/p/a": expired("a"), "semantic/p/b": expired("b") });
    const aBefore = readMd("a");

    await memoryArchiveCmd({ cwd: repo, apply: true });

    expect(readIndexStatus("semantic/p/a")).toBe("archived");
    expect(readIndexStatus("semantic/p/b")).toBe("archived");
    expect(readMd("a")).not.toBe(aBefore);
    expect(readMd("a")).toMatch(/^status: archived$/m);
    expect(readMd("b")).toMatch(/^status: archived$/m);
  });

  it("surfaces a PARTIAL rollback in the error instead of failing silently", async () => {
    // Rollback itself can fail (a vanished directory, a permission change). When
    // it does, the two stores really ARE diverged for that file, so the error must
    // NAME the file rather than report a clean rollback.
    const dir = mkdtempSync(join(tmpdir(), "march-rb-partial-"));
    try {
      const okAbs = join(dir, "ok.md");
      writeFileSync(okAbs, "ORIGINAL ok\n");
      const blocker = join(dir, "blocker");      // a FILE used as a path component →
      writeFileSync(blocker, "not a directory"); // any write beneath it fails (ENOTDIR)
      const snaps = [
        { abs: okAbs, canonical: "memory/semantic/p/ok.md", bytes: Buffer.from("ORIGINAL ok\n") },
        { abs: join(blocker, "nested", "bad.md"), canonical: "memory/semantic/p/bad.md", bytes: Buffer.from("ORIGINAL bad\n") },
      ];
      writeFileSync(okAbs, "REWRITTEN\n"); // stand in for the rewrite we must undo

      expect(() => rollbackMemoryWrites("memory-archive: index save failed", snaps, new Error("boom")))
        .toThrow(/PARTIAL ROLLBACK[\s\S]*memory\/semantic\/p\/bad\.md/i);
      expect(readFileSync(okAbs, "utf8")).toBe("ORIGINAL ok\n"); // the restorable one still restored
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
