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

  it("never persists caller-supplied archival lifecycle fields on the AUTHORED path (machine-maintained only)", async () => {
    // Round-15: archivedAt/archivedReason are machine-maintained — only
    // memory-archive sets them and only memory-unarchive clears them. The
    // authored path (memory-write / memory-propose → memory-approve) already
    // coerces status:"archived" back to "active" via the status allowlist, but
    // it used to LET THE SUPPLIED LIFECYCLE VALUES THROUGH — persisting an
    // `active` entry carrying archival metadata (and a bogus archivedReason that
    // unarchive's superseded-cleanup logic / the cold valve's filter would later
    // misread). Since this path can never persist status:"archived", both fields
    // must be forced to null.
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const readIdx = () => JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));

    // (a) status:"archived" + both lifecycle fields supplied
    const forged = mk({
      id: "semantic/p/forged", type: "semantic", scope: "project:p", project: "p", path: "",
      status: "archived" as MemoryEntry["status"],
      archivedAt: "2026-05-01", archivedReason: "superseded-cleanup",
    });
    applyMemoryItems(repo, [{ entry: forged, body: "b" }]);
    const forgedMd = readFileSync(join(repo, "memory/semantic/p/forged.md"), "utf8");
    expect(forgedMd).toContain("status: active");
    expect(forgedMd).toContain("archivedAt: null");
    expect(forgedMd).toContain("archivedReason: null");
    expect(readIdx().entries["semantic/p/forged"].status).toBe("active");
    expect(readIdx().entries["semantic/p/forged"].archivedAt).toBe(null);
    expect(readIdx().entries["semantic/p/forged"].archivedReason).toBe(null);

    // (b) the subtler one: a plainly ACTIVE authored entry that still smuggles
    // archival metadata past the status allowlist.
    const smuggled = mk({
      id: "semantic/p/smuggled", type: "semantic", scope: "project:p", project: "p", path: "",
      status: "active", archivedAt: "2026-05-01", archivedReason: "unused-low-value",
    });
    applyMemoryItems(repo, [{ entry: smuggled, body: "b" }]);
    const smuggledMd = readFileSync(join(repo, "memory/semantic/p/smuggled.md"), "utf8");
    expect(smuggledMd).toContain("archivedAt: null");
    expect(smuggledMd).toContain("archivedReason: null");
    expect(readIdx().entries["semantic/p/smuggled"].archivedAt).toBe(null);
    expect(readIdx().entries["semantic/p/smuggled"].archivedReason).toBe(null);
  });

  it("PRESERVES an existing ARCHIVED state on an authored update (never silently reactivates)", async () => {
    // Round-19: round-15's unconditional `archivedAt = archivedReason = null`
    // also fired when the id being written had SINCE become ARCHIVED — and since
    // the status allowlist normalizes the authored path to "active", that write
    // (or a queued proposal approved later) SILENTLY REACTIVATED the entry,
    // bypassing memory-unarchive entirely. The rule is symmetric: the authored
    // path may neither SET nor CLEAR archival lifecycle state.
    const { applyMemoryItems, writeMemoryEntryFile } = await import("../../src/memory/apply.js");
    const idxPath = join(repo, ".memarium/index.memory.json");
    const readIdx = () => JSON.parse(readFileSync(idxPath, "utf8"));
    const mdPath = join(repo, "memory/semantic/p/cold.md");
    const base = mk({
      id: "semantic/p/cold", type: "semantic", scope: "project:p", project: "p", path: "",
      title: "Old title", summary: "old summary",
    });

    // 1. create it, then archive it the way memory-archive does: metadata-only
    //    .md rewrite + the matching index row.
    applyMemoryItems(repo, [{ entry: { ...base }, body: "original body" }]);
    writeMemoryEntryFile(repo, {
      ...base, path: "memory/semantic/p/cold.md",
      status: "archived" as MemoryEntry["status"], archivedAt: "2026-07-01", archivedReason: "unused-low-value",
    });
    const seeded = readIdx();
    seeded.entries["semantic/p/cold"] = {
      ...seeded.entries["semantic/p/cold"],
      status: "archived", archivedAt: "2026-07-01", archivedReason: "unused-low-value",
    };
    writeFileSync(idxPath, JSON.stringify(seeded));

    // 2. a plain AUTHORED write to the same id — the shape memory-write / an
    //    approved proposal produces (no status, no archival fields).
    const update = mk({
      id: "semantic/p/cold", type: "semantic", scope: "project:p", project: "p", path: "",
      title: "New title", summary: "new summary",
    });
    delete (update as unknown as Record<string, unknown>).status;
    applyMemoryItems(repo, [{ entry: update, body: "updated body" }]);

    // CONTENT is updated normally…
    const row = readIdx().entries["semantic/p/cold"];
    const written = readFileSync(mdPath, "utf8");
    expect(row.title).toBe("New title");
    expect(row.summary).toBe("new summary");
    expect(written).toContain("title: New title");
    expect(written).toContain("updated body");
    expect(written).not.toContain("original body");

    // …the archival LIFECYCLE is left exactly as memory-archive set it, in BOTH stores.
    expect(row.status).toBe("archived");
    expect(row.archivedAt).toBe("2026-07-01");
    expect(row.archivedReason).toBe("unused-low-value");
    expect(written).toContain("status: archived");
    expect(written).toContain("archivedAt: 2026-07-01");
    expect(written).toContain("archivedReason: unused-low-value");
  });

  it("still nulls archival fields + normalizes status when the EXISTING row is NOT archived (round-15 holds; no forged archive)", async () => {
    const { applyMemoryItems } = await import("../../src/memory/apply.js");
    const readIdx = () => JSON.parse(readFileSync(join(repo, ".memarium/index.memory.json"), "utf8"));
    const id = "semantic/p/live";
    const at = (over: Partial<MemoryEntry>) =>
      mk({ id, type: "semantic", scope: "project:p", project: "p", path: "", ...over });

    // seed an ACTIVE row
    applyMemoryItems(repo, [{ entry: at({ title: "v1" }), body: "b1" }]);
    expect(readIdx().entries[id].status).toBe("active");

    // an authored update that tries to FORGE an archive on a non-archived entry
    applyMemoryItems(repo, [{ entry: at({
      title: "v2", status: "archived" as MemoryEntry["status"],
      archivedAt: "2026-05-01", archivedReason: "superseded-cleanup",
    }), body: "b2" }]);

    const row = readIdx().entries[id];
    const md = readFileSync(join(repo, "memory/semantic/p/live.md"), "utf8");
    expect(row.title).toBe("v2");            // content still updated
    expect(row.status).toBe("active");       // status coerced back
    expect(row.archivedAt).toBe(null);       // supplied lifecycle values dropped
    expect(row.archivedReason).toBe(null);
    expect(md).toContain("status: active");
    expect(md).toContain("archivedAt: null");
    expect(md).toContain("archivedReason: null");
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

  it("preserves an indented Markdown code block's leading spaces across an archive→unarchive round-trip (no .trim() de-indent)", async () => {
    const { writeMemoryEntryFile } = await import("../../src/memory/apply.js");
    // A body that OPENS with a 4-space-indented fenced code block. The first
    // line's leading spaces are load-bearing Markdown (they make it a code block).
    // A `.trim()` in body recovery would strip them on every metadata-only rewrite.
    const rel = "memory/semantic/p/indent.md";
    const abs = join(repo, rel);
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const indentedBody = "    ```sh\n    npm run build\n    ```\n\nTrailing prose.";
    const seedMd =
      "---\nid: semantic/p/indent\ntype: semantic\nstatus: active\narchivedAt: null\narchivedReason: null\n---\n\n# Indented\n\n" +
      indentedBody + "\n";
    writeFileSync(abs, seedMd);

    const entry = mk({
      id: "semantic/p/indent", type: "semantic", scope: "project:p", project: "p",
      title: "Indented", status: "active", path: "",
    });

    // archive flip (metadata-only rewrite recovers + re-emits the body)…
    writeMemoryEntryFile(repo, { ...entry, status: "archived", archivedAt: "2026-07-01", archivedReason: "unused-low-value" });
    // …then unarchive flip (a second recovery + re-emit).
    writeMemoryEntryFile(repo, { ...entry, status: "active" });

    const written = readFileSync(abs, "utf8");
    // The indentation of BOTH the opening fence and the code line survived intact.
    expect(written).toContain("    ```sh\n    npm run build\n    ```");
    expect(written).toContain("Trailing prose.");
  });

  it("rejects a .md whose first heading is a body ## (no canonical # title) — must not pass preflight", async () => {
    const { assertMemoryBodyRecoverable } = await import("../../src/memory/apply.js");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    // frontmatter is valid, but the body opens with an H2 section — no `# Title` H1.
    writeFileSync(join(repo, "memory/semantic/p/noh1.md"),
      "---\nid: semantic/p/noh1\ntype: semantic\nstatus: active\n---\n\n## Section\n\nbody text\n");
    const entry = mk({ id: "semantic/p/noh1", type: "semantic", scope: "project:p", project: "p",
      title: "NoH1", status: "active", path: "" });
    expect(() => assertMemoryBodyRecoverable(repo, entry)).toThrow(/# heading/);
  });

  it("strips only the H1 title, preserving a later ## body heading across a rewrite", async () => {
    const { writeMemoryEntryFile } = await import("../../src/memory/apply.js");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    writeFileSync(join(repo, "memory/semantic/p/sub.md"),
      "---\nid: semantic/p/sub\ntype: semantic\nstatus: active\n---\n\n# Title\n\nintro\n\n## Subsection\n\nmore\n");
    const entry = mk({ id: "semantic/p/sub", type: "semantic", scope: "project:p", project: "p",
      title: "Title", status: "active", path: "" });
    writeMemoryEntryFile(repo, { ...entry, status: "archived", archivedAt: "2026-07-01", archivedReason: "expired" });
    const written = readFileSync(join(repo, "memory/semantic/p/sub.md"), "utf8");
    expect(written).toContain("## Subsection"); // body heading preserved (not deleted as the title)
    expect(written).toContain("intro");
  });

  it("aborts (throws, leaves the file untouched) when the persisted .md id differs from the entry — identity guard", async () => {
    // A structurally-valid .md whose frontmatter id belongs to a DIFFERENT entry is
    // sitting at the canonical path derived from `entry`. Without an identity check,
    // a metadata-only rewrite would overwrite that other entry's record with THIS
    // index row — turning store corruption into silent cross-entry data loss during
    // automatic archival. The strict rewriter must throw before any write.
    const { writeMemoryEntryFile, assertMemoryBodyRecoverable } = await import("../../src/memory/apply.js");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const abs = join(repo, "memory/semantic/p/mine.md");
    // canonical path for id "semantic/p/mine" holds a .md that claims id "semantic/p/OTHER".
    const foreign = "---\nid: semantic/p/OTHER\ntype: semantic\nstatus: active\n---\n\n# Other entry\n\nSomeone else's body.\n";
    writeFileSync(abs, foreign);
    const entry = mk({ id: "semantic/p/mine", type: "semantic", scope: "project:p", project: "p",
      title: "Mine", status: "archived", archivedAt: "2026-07-01", archivedReason: "expired", path: "" });
    // both the batch preflight and the single-entry writer must reject it
    expect(() => assertMemoryBodyRecoverable(repo, entry)).toThrow(/identity mismatch|different id/i);
    expect(() => writeMemoryEntryFile(repo, entry)).toThrow(/identity mismatch|different id/i);
    expect(readFileSync(abs, "utf8")).toBe(foreign); // original file byte-identical, never clobbered
  });

  it("aborts when the persisted .md type differs from the entry — identity guard (type)", async () => {
    const { writeMemoryEntryFile } = await import("../../src/memory/apply.js");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const abs = join(repo, "memory/semantic/p/t.md");
    // same id, but the persisted type is procedural while the entry says semantic.
    const foreign = "---\nid: semantic/p/t\ntype: procedural\nstatus: active\n---\n\n# T\n\nbody\n";
    writeFileSync(abs, foreign);
    const entry = mk({ id: "semantic/p/t", type: "semantic", scope: "project:p", project: "p",
      title: "T", status: "archived", archivedAt: "2026-07-01", archivedReason: "expired", path: "" });
    expect(() => writeMemoryEntryFile(repo, entry)).toThrow(/identity mismatch|different type/i);
    expect(readFileSync(abs, "utf8")).toBe(foreign);
  });
});

describe("missingRewriteField — COLLECTION fields the renderer joins", () => {
  // Round-16: the rewrite gate validated only SCALAR fields, so a superseded row
  // carrying `sourceSessions: "s1"` (a STRING, not an array) passed, was planned
  // for archival, and then renderMemoryMarkdown called `.join()` on it — throwing
  // mid-run inside the AUTOMATIC digest consolidation (no human in the loop).
  // The gate must reject any collection field that isn't an array.
  const complete = (): MemoryEntry => mk({
    id: "semantic/p/x", type: "semantic", scope: "project:p", project: "p", title: "T",
  });
  const COLLECTIONS = ["sourceSessions", "sourceCommits", "sourceFiles", "entities"] as const;

  it("accepts a complete row (control)", async () => {
    const { missingRewriteField } = await import("../../src/memory/apply.js");
    expect(missingRewriteField(complete())).toBeNull();
  });

  it("rejects a non-array collection field, naming it — and that row really would crash the renderer", async () => {
    const { missingRewriteField } = await import("../../src/memory/apply.js");
    const { renderMemoryMarkdown } = await import("../../src/memory/render.js");
    for (const field of COLLECTIONS) {
      for (const bad of ["s1", 42, { a: 1 }]) {
        const row = { ...complete(), [field]: bad } as unknown as MemoryEntry;
        expect(missingRewriteField(row)).toBe(field);
        // proof the gate is load-bearing: the renderer genuinely throws on this row
        expect(() => renderMemoryMarkdown(row, "body")).toThrow(TypeError);
      }
    }
  });

  it("tolerates an UNSET collection field (undefined / null) — the renderer coerces it to []", async () => {
    const { missingRewriteField } = await import("../../src/memory/apply.js");
    const { renderMemoryMarkdown } = await import("../../src/memory/render.js");
    for (const field of COLLECTIONS) {
      for (const unset of [undefined, null]) {
        const row = { ...complete(), [field]: unset } as unknown as MemoryEntry;
        expect(missingRewriteField(row)).toBeNull();
        expect(renderMemoryMarkdown(row, "body")).toContain(`${field}: []`);
      }
    }
  });
});
