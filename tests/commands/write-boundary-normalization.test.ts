import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * ROUND-36 / FINDING B — the round-32/34 hardening normalized at the RENDER
 * boundary only, so every write sink saved the ORIGINAL entry to the INDEX while
 * the `.md` got the neutralized one. The two stores then disagreed: the live
 * index said `a\nb`, the file (and any rebuild from it) said `a b`.
 *
 * The fix normalizes at the WRITE boundary, so the SAME object goes to both.
 * These tests assert AGREEMENT — pre-fix each `toEqual` below compared a
 * newline-bearing index value against a space-bearing rendered one and failed.
 */
describe("write-boundary normalization: index and .md must agree (round-36)", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-r36-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("MEMORY: a title containing a newline is stored identically in the index and the .md", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { loadMemoryIndex } = await import("../../src/memory/index-store.js");
    const { parseMemoryMarkdown } = await import("../../src/memory/parse.js");

    const entry = {
      id: "semantic/_global/e", type: "semantic", scope: "global", project: null,
      title: "a\nb", summary: "s", status: "active", confidence: 0.5, importance: 0,
      sourceSessions: ["s1"],
    } as never;
    const report = applyMemoryItems(repo, [{ entry, body: "body" }]);

    const md = readFileSync(join(repo, report.paths[0]), "utf8");
    const fromFile = parseMemoryMarkdown(md);
    const fromIndex = loadMemoryIndex(repo).entries["semantic/_global/e"];

    expect(fromFile).not.toBeNull();
    expect(fromIndex.title).toEqual(fromFile!.title); // pre-fix: "a\nb" vs "a b"
    expect(fromIndex.title).toBe("a b");
  });

  it("ENTITY: a title with a newline agrees, and the index KEY matches the stored id", async () => {
    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const { loadEntityIndex } = await import("../../src/entity/index-store.js");
    const { parseEntityMarkdown } = await import("../../src/entity/parse.js");

    const input = join(home, "ent.json");
    writeFileSync(input, JSON.stringify([{
      entry: { id: "entity/_global/wid\nget", kind: "tool", scope: "global", project: null,
        title: "a\nb", createdAt: "2026-07-01", updatedAt: "2026-07-01" },
      body: "b",
    }]));
    const report = await entityWriteCmd({ inputPath: input });

    const fromFile = parseEntityMarkdown(readFileSync(join(repo, report.paths[0]), "utf8"));
    const idx = loadEntityIndex(repo);
    const keys = Object.keys(idx.entries);
    expect(keys).toHaveLength(1);
    const fromIndex = idx.entries[keys[0]];

    expect(fromFile).not.toBeNull();
    expect(fromIndex.title).toEqual(fromFile!.title); // pre-fix: "a\nb" vs "a b"
    expect(fromIndex.title).toBe("a b");
    // The id doubles as the INDEX KEY and the filename slug — pre-fix the key kept
    // the raw newline while the .md rendered a space, so a rebuild forked the page.
    expect(keys[0]).toBe(fromIndex.id);
    expect(fromIndex.id).toEqual(fromFile!.id);
    expect(fromIndex.id).toBe("entity/_global/wid get");
  });

  it("QA: a newline-bearing updatedAt agrees, and the index KEY matches the stored id", async () => {
    const { qaWriteCmd } = await import("../../src/commands/qa-write.js");
    const { loadQaIndex } = await import("../../src/qa/index-store.js");
    const { parseQaMarkdown } = await import("../../src/qa/parse.js");

    const input = join(home, "qa.json");
    // qa-write only PREFIX-checks the date, so this payload sails through.
    writeFileSync(input, JSON.stringify([{
      entry: { id: "ignored", scope: "global", project: null, question: "how?",
        answerSummary: "so", kind: "howto", createdAt: "2026-07-01",
        updatedAt: "2026-06-11\nid: forged" },
      body: "b",
    }]));
    const report = await qaWriteCmd({ inputPath: input });

    const fromFile = parseQaMarkdown(readFileSync(join(repo, report.paths[0]), "utf8"));
    const idx = loadQaIndex(repo);
    const keys = Object.keys(idx.entries);
    expect(keys).toHaveLength(1);
    const fromIndex = idx.entries[keys[0]];

    expect(fromFile).not.toBeNull();
    expect(fromIndex.updatedAt).toEqual(fromFile!.updatedAt); // pre-fix: newline vs space
    expect(fromIndex.updatedAt).toBe("2026-06-11 id: forged");
    expect(keys[0]).toBe(fromIndex.id);
    expect(fromIndex.id).toEqual(fromFile!.id);
  });
});
