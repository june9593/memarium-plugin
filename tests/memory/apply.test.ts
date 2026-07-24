import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MemoryEntry } from "../../src/memory/types.js";

function mk(over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "core/user-workflow", type: "core", scope: "global", project: null,
    title: "t", summary: "s", path: "", status: "active", confidence: 0.9, importance: 5,
    createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
    sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    ...over,
  };
}

describe("applyMemoryItems", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-apply-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("writes md at the canonical path + upserts index, ignoring a missing path", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const r = applyMemoryItems(repo, [{ entry: mk({ path: "" }), body: "b" }]);
    expect(r.written).toBe(1);
    expect(existsSync(join(repo, "memory/core/_global/user-workflow.md"))).toBe(true);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["core/user-workflow"].path).toBe("memory/core/_global/user-workflow.md");
  });

  it("normalizes a thin entry (undefined arrays/summary) instead of crashing (#37)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const thin = mk({ id: "core/thin", title: "thin", summary: undefined, sourceSessions: undefined, sourceCommits: undefined, sourceFiles: undefined, entities: undefined });
    const r = applyMemoryItems(repo, [{ entry: thin, body: "b" }]);
    expect(r.written).toBe(1);
    const md = readFileSync(join(repo, "memory/core/_global/thin.md"), "utf8");
    expect(md).toContain("sourceSessions: []");
    expect(md).toContain("entities: []");
    expect(md).not.toContain("undefined");
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["core/thin"].sourceSessions).toEqual([]);
    expect(idx.entries["core/thin"].summary).toBe("");
  });

  it("backfills undefined createdAt/updatedAt from validFrom (never the string \"undefined\")", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const e = mk({ id: "core/dated", createdAt: undefined, updatedAt: undefined, validFrom: "2026-05-20" });
    applyMemoryItems(repo, [{ entry: e, body: "b" }]);
    const md = readFileSync(join(repo, "memory/core/_global/dated.md"), "utf8");
    expect(md).toContain("createdAt: 2026-05-20");
    expect(md).toContain("updatedAt: 2026-05-20");
    expect(md).not.toContain("undefined");
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["core/dated"].createdAt).toBe("2026-05-20");
  });

  it("falls back to a valid today-date when there's no validFrom either", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const e = mk({ id: "core/nodate", createdAt: undefined, updatedAt: undefined, validFrom: null });
    applyMemoryItems(repo, [{ entry: e, body: "b" }]);
    const md = readFileSync(join(repo, "memory/core/_global/nodate.md"), "utf8");
    expect(md).not.toContain("undefined");
    expect(md).toMatch(/createdAt: \d{4}-\d{2}-\d{2}/);
    expect(md).toMatch(/updatedAt: \d{4}-\d{2}-\d{2}/);
  });

  it("preserves an author-set createdAt", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const e = mk({ id: "core/keep", createdAt: "2025-01-02", updatedAt: undefined, validFrom: null });
    applyMemoryItems(repo, [{ entry: e, body: "b" }]);
    const md = readFileSync(join(repo, "memory/core/_global/keep.md"), "utf8");
    expect(md).toContain("createdAt: 2025-01-02");
  });

  it("unions sourceSessions/Files/Commits on a same-id upsert (never loses the prior receipt)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const base = { id: "episodic/p/t", type: "episodic" as const, scope: "project:p", project: "p" };
    applyMemoryItems(repo, [{ entry: mk({ ...base, sourceSessions: ["s1"], sourceFiles: ["a.ts"], sourceCommits: ["c1"] }), body: "v1" }]);
    // continuation: re-write the SAME id with ONLY the new provenance
    applyMemoryItems(repo, [{ entry: mk({ ...base, sourceSessions: ["s2"], sourceFiles: ["b.ts"], sourceCommits: ["c2"] }), body: "v2" }]);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    const e = idx.entries["episodic/p/t"];
    expect(e.sourceSessions.sort()).toEqual(["s1", "s2"]);   // unioned, not replaced
    expect(e.sourceFiles.sort()).toEqual(["a.ts", "b.ts"]);
    expect(e.sourceCommits.sort()).toEqual(["c1", "c2"]);
  });

  it("tolerates a malformed prior entry (non-array sourceSessions) on upsert — doesn't throw", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    // seed a parseable-but-corrupt prior entry directly in the index
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "episodic/p/t": { id: "episodic/p/t", type: "episodic", sourceSessions: {}, sourceFiles: null, sourceCommits: "x" },
    } }));
    const e = mk({ id: "episodic/p/t", type: "episodic", scope: "project:p", project: "p", sourceSessions: ["s2"] });
    expect(() => applyMemoryItems(repo, [{ entry: e, body: "v" }])).not.toThrow();
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["episodic/p/t"].sourceSessions).toEqual(["s2"]); // malformed prev → [], unioned with new
  });

  it("rejects a supplied path that does not match the canonical path", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    expect(() => applyMemoryItems(repo, [{
      entry: mk({ id: "semantic/p/z", type: "semantic", project: "p", path: "memory/core/_global/user-workflow.md" }),
      body: "evil",
    }])).toThrow(/does not match canonical/);
    expect(existsSync(join(repo, "memory/core/_global/user-workflow.md"))).toBe(false);
  });

  it("flips the supersede target to superseded (v3 behavior preserved)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    applyMemoryItems(repo, [{ entry: mk({ id: "core/old", title: "old" }), body: "old" }]);
    applyMemoryItems(repo, [{ entry: mk({ id: "core/new", title: "new", supersedes: "core/old" }), body: "new" }]);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["core/old"].status).toBe("superseded");
    const oldMd = readFileSync(join(repo, "memory/core/_global/old.md"), "utf8");
    expect(oldMd).toMatch(/^status: superseded$/m);
  });

  it("preflight: a bad item aborts the batch before ANY item is written", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    expect(() => applyMemoryItems(repo, [
      { entry: mk({ id: "core/good", title: "g" }), body: "g" },
      { entry: mk({ id: "semantic/p/bad", type: "semantic", project: "p", path: "memory/core/_global/evil.md" }), body: "x" },
    ])).toThrow(/does not match canonical/);
    // the good (first) item must NOT have been written — validation precedes writes
    expect(existsSync(join(repo, "memory/core/_global/good.md"))).toBe(false);
  });

  it("rejects an untrusted type before it can escape memory/ (type validation)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const evil = mk({ id: "x/pwn", type: "../../etc" as unknown as MemoryEntry["type"], project: null, path: "" });
    expect(() => applyMemoryItems(repo, [{ entry: evil, body: "b" }])).toThrow(/invalid type/i);
  });

  it("rejects a non-gated entry whose type traverses into the core/ tree (no bypass)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const evil = mk({ id: "x/user-workflow", type: "semantic/../core" as unknown as MemoryEntry["type"], project: null, path: "" });
    expect(() => applyMemoryItems(repo, [{ entry: evil, body: "evil" }])).toThrow(/invalid type/i);
    expect(existsSync(join(repo, "memory/core/_global/user-workflow.md"))).toBe(false);
  });

  it("preflight: a malformed supersede target aborts the batch before ANY write", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { saveMemoryIndex } = await import("../../src/memory/index-store.js");
    // seed a malformed live entry (invalid type) that a new item will supersede
    saveMemoryIndex(repo, { version: 1, entries: {
      "weird/x": { ...mk({ id: "weird/x" }), type: "not-a-type" as unknown as MemoryEntry["type"] },
    } } as never);
    expect(() => applyMemoryItems(repo, [
      { entry: mk({ id: "core/good", title: "g" }), body: "g" },
      { entry: mk({ id: "core/new2", supersedes: "weird/x" }), body: "n" },
    ])).toThrow(/invalid type/i);
    // the good (first) item must NOT have been written — preflight precedes writes
    expect(existsSync(join(repo, "memory/core/_global/good.md"))).toBe(false);
  });

  it("supersedes an entry created earlier in the SAME batch", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    applyMemoryItems(repo, [
      { entry: mk({ id: "core/a", title: "a" }), body: "a" },
      { entry: mk({ id: "core/b", title: "b", supersedes: "core/a" }), body: "b" },
    ]);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["core/a"].status).toBe("superseded");
    expect(idx.entries["core/b"].status).toBe("active");
    expect(readFileSync(join(repo, "memory/core/_global/a.md"), "utf8")).toMatch(/^status: superseded$/m);
  });

  it("fills accessCount:0 / lastAccess:null when the authored entry omits them", async () => {
    // Authored memory-write/propose JSON routinely omits accessCount/lastAccess.
    // The live index must store finite defaults, else the scorer hits
    // Math.min(undefined,5)=NaN and ranking breaks for that entry.
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const entry = mk({ id: "semantic/p/z", type: "semantic", scope: "project:p", project: "p", path: "" });
    delete (entry as unknown as Record<string, unknown>).accessCount;
    delete (entry as unknown as Record<string, unknown>).lastAccess;
    applyMemoryItems(repo, [{ entry, body: "b" }]);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    const got = idx.entries["semantic/p/z"];
    expect(got.accessCount).toBe(0);
    expect(got.lastAccess).toBe(null);
  });

  it("live-written index scores identically to a parse rebuild (no accessCount drift)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const { parseMemoryMarkdown } = await import("../../src/memory/parse.js");
    const { scoreMemories } = await import("../../src/memory/score.js");
    const entry = mk({
      id: "semantic/p/z", type: "semantic", scope: "project:p", project: "p", path: "",
      title: "auth token crash", entities: ["AuthTokenView"],
    });
    delete (entry as unknown as Record<string, unknown>).accessCount; // authored entry, no usage field
    const r = applyMemoryItems(repo, [{ entry, body: "b" }]);

    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    const live = idx.entries["semantic/p/z"];
    const rebuilt = parseMemoryMarkdown(readFileSync(join(repo, r.paths[0]), "utf8"))!;
    const q = { project: "p", text: "auth crash", type: null, now: "2026-06-12" };
    const sLive = scoreMemories([live], q)[0].score;
    const sRebuilt = scoreMemories([rebuilt], q)[0].score;
    expect(Number.isFinite(sLive)).toBe(true);
    expect(sLive).toBe(sRebuilt); // live write and rebuild must agree → eval can't drift across a rebuild
  });

  it("defaults a missing trust to 'unknown' (never auto-promotes) — #23", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const entry = mk({ id: "semantic/p/z", type: "semantic", scope: "project:p", project: "p", path: "" });
    delete (entry as unknown as Record<string, unknown>).trust;
    applyMemoryItems(repo, [{ entry, body: "b" }]);
    const idx = JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    expect(idx.entries["semantic/p/z"].trust).toBe("unknown");
  });
});

