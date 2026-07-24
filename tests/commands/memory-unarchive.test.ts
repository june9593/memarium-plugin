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
});
