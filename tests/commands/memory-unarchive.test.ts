import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { memoryUnarchiveCmd } from "../../src/commands/memory-unarchive.js";

let home: string, repo: string, out: string[];
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "munarch-"));
  repo = join(home, ".memarium", "session-repo");
  mkdirSync(join(repo, ".memarium"), { recursive: true });
  vi.stubEnv("HOME", home);
  vi.stubEnv("MEMARIUM_DIR", ""); // force homedir-based memariumHome so the HOME stub drives repoPath
  out = [];
  vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => { out.push(a.map(String).join(" ")); });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

const idxPath = () => join(repo, ".memarium", "index.memory.json");
const readIndex = () => JSON.parse(readFileSync(idxPath(), "utf8"));
const readIndexStatus = (id: string) => readIndex().entries[id].status as string;
const readIndexReason = (id: string) => readIndex().entries[id].archivedReason as string | null;
const readIndexArchivedAt = (id: string) => readIndex().entries[id].archivedAt as string | null;
const readIndexUpdatedAt = (id: string) => readIndex().entries[id].updatedAt as string;

/** Read a frontmatter scalar straight off the persisted .md (proves the .md was
 *  actually rewritten, not just the index). The renderer emits the YAML literal
 *  `null` for a cleared nullable, so map that back to a real null. */
function readMdField(rel: string, field: string): string | undefined {
  const md = readFileSync(join(repo, "memory", rel), "utf8");
  const m = md.match(new RegExp(`^${field}: (.*)$`, "m"));
  return m ? m[1] : undefined;
}
const readMdNullable = (rel: string, field: string): string | null | undefined => {
  const v = readMdField(rel, field);
  return v === "null" ? null : v;
};

/** Seed: one ARCHIVED semantic (the restore target) + one ACTIVE semantic (a
 *  known-but-not-archived no-op target). Each with a real .md so body
 *  preservation + a genuine md rewrite are observable. */
function seed() {
  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, validTo: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], trust: "trusted" as const, originDevice: null,
    accessCount: 0, lastAccess: null,
  };
  const entries = {
    "semantic/p/c": {
      id: "semantic/p/c", type: "semantic", scope: "project:p", project: "p",
      title: "Archived fact", summary: "s", path: "memory/semantic/p/c.md", status: "archived",
      archivedAt: "2026-05-01", archivedReason: "expired", ...base,
    },
    // Archived via the "expired" rule with a PAST validTo still set — restoring
    // this without clearing validTo would leave it invisible on BOTH tiers.
    "semantic/p/exp": {
      id: "semantic/p/exp", type: "semantic", scope: "project:p", project: "p",
      title: "Archived expired fact", summary: "s", path: "memory/semantic/p/exp.md", status: "archived",
      archivedAt: "2026-05-01", archivedReason: "expired", ...base, validTo: "2000-01-01",
    },
    "semantic/p/act": {
      id: "semantic/p/act", type: "semantic", scope: "project:p", project: "p",
      title: "Active fact", summary: "s", path: "memory/semantic/p/act.md", status: "active",
      archivedAt: null, archivedReason: null, ...base,
    },
    // Archived by the "superseded-cleanup" rule — it was ALREADY superseded
    // before archival, so restoring it must return it to `superseded`, NOT active
    // (reactivating would resurrect an obsolete fact next to its live replacement).
    "semantic/p/sup": {
      id: "semantic/p/sup", type: "semantic", scope: "project:p", project: "p",
      title: "Superseded then archived", summary: "s", path: "memory/semantic/p/sup.md", status: "archived",
      archivedAt: "2026-05-01", archivedReason: "superseded-cleanup", ...base,
    },
  };
  writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
  mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
  const md = (title: string, id: string, status: string, at: string, reason: string) =>
    `---\nid: ${id}\ntype: semantic\nstatus: ${status}\narchivedAt: ${at}\narchivedReason: ${reason}\n---\n\n# ${title}\n\nThe real body of ${id}.\n`;
  writeFileSync(join(repo, "memory/semantic/p/c.md"), md("Archived fact", "semantic/p/c", "archived", "2026-05-01", "expired"));
  writeFileSync(join(repo, "memory/semantic/p/exp.md"), md("Archived expired fact", "semantic/p/exp", "archived", "2026-05-01", "expired"));
  writeFileSync(join(repo, "memory/semantic/p/act.md"), md("Active fact", "semantic/p/act", "active", "null", "null"));
  writeFileSync(join(repo, "memory/semantic/p/sup.md"), md("Superseded then archived", "semantic/p/sup", "archived", "2026-05-01", "superseded-cleanup"));
}

