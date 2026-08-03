import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
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

/**
 * ROUND-37 — round 36 left the entity/qa ARRAY fields unnormalized, arguing they
 * are "JSON-encoded and already round-trip". That is TRUE ONLY FOR C0:
 * `JSON.stringify` escapes U+0000-U+001F (plus the quote and the backslash) and
 * emits DEL (U+007F) and the C1 range (U+0080-U+009F) RAW — so those reached
 * `line()`, which replaced them with spaces, and the INDEX kept the raw value
 * while the rendered page held a space. Exactly the disagreement round 36 was
 * written to close, still open for one end of the control-character range.
 *
 * Pre-fix each `toEqual` below compared a DEL/C1-bearing index value against a
 * space-bearing rendered one and FAILED.
 */
describe("write-boundary normalization: DEL/C1 in ARRAY elements (round-37)", () => {
  // Built from char codes rather than written literally: a raw control character
  // in a source file is invisible and gets mangled by editors/patches.
  const DEL = String.fromCharCode(0x7f);   // U+007F
  const C1 = String.fromCharCode(0x85);    // U+0085 (NEL), in the C1 range

  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-r37-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("ENTITY: a DEL/C1 in an array element is stored identically in the index and the rendered page", async () => {
    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const { loadEntityIndex } = await import("../../src/entity/index-store.js");
    const { parseEntityMarkdown } = await import("../../src/entity/parse.js");

    const input = join(home, "ent.json");
    writeFileSync(input, JSON.stringify([{
      entry: { id: "entity/_global/widget", kind: "tool", scope: "global", project: null,
        title: "Widget", aliases: [`a${DEL}b`], relatedEntities: [`r${C1}s`],
        createdAt: "2026-07-01", updatedAt: "2026-07-01" },
      body: "b",
    }]));
    const report = await entityWriteCmd({ inputPath: input });

    const fromFile = parseEntityMarkdown(readFileSync(join(repo, report.paths[0]), "utf8"));
    const fromIndex = loadEntityIndex(repo).entries["entity/_global/widget"];

    expect(fromFile).not.toBeNull();
    expect(fromIndex.aliases).toEqual(fromFile!.aliases);                 // pre-fix: DEL vs space
    expect(fromIndex.aliases).toEqual(["a b"]);
    expect(fromIndex.relatedEntities).toEqual(fromFile!.relatedEntities); // C1 too
    expect(fromIndex.relatedEntities).toEqual(["r s"]);
  });

  it("QA: a DEL/C1 in an array element is stored identically in the index and the rendered page", async () => {
    const { qaWriteCmd } = await import("../../src/commands/qa-write.js");
    const { loadQaIndex } = await import("../../src/qa/index-store.js");
    const { parseQaMarkdown } = await import("../../src/qa/parse.js");

    const input = join(home, "qa.json");
    writeFileSync(input, JSON.stringify([{
      entry: { id: "ignored", scope: "global", project: null, question: "how?",
        answerSummary: "so", kind: "howto", tags: [`t${C1}x`], sources: [`s${DEL}y`],
        createdAt: "2026-07-01", updatedAt: "2026-07-01" },
      body: "b",
    }]));
    const report = await qaWriteCmd({ inputPath: input });

    const fromFile = parseQaMarkdown(readFileSync(join(repo, report.paths[0]), "utf8"));
    const idx = loadQaIndex(repo);
    const keys = Object.keys(idx.entries);
    expect(keys).toHaveLength(1);
    const fromIndex = idx.entries[keys[0]];

    expect(fromFile).not.toBeNull();
    expect(fromIndex.tags).toEqual(fromFile!.tags);        // pre-fix: C1 vs space
    expect(fromIndex.tags).toEqual(["t x"]);
    expect(fromIndex.sources).toEqual(fromFile!.sources);  // DEL too
    expect(fromIndex.sources).toEqual(["s y"]);
  });
});

/**
 * ROUND-38 — round 36 moved normalization to the write boundary so the index KEY
 * and the `.md` agree, but `entity-write` only derived `path` when the payload
 * did NOT supply one. A caller-supplied `path` therefore still reflected the
 * PRE-normalization `id`/`project`: the index mapped a normalized id
 * (`entity/_global/wid get`) to a stale, newline-bearing filename, so an
 * `entity-index` rebuild — which derives the path from the file it actually
 * finds — disagreed with the live index, and the indexed path pointed at a file
 * that is not where the entry says it lives.
 *
 * The fix DERIVES the path from the post-normalization entry, always.
 */