describe("writeMemoryEntryFile (metadata-only rewriter)", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-writefile-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("preserves the body cleanly on a CRLF (Windows) checkout — no old frontmatter/heading leaks in", async () => {
    const { writeMemoryEntryFile } = await import("../../src/memory/apply.js");
    // Seed the canonical .md with CRLF line endings + an OLD (archived) frontmatter
    // and heading. A non-CRLF-safe body strip would fail to match `---\n...\n---`
    // and embed the entire old frontmatter + "# Old heading" into the rewritten body.
    const rel = "memory/semantic/p/crlf.md";
    const abs = join(repo, rel);
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const crlf = [
      "---", "id: semantic/p/crlf", "type: semantic", "status: archived",
      "archivedReason: expired", "---", "", "# Old heading",
      "", "The real body line one.", "Second body line.", "",
    ].join("\r\n");
    writeFileSync(abs, crlf);

    // Rewrite it back to ACTIVE (the unarchive/archive metadata flip path).
    const entry = mk({
      id: "semantic/p/crlf", type: "semantic", scope: "project:p", project: "p",
      title: "Restored title", status: "active", path: "",
    });
    writeMemoryEntryFile(repo, entry);

    const written = readFileSync(abs, "utf8");
    expect(written).toContain("The real body line one.");   // body preserved…
    expect(written).toContain("Second body line.");
    expect(written).not.toContain("# Old heading");          // …without the old heading…
    expect(written).not.toContain("status: archived");       // …or the old archived frontmatter leaking in
    expect(written).not.toContain("archivedReason: expired");
  });
});