describe("memoryUnarchiveCmd", () => {
  it("restores an archived entry to active and clears archived fields in BOTH the index and the .md", async () => {
    seed();
    await memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo });

    // index side: flipped back to active, archived fields cleared, updatedAt bumped
    expect(readIndexStatus("semantic/p/c")).toBe("active");
    expect(readIndexReason("semantic/p/c")).toBe(null);
    expect(readIndexArchivedAt("semantic/p/c")).toBe(null);
    expect(readIndexUpdatedAt("semantic/p/c")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(readIndexUpdatedAt("semantic/p/c")).not.toBe("2026-01-01"); // genuinely bumped

    // .md side — the LANDMINE assertion: the guarded writer bypasses status
    // coercion, so status persists as "active" and the archived fields are cleared.
    expect(readMdField("semantic/p/c.md", "status")).toBe("active");
    expect(readMdNullable("semantic/p/c.md", "archivedReason")).toBe(null);
    expect(readMdNullable("semantic/p/c.md", "archivedAt")).toBe(null);
    // body preserved through the metadata-only rewrite
    expect(readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8")).toContain("The real body of semantic/p/c.");

    expect(out.join("\n")).toContain("semantic/p/c");
  });

  it("no-op on an unknown id (resolves, prints, writes nothing)", async () => {
    seed();
    const idxBefore = readFileSync(idxPath(), "utf8");
    await expect(memoryUnarchiveCmd({ id: "nope", cwd: repo })).resolves.toBeUndefined();
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore); // byte-identical: nothing written
    expect(out.join("\n")).toMatch(/not archived|nope/);
  });

  it("no-op on a known but non-archived (active) id — leaves index + .md untouched", async () => {
    seed();
    const idxBefore = readFileSync(idxPath(), "utf8");
    const actMdBefore = readFileSync(join(repo, "memory/semantic/p/act.md"), "utf8");
    await expect(memoryUnarchiveCmd({ id: "semantic/p/act", cwd: repo })).resolves.toBeUndefined();
    expect(readIndexStatus("semantic/p/act")).toBe("active");
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore); // index untouched
    expect(readFileSync(join(repo, "memory/semantic/p/act.md"), "utf8")).toBe(actMdBefore); // .md never rewritten
  });

  it("clears a PAST validTo on restore so an expired-rule archive is recallable again", async () => {
    seed();
    await memoryUnarchiveCmd({ id: "semantic/p/exp", cwd: repo });
    // active again AND the stale validTo is gone from BOTH the index and the .md,
    // so scoreMemories/primer/entity no longer reject it as expired.
    expect(readIndexStatus("semantic/p/exp")).toBe("active");
    expect(readIndex().entries["semantic/p/exp"].validTo).toBe(null);
    expect(readMdNullable("semantic/p/exp.md", "validTo")).toBe(null);
    expect(out.join("\n")).toMatch(/cleared past validTo=2000-01-01/);
    // body still preserved through the rewrite
    expect(readFileSync(join(repo, "memory/semantic/p/exp.md"), "utf8")).toContain("The real body of semantic/p/exp.");
  });

  it("leaves a null validTo untouched on restore (no spurious clear note)", async () => {
    seed();
    await memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }); // validTo === null
    expect(readIndexStatus("semantic/p/c")).toBe("active");
    expect(readIndex().entries["semantic/p/c"].validTo).toBe(null);
    expect(out.join("\n")).not.toMatch(/cleared past validTo/);
  });

  it("restores a superseded-cleanup archive to superseded (NOT active) while an expired archive restores to active", async () => {
    seed();
    // superseded-cleanup: was already superseded before archival → back to superseded
    await memoryUnarchiveCmd({ id: "semantic/p/sup", cwd: repo });
    expect(readIndexStatus("semantic/p/sup")).toBe("superseded"); // NOT "active"
    expect(readIndexReason("semantic/p/sup")).toBe(null);
    expect(readIndexArchivedAt("semantic/p/sup")).toBe(null);
    expect(readIndexUpdatedAt("semantic/p/sup")).not.toBe("2026-01-01"); // bumped
    // .md side: the guarded writer bypasses coercion, so status persists as superseded
    expect(readMdField("semantic/p/sup.md", "status")).toBe("superseded");
    expect(readMdNullable("semantic/p/sup.md", "archivedReason")).toBe(null);
    expect(readMdNullable("semantic/p/sup.md", "archivedAt")).toBe(null);
    expect(readFileSync(join(repo, "memory/semantic/p/sup.md"), "utf8")).toContain("The real body of semantic/p/sup."); // body kept
    expect(out.join("\n")).toMatch(/to superseded/);

    // control: an expired archive restores to active
    out = [];
    await memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo });
    expect(readIndexStatus("semantic/p/c")).toBe("active");
    expect(readMdField("semantic/p/c.md", "status")).toBe("active");
  });

  it("does not touch validTo when restoring a superseded-cleanup archive (superseded path skips the expired-clear)", async () => {
    seed();
    // Give the superseded-cleanup entry a PAST validTo. Because it restores to
    // `superseded` (hidden by status regardless), the expired-clear must NOT fire.
    const idx = readIndex();
    idx.entries["semantic/p/sup"].validTo = "2000-01-01";
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    writeFileSync(join(repo, "memory/semantic/p/sup.md"),
      "---\nid: semantic/p/sup\ntype: semantic\nstatus: archived\narchivedAt: 2026-05-01\narchivedReason: superseded-cleanup\nvalidTo: 2000-01-01\n---\n\n# Superseded then archived\n\nThe real body of semantic/p/sup.\n");
    await memoryUnarchiveCmd({ id: "semantic/p/sup", cwd: repo });
    expect(readIndexStatus("semantic/p/sup")).toBe("superseded");
    expect(readIndex().entries["semantic/p/sup"].validTo).toBe("2000-01-01"); // untouched
    expect(out.join("\n")).not.toMatch(/cleared past validTo/);
  });

  it("aborts (writes nothing) when the target's .md is MALFORMED — strict body recovery leaves index + .md unchanged", async () => {
    seed();
    // Corrupt the archived entry's .md: no frontmatter block, no `# heading`, so
    // the body can't be recovered for the metadata-only rewrite. Unarchive MUST
    // throw BEFORE writing rather than clobber the entry with a bodyless/nested
    // document — leaving both the index and the (corrupt) .md byte-identical.
    const badMd = "just some text, no frontmatter, no heading\n";
    writeFileSync(join(repo, "memory/semantic/p/c.md"), badMd);
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/no valid frontmatter|no "# heading"|cannot recover body/i);

    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);          // index unchanged
    expect(readIndexStatus("semantic/p/c")).toBe("archived");         // still archived
    expect(readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8")).toBe(badMd); // .md not rewritten
  });

  it("aborts (leaves entry archived) when the aggregated overlay holds a NEWER or same-day DIVERGENT copy", async () => {
    // Round-8: unarchive had NO counterpart to memory-archive's cross-device guard.
    // Restoring a stale LOCAL archived row → active and stamping today's updatedAt
    // could win the next merge and clobber a newer/divergent sibling edit. Both a
    // strictly-newer overlay copy and a same-day divergent one must ABORT the
    // restore, leaving the entry archived and untouched.
    seed();
    const overlayRoot = join(home, ".memarium", "aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    const ovBase = {
      confidence: 1, importance: 1, createdAt: "2026-01-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "trusted" as const, originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const overlayEntries = {
      // strictly NEWER than the local archived row (updatedAt 2026-01-01) → conflict
      "semantic/p/c": { id: "semantic/p/c", type: "semantic", scope: "project:p", project: "p",
        title: "Archived fact (sibling newer)", summary: "s", path: "memory/semantic/p/c.md",
        status: "active", validTo: null, updatedAt: "2026-07-01", ...ovBase },
      // SAME updatedAt (2026-01-01) but DIVERGENT (active vs local archived) → conflict
      "semantic/p/exp": { id: "semantic/p/exp", type: "semantic", scope: "project:p", project: "p",
        title: "Archived expired fact", summary: "s", path: "memory/semantic/p/exp.md",
        status: "active", validTo: null, updatedAt: "2026-01-01", ...ovBase },
    };
    writeFileSync(join(overlayRoot, ".memarium", "index.memory.json"),
      JSON.stringify({ version: 1, entries: overlayEntries }, null, 2) + "\n");
    const idxBefore = readFileSync(idxPath(), "utf8");

    // strictly-newer overlay copy → abort
    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/newer\/divergent copy exists|resolve there/i);
    expect(readIndexStatus("semantic/p/c")).toBe("archived");

    // same-day divergent overlay copy → abort
    await expect(memoryUnarchiveCmd({ id: "semantic/p/exp", cwd: repo }))
      .rejects.toThrow(/newer\/divergent copy exists|resolve there/i);
    expect(readIndexStatus("semantic/p/exp")).toBe("archived");

    // all-or-nothing: neither abort wrote anything
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
  });

  it("aborts when the index row under the requested id carries a DIFFERENT id — the named victim is never rewritten", async () => {
    // Round-12: unarchive looked up `idx.entries[opts.id]` and rewrote from that
    // row without checking the row's own `id` matched the key. Since
    // writeMemoryEntryFile derives the canonical path from `entry.id`, a corrupt
    // row filed under `semantic/p/a` but carrying `id: "semantic/p/b"` would be
    // written over the UNRELATED `semantic/p/b` record — and the round-6 identity
    // guard would accept it, because that .md genuinely carries `semantic/p/b`.
    seed();
    const idx = readIndex();
    idx.entries["semantic/p/a"] = {
      ...idx.entries["semantic/p/c"],
      id: "semantic/p/b",                 // key/id MISMATCH: filed under "a", claims to be "b"
      title: "Corrupt row claiming to be b", path: "memory/semantic/p/b.md",
    };
    idx.entries["semantic/p/b"] = {
      ...idx.entries["semantic/p/act"],
      id: "semantic/p/b", title: "The real b", path: "memory/semantic/p/b.md", status: "active",
    };
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    const bMd = `---\nid: semantic/p/b\ntype: semantic\nstatus: active\narchivedAt: null\narchivedReason: null\n---\n\n# The real b\n\nThe real body of semantic/p/b.\n`;
    writeFileSync(join(repo, "memory/semantic/p/b.md"), bMd);
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/a", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/a.*corrupt.*key\/id mismatch/i);

    // nothing changed: neither the victim's .md nor the index
    expect(readFileSync(join(repo, "memory/semantic/p/b.md"), "utf8")).toBe(bMd);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readIndexStatus("semantic/p/b")).toBe("active");
  });

  it("aborts when the archived index row is INCOMPLETE (missing title / scope) — no degraded record is written", async () => {
    // Round-15: validEntryExists only proves the row is a non-null, non-array
    // object filed under its OWN id — it does NOT prove the row is well-formed.
    // A partial archived row with a valid id/type/project sailed through into
    // writeMemoryEntryFile, and the renderer then serialized the missing fields
    // as the literal "undefined" (`title: undefined`, `# undefined`,
    // `scope: undefined`) — corrupting the entry on restore. Abort instead.
    seed();
    const idx = readIndex();
    const partial = (over: Record<string, unknown>) => ({
      id: "x", type: "semantic", scope: "project:p", project: "p", title: "T",
      summary: "s", path: "", status: "archived", archivedAt: "2026-05-01",
      archivedReason: "expired", confidence: 1, importance: 1,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", validFrom: null, validTo: null,
      sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null,
      ...over,
    });
    const noTitle = partial({ id: "semantic/p/notitle", path: "memory/semantic/p/notitle.md" }) as Record<string, unknown>;
    delete noTitle.title;
    const noScope = partial({ id: "semantic/p/noscope", path: "memory/semantic/p/noscope.md" }) as Record<string, unknown>;
    delete noScope.scope;
    idx.entries["semantic/p/notitle"] = noTitle;
    idx.entries["semantic/p/noscope"] = noScope;
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    const md = (id: string, title: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: archived\narchivedAt: 2026-05-01\narchivedReason: expired\n---\n\n# ${title}\n\nThe real body of ${id}.\n`;
    const noTitleMd = md("semantic/p/notitle", "Partial row");
    const noScopeMd = md("semantic/p/noscope", "Partial row");
    writeFileSync(join(repo, "memory/semantic/p/notitle.md"), noTitleMd);
    writeFileSync(join(repo, "memory/semantic/p/noscope.md"), noScopeMd);
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/notitle", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/notitle.*incomplete.*title/i);
    await expect(memoryUnarchiveCmd({ id: "semantic/p/noscope", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/noscope.*incomplete.*scope/i);

    // all-or-nothing: neither the .md nor the index was touched
    expect(readFileSync(join(repo, "memory/semantic/p/notitle.md"), "utf8")).toBe(noTitleMd);
    expect(readFileSync(join(repo, "memory/semantic/p/noscope.md"), "utf8")).toBe(noScopeMd);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readIndexStatus("semantic/p/notitle")).toBe("archived"); // still archived
  });

  it("still restores normally when the overlay holds only an OLDER (non-conflicting) copy of the id", async () => {
    // Control for the guard: an overlay copy that is strictly OLDER than the local
    // archived row is NOT a conflict — local is authoritative — so the restore
    // proceeds exactly as with no overlay at all.
    seed();
    const overlayRoot = join(home, ".memarium", "aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    const overlayEntries = {
      "semantic/p/c": { id: "semantic/p/c", type: "semantic", scope: "project:p", project: "p",
        title: "Archived fact", summary: "s", path: "memory/semantic/p/c.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "expired",
        confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2000-01-01",
        validFrom: null, validTo: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], trust: "trusted" as const, originDevice: null,
        accessCount: 0, lastAccess: null },
    };
    writeFileSync(join(overlayRoot, ".memarium", "index.memory.json"),
      JSON.stringify({ version: 1, entries: overlayEntries }, null, 2) + "\n");

    await memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo });
    expect(readIndexStatus("semantic/p/c")).toBe("active");
    expect(readMdField("semantic/p/c.md", "status")).toBe("active");
  });

  it("round-21: REFUSES when the overlay row under this id carries a DIFFERENT `id`", async () => {
    // The overlay index is filed by MAP KEY and no loader checks the key against
    // the row's own `id`, so `overlayEntries[opts.id]` can hand back a row that
    // names a DIFFERENT record. Pre-fix `sameMemoryContent` omitted `id`, so a
    // same-day row identical in every other compared field read as "an
    // already-synced copy" and the restore (which restamps updatedAt and can win
    // the next merge) went through without ever comparing the real sibling.
    // Discriminating fixture: the overlay tree ALSO holds the .md the foreign id
    // derives, with the same body, so the body check answers "equivalent" too.
    seed();
    const overlayRoot = join(home, ".memarium", "aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    const overlayEntries = {
      // equal updatedAt (2026-01-01) + every compared field identical to the
      // local archived row — the ONLY difference is the row's own `id`.
      "semantic/p/c": { id: "semantic/p/victim", type: "semantic", scope: "project:p", project: "p",
        title: "Archived fact", summary: "s", path: "memory/semantic/p/c.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "expired",
        confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
        validFrom: null, validTo: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], trust: "trusted" as const, originDevice: null,
        accessCount: 0, lastAccess: null },
    };
    writeFileSync(join(overlayRoot, ".memarium", "index.memory.json"),
      JSON.stringify({ version: 1, entries: overlayEntries }, null, 2) + "\n");
    mkdirSync(join(overlayRoot, "memory/semantic/p"), { recursive: true });
    writeFileSync(join(overlayRoot, "memory/semantic/p/victim.md"),
      `---\nid: semantic/p/victim\ntype: semantic\nstatus: archived\n---\n\n# Archived fact\n\nThe real body of semantic/p/c.\n`);
    const idxBefore = readFileSync(idxPath(), "utf8");
    const cMd = readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/newer\/divergent copy exists|resolve there/i);

    expect(readIndexStatus("semantic/p/c")).toBe("archived");            // still archived
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);             // nothing written
    expect(readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8")).toBe(cMd);
  });
});