describe("write-boundary normalization: path derived POST-normalization (round-38)", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-r38-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("ENTITY: a control-character id plus a supplied path still indexes the CANONICAL path", async () => {
    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const { loadEntityIndex } = await import("../../src/entity/index-store.js");

    const input = join(home, "ent.json");
    // The payload's `path` is the PRE-normalization one (it carries the newline),
    // which is exactly what a caller that derived it itself would send.
    writeFileSync(input, JSON.stringify([{
      entry: { id: "entity/_global/wid\nget", kind: "tool", scope: "global", project: null,
        title: "Widget", path: "memory/entities/_global/wid\nget.md",
        createdAt: "2026-07-01", updatedAt: "2026-07-01" },
      body: "b",
    }]));
    const report = await entityWriteCmd({ inputPath: input });

    const idx = loadEntityIndex(repo);
    const keys = Object.keys(idx.entries);
    expect(keys).toHaveLength(1);
    const fromIndex = idx.entries[keys[0]];

    // Canonical path, derived from the NORMALIZED id — pre-fix this was the
    // supplied, newline-bearing path instead.
    expect(fromIndex.id).toBe("entity/_global/wid get");
    expect(fromIndex.path).toBe("memory/entities/_global/wid get.md");
    expect(report.paths[0]).toBe("memory/entities/_global/wid get.md");
    // ...and the file really is there (pre-fix it sat at `wid\nget.md`).
    expect(existsSync(join(repo, fromIndex.path))).toBe(true);
    expect(existsSync(join(repo, "memory/entities/_global/wid\nget.md"))).toBe(false);
  });

  it("ENTITY: a normal write with no supplied path is unchanged (regression lock)", async () => {
    const { entityWriteCmd } = await import("../../src/commands/entity-write.js");
    const { loadEntityIndex } = await import("../../src/entity/index-store.js");

    const input = join(home, "ent-normal.json");
    writeFileSync(input, JSON.stringify([{
      entry: { id: "entity/code-demo/widget", kind: "tool", scope: "project:code-demo",
        project: "code-demo", title: "Widget", createdAt: "2026-07-01", updatedAt: "2026-07-01" },
      body: "b",
    }]));
    const report = await entityWriteCmd({ inputPath: input });

    expect(report.paths[0]).toBe("memory/entities/code-demo/widget.md");
    expect(loadEntityIndex(repo).entries["entity/code-demo/widget"].path)
      .toBe("memory/entities/code-demo/widget.md");
    expect(existsSync(join(repo, "memory/entities/code-demo/widget.md"))).toBe(true);
  });

  it("QA: the indexed path is derived from the STORED id/project, and the file is there", async () => {
    // qa-write always overwrote a supplied path, so the entity defect never
    // reproduced here — but it derived the path BEFORE normalization. This locks
    // the ordering invariant: path == canonical(stored id, stored project).
    const { qaWriteCmd } = await import("../../src/commands/qa-write.js");
    const { loadQaIndex } = await import("../../src/qa/index-store.js");

    const input = join(home, "qa.json");
    writeFileSync(input, JSON.stringify([{
      entry: { id: "ignored", scope: "project:code-demo", project: null, question: "how do I sync?",
        answerSummary: "run sync", kind: "howto", path: "memory/qa/_global/bogus.md",
        createdAt: "2026-07-01", updatedAt: "2026-06-11\nid: forged" },
      body: "b",
    }]));
    const report = await qaWriteCmd({ inputPath: input });

    const idx = loadQaIndex(repo);
    const keys = Object.keys(idx.entries);
    expect(keys).toHaveLength(1);
    const fromIndex = idx.entries[keys[0]];

    const scopeDir = fromIndex.project ?? "_global";
    const slug = fromIndex.id.split("/").pop();
    expect(fromIndex.path).toBe(`memory/qa/${scopeDir}/${slug}.md`);
    expect(report.paths[0]).toBe(fromIndex.path);
    expect(existsSync(join(repo, fromIndex.path))).toBe(true);
  });
});