describe("memoryUnarchiveCmd — round-16 fail-closed guards", () => {
  const overlayRoot = () => join(home, ".memarium", "aggregated");
  function writeOverlayRaw(raw: string) {
    mkdirSync(join(overlayRoot(), ".memarium"), { recursive: true });
    writeFileSync(join(overlayRoot(), ".memarium", "index.memory.json"), raw);
  }

  it("aborts when the archived row's COLLECTION field is not an array — naming the field", async () => {
    // `sourceSessions: "s1"` (a STRING) passed the scalar-only completeness gate
    // and then crashed renderMemoryMarkdown's `.join()` on the way out.
    seed();
    const idx = readIndex();
    idx.entries["semantic/p/c"].sourceSessions = "s1";
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    const idxBefore = readFileSync(idxPath(), "utf8");
    const mdBefore = readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/c.*incomplete.*sourceSessions/i);

    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8")).toBe(mdBefore);
  });

  it("refuses when the overlay row EXISTS but cannot be compared (non-object, or no updatedAt)", async () => {
    seed();
    const idxBefore = readFileSync(idxPath(), "utf8");
    writeOverlayRaw(JSON.stringify({ version: 1, entries: { "semantic/p/c": "not-an-object" } }, null, 2) + "\n");
    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo })).rejects.toThrow(/refusing to unarchive semantic\/p\/c/i);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);

    const noUpd: Record<string, unknown> = { ...readIndex().entries["semantic/p/c"] };
    delete noUpd.updatedAt;
    writeOverlayRaw(JSON.stringify({ version: 1, entries: { "semantic/p/c": noUpd } }, null, 2) + "\n");
    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo })).rejects.toThrow(/refusing to unarchive semantic\/p\/c/i);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readIndexStatus("semantic/p/c")).toBe("archived"); // still archived, never restamped
  });

  it("refuses (writes nothing) when the overlay index EXISTS but is corrupt", async () => {
    seed();
    const idxBefore = readFileSync(idxPath(), "utf8");
    const mdBefore = readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8");
    writeOverlayRaw("{ this is not valid json");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
      .rejects.toThrow(/overlay index is unreadable/i);

    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8")).toBe(mdBefore);
    expect(readIndexStatus("semantic/p/c")).toBe("archived");
  });

  it("restores normally when the overlay directory exists but holds NO index file (genuinely absent)", async () => {
    seed();
    mkdirSync(join(overlayRoot(), ".memarium"), { recursive: true }); // dir, no index file
    await memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo });
    expect(readIndexStatus("semantic/p/c")).toBe("active");
  });

  describe("round-17: an UNCOMPARABLE overlay row REFUSES, never throws a raw TypeError", () => {
    it("refuses (controlled message, nothing written) when the overlay row's `entities` is not an array", async () => {
      seed();
      const local = readIndex().entries["semantic/p/c"];
      const idxBefore = readFileSync(idxPath(), "utf8");
      const mdBefore = readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8");
      // Otherwise byte-for-byte the local row, so every scalar matches and the
      // comparison reaches the collection compare — which used to throw
      // "entities is not iterable" straight out of the command.
      writeOverlayRaw(JSON.stringify({
        version: 1, entries: { "semantic/p/c": { ...local, entities: {} } },
      }, null, 2) + "\n");

      await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
        .rejects.toThrow(/newer\/divergent copy exists|resolve there/i);
      await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
        .rejects.not.toThrow(/is not iterable/i);

      expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
      expect(readFileSync(join(repo, "memory/semantic/p/c.md"), "utf8")).toBe(mdBefore);
      expect(readIndexStatus("semantic/p/c")).toBe("archived");
    });

    it("refuses when the overlay row is a partial row whose `sourceSessions` is a bare string", async () => {
      seed();
      const idxBefore = readFileSync(idxPath(), "utf8");
      writeOverlayRaw(JSON.stringify({
        version: 1, entries: { "semantic/p/c": { updatedAt: "2026-01-01", sourceSessions: "s1" } },
      }, null, 2) + "\n");

      await expect(memoryUnarchiveCmd({ id: "semantic/p/c", cwd: repo }))
        .rejects.toThrow(/newer\/divergent copy exists|resolve there/i);
      expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
      expect(readIndexStatus("semantic/p/c")).toBe("archived");
    });
  });
});

describe("memoryUnarchiveCmd — round-22: a row whose CANONICAL PATH cannot be derived", () => {
  // The shared rewrite gate checked that `id`/`project` were NON-EMPTY STRINGS,
  // not that the path DERIVED from them is valid. For unarchive there is no safe
  // repair (we can't invent the real project or slug), so ABORT this one id with
  // a message that names the offending ingredient — and, unlike the "missing
  // <field>" cases, does NOT claim the field is absent when it is merely unsafe.
  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, validTo: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [] as string[], trust: "trusted" as const, originDevice: null,
    accessCount: 0, lastAccess: null, archivedAt: "2026-05-01", archivedReason: "expired",
  };
  const archived = (key: string, over: Record<string, unknown> = {}) => ({
    id: key, type: "semantic", scope: "project:p", project: "p",
    title: "a fact", summary: "s", path: "", status: "archived", ...base, ...over,
  });
  const md = (id: string) =>
    `---\nid: ${id}\ntype: semantic\nstatus: archived\narchivedAt: 2026-05-01\narchivedReason: expired\n---\n\n# a fact\n\nThe real body of ${id}.\n`;

  function writeStore(entries: Record<string, unknown>) {
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
  }

  it("aborts (writes nothing) for an unsafe `project`, naming it as unsafe rather than missing", async () => {
    writeStore({ "semantic/p/badproj": archived("semantic/p/badproj", { project: "../x" }) });
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/badproj", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/badproj.*unsafe.*project/i);
    await expect(memoryUnarchiveCmd({ id: "semantic/p/badproj", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/badproj(?!.*missing)/i);

    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore); // index byte-identical
    expect(readIndexStatus("semantic/p/badproj")).toBe("archived");
  });

  it("aborts (writes nothing) for an `id` whose slug segment is `..`", async () => {
    writeStore({ "semantic/p/..": archived("semantic/p/..") });
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/..", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/\.\..*unsafe.*id/i);

    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readIndexStatus("semantic/p/..")).toBe("archived");
  });

  it("still restores a well-formed archived row (regression lock)", async () => {
    writeStore({ "semantic/p/ok": archived("semantic/p/ok", { path: "memory/semantic/p/ok.md" }) });
    writeFileSync(join(repo, "memory/semantic/p/ok.md"), md("semantic/p/ok"));

    await memoryUnarchiveCmd({ id: "semantic/p/ok", cwd: repo });

    expect(readIndexStatus("semantic/p/ok")).toBe("active");
    expect(readMdField("semantic/p/ok.md", "status")).toBe("active");
  });
});

describe("memoryUnarchiveCmd — round-23: a row with a NON-FINITE `importance`", () => {
  // Same shared gate as memory-archive: a row whose `importance` is absent or
  // non-numeric is not a faithful rewrite target (the renderer would silently
  // invent `importance: 0` in the .md while the index row keeps no usable value),
  // and it is the ingredient planArchival ranks near-duplicates by. There is no
  // safe repair, so ABORT this one id and change nothing.
  it("aborts naming the defect and writes nothing (absent AND non-numeric)", async () => {
    seed();
    const idx = readIndex();
    const partial = (over: Record<string, unknown>) => ({
      id: "x", type: "semantic", scope: "project:p", project: "p", title: "T",
      summary: "s", path: "", status: "archived", archivedAt: "2026-05-01",
      archivedReason: "expired", confidence: 1, importance: 1,
      createdAt: "2026-01-01", updatedAt: "2026-01-01", validFrom: null, validTo: null,
      sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], trust: "trusted", originDevice: null, accessCount: 0, lastAccess: null,
      ...over,
    });
    const noImp = partial({ id: "semantic/p/noimp", path: "memory/semantic/p/noimp.md" }) as Record<string, unknown>;
    delete noImp.importance;
    const strImp = partial({ id: "semantic/p/strimp", path: "memory/semantic/p/strimp.md", importance: "5" });
    idx.entries["semantic/p/noimp"] = noImp;
    idx.entries["semantic/p/strimp"] = strImp;
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    const md = (id: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: archived\narchivedAt: 2026-05-01\narchivedReason: expired\n---\n\n# Partial row\n\nThe real body of ${id}.\n`;
    const noImpMd = md("semantic/p/noimp"), strImpMd = md("semantic/p/strimp");
    writeFileSync(join(repo, "memory/semantic/p/noimp.md"), noImpMd);
    writeFileSync(join(repo, "memory/semantic/p/strimp.md"), strImpMd);
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryUnarchiveCmd({ id: "semantic/p/noimp", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/noimp.*incomplete.*missing importance/i);
    await expect(memoryUnarchiveCmd({ id: "semantic/p/strimp", cwd: repo }))
      .rejects.toThrow(/refusing to unarchive semantic\/p\/strimp.*incomplete.*unsafe importance/i);

    // all-or-nothing: neither .md nor the index moved
    expect(readFileSync(join(repo, "memory/semantic/p/noimp.md"), "utf8")).toBe(noImpMd);
    expect(readFileSync(join(repo, "memory/semantic/p/strimp.md"), "utf8")).toBe(strImpMd);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readIndexStatus("semantic/p/noimp")).toBe("archived");
    expect(readIndexStatus("semantic/p/strimp")).toBe("archived");
  });
});
