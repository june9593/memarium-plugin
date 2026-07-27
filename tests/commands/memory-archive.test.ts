import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, symlinkSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { memoryArchiveCmd } from "../../src/commands/memory-archive.js";

let home: string, repo: string, out: string[];
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "march-"));
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

/** Read a frontmatter scalar straight off the persisted .md (proves the .md was
 *  rewritten and NOT clobbered by any status-coercion path). */
function readMdField(rel: string, field: string): string | undefined {
  const md = readFileSync(join(repo, "memory", rel), "utf8");
  const m = md.match(new RegExp(`^${field}: (.*)$`, "m"));
  return m ? m[1] : undefined;
}

/** Seed: one expired semantic (should archive → "expired"), one pinned-expired
 *  (must NOT), one core (must NOT). Each with a real .md so body preservation is
 *  observable. */
function seed() {
  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], trust: "trusted" as const, originDevice: null,
    accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
  };
  const entries = {
    "semantic/p/exp": { id: "semantic/p/exp", type: "semantic", scope: "project:p", project: "p",
      title: "Expired fact", summary: "s", path: "memory/semantic/p/exp.md", status: "active",
      validTo: "2000-01-01", ...base },
    "semantic/p/pin": { id: "semantic/p/pin", type: "semantic", scope: "project:p", project: "p",
      title: "Pinned fact", summary: "s", path: "memory/semantic/p/pin.md", status: "pinned",
      validTo: "2000-01-01", ...base },
    "core/g/rule": { id: "core/g/rule", type: "core", scope: "global", project: null,
      title: "Core rule", summary: "s", path: "memory/core/_global/rule.md", status: "active",
      validTo: null, ...base },
  };
  writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
  const md = (title: string, id: string) =>
    `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# ${title}\n\nThe real body of ${id}.\n`;
  mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
  mkdirSync(join(repo, "memory/core/_global"), { recursive: true });
  writeFileSync(join(repo, "memory/semantic/p/exp.md"), md("Expired fact", "semantic/p/exp"));
  writeFileSync(join(repo, "memory/semantic/p/pin.md"), md("Pinned fact", "semantic/p/pin"));
  writeFileSync(join(repo, "memory/core/_global/rule.md"), md("Core rule", "core/g/rule"));
}

describe("memoryArchiveCmd", () => {
  it("dry-run lists plan, writes nothing; --apply archives + rewrites .md + index; core/pinned untouched; idempotent", async () => {
    seed();
    const idxBefore = readFileSync(idxPath(), "utf8");
    const expMdBefore = readFileSync(join(repo, "memory/semantic/p/exp.md"), "utf8");

    // --- dry-run: plan is listed, NOTHING is written ---
    await memoryArchiveCmd({ cwd: repo });
    expect(out.join("\n")).toContain("semantic/p/exp");        // the plan mentions the expired entry
    expect(readIndexStatus("semantic/p/exp")).toBe("active");  // index untouched
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);   // byte-identical index
    expect(readFileSync(join(repo, "memory/semantic/p/exp.md"), "utf8")).toBe(expMdBefore); // .md untouched

    // --- --apply: the expired entry flips to archived in BOTH the index and the .md ---
    out = [];
    await memoryArchiveCmd({ cwd: repo, apply: true });

    // index side
    expect(readIndexStatus("semantic/p/exp")).toBe("archived");
    expect(readIndexReason("semantic/p/exp")).toBe("expired");
    // .md side — the LANDMINE assertion: status must be "archived", NOT coerced back to "active"
    expect(readMdField("semantic/p/exp.md", "status")).toBe("archived");
    expect(readMdField("semantic/p/exp.md", "archivedReason")).toBe("expired");
    expect(readMdField("semantic/p/exp.md", "archivedAt")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // body preserved through the rewrite
    expect(readFileSync(join(repo, "memory/semantic/p/exp.md"), "utf8")).toContain("The real body of semantic/p/exp.");

    // pinned + core stay put (index and .md)
    expect(readIndexStatus("semantic/p/pin")).toBe("pinned");
    expect(readIndexStatus("core/g/rule")).toBe("active");
    expect(readMdField("semantic/p/pin.md", "status")).toBe("active"); // .md never rewritten
    expect(readMdField("core/_global/rule.md", "status")).toBe("active");

    // --- idempotent: a second --apply archives nothing and leaves the index identical ---
    const idxAfter = readIndex();
    out = [];
    await memoryArchiveCmd({ cwd: repo, apply: true });
    expect(readIndex()).toEqual(idxAfter);
    expect(out.join("\n")).not.toContain("semantic/p/exp"); // nothing newly planned
  });

  it("--json dry-run emits the structured plan without writing", async () => {
    seed();
    const idxBefore = readFileSync(idxPath(), "utf8");
    await memoryArchiveCmd({ cwd: repo, json: true });
    const payload = JSON.parse(out.join(""));
    expect(Array.isArray(payload.archive)).toBe(true);
    expect(payload.archive.some((a: { id: string; reason: string }) => a.id === "semantic/p/exp" && a.reason === "expired")).toBe(true);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore); // no write
  });

  it("--apply preflights the WHOLE plan: one invalid target aborts before ANY .md is rewritten", async () => {
    // Two expired entries land in the plan: one perfectly valid, one whose
    // canonical path runs through a SYMLINKED directory component, so
    // assertWritableMemoryTarget throws. With an order-aware whole-plan preflight,
    // the throw must happen BEFORE the first write — so the valid entry's .md and
    // the index stay untouched.
    //
    // Round-22 note: this used to use a row with `project: ".."`. That row-SHAPE
    // defect is now caught by the rewrite gate and SKIPPED (a corrupt index row
    // must not crash the unattended digest run — see the round-22 describe below),
    // so it no longer reaches the preflight. A symlinked component is a
    // FILESYSTEM condition no row-shape predicate can see, so it still exercises
    // the all-or-nothing discipline this test exists to lock.
    const base = {
      confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "trusted", originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const entries = {
      "semantic/p/good": { id: "semantic/p/good", type: "semantic", scope: "project:p", project: "p",
        title: "Good expired", summary: "s", path: "memory/semantic/p/good.md", status: "active",
        validTo: "2000-01-01", ...base },
      "semantic/sym/bad": { id: "semantic/sym/bad", type: "semantic", scope: "project:sym", project: "sym",
        title: "Bad path", summary: "s", path: "", status: "active",
        validTo: "2000-01-01", ...base },
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const goodMd = "---\nid: semantic/p/good\ntype: semantic\nstatus: active\n---\n\n# Good expired\n\nThe real body.\n";
    writeFileSync(join(repo, "memory/semantic/p/good.md"), goodMd);
    // memory/semantic/sym is a SYMLINK to a directory elsewhere in the sandbox
    const elsewhere = join(home, "elsewhere");
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(join(elsewhere, "bad.md"),
      "---\nid: semantic/sym/bad\ntype: semantic\nstatus: active\n---\n\n# Bad path\n\nbody\n");
    symlinkSync(elsewhere, join(repo, "memory/semantic/sym"));
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).rejects.toThrow(/unsafe|symlink|outside memory/i);

    // all-or-nothing: the valid entry's .md was NOT rewritten and the index is intact
    expect(readFileSync(join(repo, "memory/semantic/p/good.md"), "utf8")).toBe(goodMd);
    expect(readMdField("semantic/p/good.md", "status")).toBe("active"); // never flipped to archived
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
  });

  it("--apply aborts (writes nothing) when a planned entry's .md is MISSING — strict body recovery, all-or-nothing", async () => {
    // A metadata-only archive rewrite re-renders frontmatter + the RECOVERED body.
    // If the entry's .md is gone (store corruption), the body can't be recovered,
    // so the strict reader must THROW during the whole-plan preflight — before any
    // write — rather than clobber the entry with a bodyless document. The index
    // stays untouched and no bodyless .md is created.
    const base = {
      confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "trusted", originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const entries = {
      "semantic/p/gone": { id: "semantic/p/gone", type: "semantic", scope: "project:p", project: "p",
        title: "Missing md", summary: "s", path: "memory/semantic/p/gone.md", status: "active",
        validTo: "2000-01-01", ...base },
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    // deliberately do NOT create memory/semantic/p/gone.md
    const idxBefore = readFileSync(idxPath(), "utf8");

    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).rejects.toThrow(/missing or unreadable|cannot recover body/i);

    // all-or-nothing: index byte-identical, entry still active, no bodyless .md written
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);
    expect(readIndexStatus("semantic/p/gone")).toBe("active");
    expect(existsSync(join(repo, "memory/semantic/p/gone.md"))).toBe(false);
  });

  it("tolerates parseable-but-malformed index rows (null / non-object / partial object) — auto digest consolidation can't be crashed", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    seed();
    const idx = readIndex();
    idx.entries["semantic/p/nul"] = null;              // null row (dropped by safeValues)
    idx.entries["semantic/p/str"] = "not-an-object";   // wrong-typed row (dropped by safeValues)
    // OBJECT row missing `type` — passes safeValues (it IS an object) and the
    // superseded-cleanup rule would select it, but canonicalMemoryPath throws on
    // the missing type. isPlannableEntry must reject it BEFORE it can crash the
    // digest, and count it among the skipped malformed rows.
    idx.entries["semantic/p/bad"] = { id: "semantic/p/bad", status: "superseded" };
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    // must NOT throw; all three malformed rows are skipped; the good expired entry still archives
    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();
    expect(readIndexStatus("semantic/p/exp")).toBe("archived");
    // the partial object was skipped, not processed — its row is left untouched (no archive stamp)
    expect(readIndex().entries["semantic/p/bad"]).toEqual({ id: "semantic/p/bad", status: "superseded" });
    // all three malformed rows (null + string + partial object) are counted in the skip warning
    expect(warnings.join("\n")).toMatch(/skipped 3 malformed index row\(s\)/);
  });

  it("skips an index row missing the fields the .md rewrite needs (title/scope) — no `undefined` is ever serialized", async () => {
    // Round-15: the shared row-shape predicate now also requires the fields the
    // metadata-only REWRITE needs (title/scope), not just the ones the plan +
    // canonical-path derivation need. Without them the renderer emits the literal
    // `title: undefined` / `scope: undefined` (and a `# undefined` heading),
    // degrading the record it was only supposed to stamp `archived` on.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    seed();
    const idx = readIndex();
    // Both rows are otherwise perfectly archivable (expired rule: past validTo).
    idx.entries["semantic/p/notitle"] = { ...idx.entries["semantic/p/exp"], id: "semantic/p/notitle", path: "memory/semantic/p/notitle.md" };
    delete idx.entries["semantic/p/notitle"].title;
    idx.entries["semantic/p/noscope"] = { ...idx.entries["semantic/p/exp"], id: "semantic/p/noscope", path: "memory/semantic/p/noscope.md" };
    delete idx.entries["semantic/p/noscope"].scope;
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    const partialMd = (id: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# Partial row\n\nThe real body of ${id}.\n`;
    writeFileSync(join(repo, "memory/semantic/p/notitle.md"), partialMd("semantic/p/notitle"));
    writeFileSync(join(repo, "memory/semantic/p/noscope.md"), partialMd("semantic/p/noscope"));

    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();

    // the healthy expired entry still archives — the skip is surgical
    expect(readIndexStatus("semantic/p/exp")).toBe("archived");
    // the two partial rows were skipped: index rows untouched, .md never rewritten
    expect(readIndexStatus("semantic/p/notitle")).toBe("active");
    expect(readIndexStatus("semantic/p/noscope")).toBe("active");
    expect(readFileSync(join(repo, "memory/semantic/p/notitle.md"), "utf8")).toBe(partialMd("semantic/p/notitle"));
    expect(readFileSync(join(repo, "memory/semantic/p/noscope.md"), "utf8")).toBe(partialMd("semantic/p/noscope"));
    expect(warnings.join("\n")).toMatch(/skipped 2 malformed index row\(s\)/);
  });

  it("drops an index row whose KEY disagrees with its own id — the named VICTIM record is never planned or clobbered", async () => {
    // Round-12: the malformed-row filter validated the ROW's fields but never that
    // the row's index KEY equalled `row.id`. planArchival plans by `row.id`, the
    // apply loop then resolves `idx.entries[id]` — so a row filed under key `bad`
    // carrying `id: "semantic/p/victim"` planned, and then archived + rewrote, the
    // UNRELATED healthy `semantic/p/victim`. The round-6 identity guard cannot
    // catch it: writeMemoryEntryFile derives the canonical path from `entry.id`,
    // so the victim's own .md (which really does carry the victim's id) is
    // accepted and clobbered. The key/id-mismatched row must be dropped up front
    // and counted among the skipped malformed rows.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    seed();
    const idx = readIndex();
    const victim = {
      id: "semantic/p/victim", type: "semantic", scope: "project:p", project: "p",
      title: "Deploy pipeline uses a staged rollout", summary: "unrelated healthy record",
      path: "memory/semantic/p/victim.md", status: "active", validTo: null,
      confidence: 1, importance: 5, createdAt: "2026-01-01", updatedAt: "2026-06-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "trusted", originDevice: null,
      accessCount: 3, lastAccess: "2026-06-01", archivedAt: null, archivedReason: null,
    };
    // A healthy, NON-archivable active entry (importance 5 keeps it out of the
    // unused-low-value rule regardless of when this test runs) with its own .md.
    idx.entries["semantic/p/victim"] = victim;
    // The poison row: well-formed enough to pass isPlannableEntry AND selected by
    // the superseded-cleanup rule, but filed under a key that is NOT its id.
    idx.entries["bad"] = {
      id: "semantic/p/victim", type: "semantic", scope: "project:p", project: "p",
      title: "Poison row", summary: "filed under the wrong key",
      path: "memory/semantic/p/bad.md", status: "superseded", validTo: null,
      confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "trusted", originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const badRowBefore = JSON.parse(JSON.stringify(idx.entries["bad"]));
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    writeFileSync(join(repo, "memory/semantic/p/victim.md"),
      `---\nid: semantic/p/victim\ntype: semantic\nstatus: active\n---\n\n# Deploy pipeline uses a staged rollout\n\nThe real body of semantic/p/victim.\n`);
    const victimMdBefore = readFileSync(join(repo, "memory/semantic/p/victim.md"), "utf8");

    // must NOT throw, and the good expired entry still archives
    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();
    expect(readIndexStatus("semantic/p/exp")).toBe("archived");

    // THE LANDMINE: the victim the poison row named is byte-identical on disk and in the index
    expect(readFileSync(join(repo, "memory/semantic/p/victim.md"), "utf8")).toBe(victimMdBefore);
    expect(readIndex().entries["semantic/p/victim"]).toEqual(victim);
    expect(readIndexStatus("semantic/p/victim")).toBe("active");
    // the mismatched row is skipped AND counted
    expect(warnings.join("\n")).toMatch(/skipped 1 malformed index row\(s\)/);
    // the poison row itself is untouched (never stamped)
    expect(readIndex().entries["bad"]).toEqual(badRowBefore);
  });

  it("does NOT archive an id whose newer ACTIVE copy is the overlay winner, but still archives a purely-local stale id", async () => {
    // Seed a stale-locally entry `sib` that ALSO has a NEWER active copy on a
    // sibling device (the aggregated overlay). resolveMemoryView resolves `sib`
    // to the overlay (strictly newer updatedAt), so archiving the local stale
    // copy — and stamping today's updatedAt — would let latest-wins clobber the
    // sibling's newer edit on the next merge. It must be skipped. A purely-local
    // stale id (`exp`, no overlay copy) must still archive.
    const base = {
      confidence: 1, importance: 1, createdAt: "2026-01-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "trusted" as const, originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const localEntries = {
      // purely-local, expired → should archive
      "semantic/p/exp": { id: "semantic/p/exp", type: "semantic", scope: "project:p", project: "p",
        title: "Expired fact", summary: "s", path: "memory/semantic/p/exp.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-01-01", ...base },
      // stale locally (expired), but overlay holds a NEWER active copy → must NOT archive
      "semantic/p/sib": { id: "semantic/p/sib", type: "semantic", scope: "project:p", project: "p",
        title: "Sibling fact", summary: "s", path: "memory/semantic/p/sib.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-01-01", ...base },
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries: localEntries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const md = (title: string, id: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# ${title}\n\nThe real body of ${id}.\n`;
    writeFileSync(join(repo, "memory/semantic/p/exp.md"), md("Expired fact", "semantic/p/exp"));
    writeFileSync(join(repo, "memory/semantic/p/sib.md"), md("Sibling fact", "semantic/p/sib"));

    // Aggregated overlay: a NEWER active copy of `sib` only (updatedAt strictly newer).
    const overlayRoot = join(home, ".memarium", "aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    const overlayEntries = {
      "semantic/p/sib": { id: "semantic/p/sib", type: "semantic", scope: "project:p", project: "p",
        title: "Sibling fact (newer)", summary: "s", path: "memory/semantic/p/sib.md", status: "active",
        validTo: null, updatedAt: "2026-07-01", ...base },
    };
    writeFileSync(join(overlayRoot, ".memarium", "index.memory.json"),
      JSON.stringify({ version: 1, entries: overlayEntries }, null, 2) + "\n");

    await memoryArchiveCmd({ cwd: repo, apply: true });

    // purely-local stale id archived; overlay-winner id left ACTIVE (not clobbered)
    expect(readIndexStatus("semantic/p/exp")).toBe("archived");
    expect(readIndexStatus("semantic/p/sib")).toBe("active");
    expect(readMdField("semantic/p/sib.md", "status")).toBe("active"); // .md never rewritten
  });

  it("skips a SAME-DAY (updatedAt-equal) cross-device conflict, but still archives one with an OLDER overlay copy", async () => {
    // updatedAt is day-granular and resolveMemoryView resolves equal-timestamp ties
    // to "local" — so a local stale row + a sibling's SAME-DAY differing edit tie and
    // would be archived, then our archive stamps another day-only timestamp that can
    // win the next merge by traversal order, clobbering the sibling. So an overlay
    // copy whose updatedAt is >= the local copy's (same-day OR newer) is a conflict
    // and must be skipped. An overlay copy that is strictly OLDER still archives.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    const base = {
      confidence: 1, importance: 1, createdAt: "2026-01-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], trust: "trusted" as const, originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const localEntries = {
      // local stale (expired), overlay holds a SAME-DAY differing copy → conflict → skip
      "semantic/p/tie": { id: "semantic/p/tie", type: "semantic", scope: "project:p", project: "p",
        title: "Tie fact", summary: "s", path: "memory/semantic/p/tie.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-05-05", ...base },
      // local stale (expired), overlay holds an OLDER copy → local is authoritative → archive
      "semantic/p/old": { id: "semantic/p/old", type: "semantic", scope: "project:p", project: "p",
        title: "Old-overlay fact", summary: "s", path: "memory/semantic/p/old.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-05-05", ...base },
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries: localEntries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const md = (title: string, id: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# ${title}\n\nThe real body of ${id}.\n`;
    writeFileSync(join(repo, "memory/semantic/p/tie.md"), md("Tie fact", "semantic/p/tie"));
    writeFileSync(join(repo, "memory/semantic/p/old.md"), md("Old-overlay fact", "semantic/p/old"));

    const overlayRoot = join(home, ".memarium", "aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    const overlayEntries = {
      // SAME-DAY as local (equal updatedAt), but a differing (active, non-expired) edit
      "semantic/p/tie": { id: "semantic/p/tie", type: "semantic", scope: "project:p", project: "p",
        title: "Tie fact (sibling edit)", summary: "s", path: "memory/semantic/p/tie.md", status: "active",
        validTo: null, updatedAt: "2026-05-05", ...base },
      // strictly OLDER than local → local wins, so archiving the local copy is safe
      "semantic/p/old": { id: "semantic/p/old", type: "semantic", scope: "project:p", project: "p",
        title: "Old-overlay fact", summary: "s", path: "memory/semantic/p/old.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-01-01", ...base },
    };
    writeFileSync(join(overlayRoot, ".memarium", "index.memory.json"),
      JSON.stringify({ version: 1, entries: overlayEntries }, null, 2) + "\n");

    await memoryArchiveCmd({ cwd: repo, apply: true });

    // same-day conflict skipped (stays active); older-overlay id archived normally
    expect(readIndexStatus("semantic/p/tie")).toBe("active");
    expect(readMdField("semantic/p/tie.md", "status")).toBe("active"); // .md never rewritten
    expect(readIndexStatus("semantic/p/old")).toBe("archived");
    expect(warnings.join("\n")).toMatch(/skipped 1 id/); // the conflict was logged
  });

  it("archives an EQUIVALENT same-day synced copy (regression), but skips a DIVERGENT same-day and a strictly-NEWER overlay copy", async () => {
    // The overlay aggregates almost EVERY local id back — so at steady state most
    // local rows have an overlay copy at the SAME updatedAt with IDENTICAL content.
    // A raw `updatedAt >=` guard would skip all of those, breaking archival for a
    // synced user. The corrected rule: an equal-timestamp overlay copy blocks
    // archival ONLY when it substantively DIVERGES (a same-day sibling edit we
    // could clobber). An equivalent synced copy is archivable; provenance-only
    // differences (path/originDevice/sourceSessions) are NOT divergence.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    const base = {
      confidence: 1, importance: 1, createdAt: "2026-01-01",
      validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [] as string[], trust: "trusted" as const, originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const localEntries = {
      // overlay copy is an EQUIVALENT synced copy at the SAME updatedAt → ARCHIVE (regression case)
      "semantic/p/eqv": { id: "semantic/p/eqv", type: "semantic", scope: "project:p", project: "p",
        title: "Eqv fact", summary: "s", path: "memory/semantic/p/eqv.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-05-05", ...base },
      // overlay copy is SAME updatedAt but DIVERGES (different status) → SKIP
      "semantic/p/div": { id: "semantic/p/div", type: "semantic", scope: "project:p", project: "p",
        title: "Div fact", summary: "s", path: "memory/semantic/p/div.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-05-05", ...base },
      // overlay copy is strictly NEWER → SKIP
      "semantic/p/new": { id: "semantic/p/new", type: "semantic", scope: "project:p", project: "p",
        title: "New fact", summary: "s", path: "memory/semantic/p/new.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-05-05", ...base },
      // overlay copy is strictly OLDER → local authoritative → ARCHIVE
      "semantic/p/old": { id: "semantic/p/old", type: "semantic", scope: "project:p", project: "p",
        title: "Old fact", summary: "s", path: "memory/semantic/p/old.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-05-05", ...base },
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries: localEntries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const md = (title: string, id: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# ${title}\n\nThe real body of ${id}.\n`;
    for (const id of ["eqv", "div", "new", "old"])
      writeFileSync(join(repo, `memory/semantic/p/${id}.md`), md(id, `semantic/p/${id}`));

    const overlayRoot = join(home, ".memarium", "aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    const overlayEntries = {
      // EQUIVALENT content at SAME updatedAt — differs ONLY in provenance
      // (path/originDevice/sourceSessions), which must NOT count as divergence.
      "semantic/p/eqv": { id: "semantic/p/eqv", type: "semantic", scope: "project:p", project: "p",
        title: "Eqv fact", summary: "s", path: "memory/semantic/p/eqv-aggregated.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-05-05",
        ...base, sourceSessions: ["s1", "s2"], originDevice: "other-device" },
      // SAME updatedAt but a genuinely different status → divergent → conflict
      "semantic/p/div": { id: "semantic/p/div", type: "semantic", scope: "project:p", project: "p",
        title: "Div fact", summary: "s", path: "memory/semantic/p/div.md", status: "pinned",
        validTo: "2000-01-01", updatedAt: "2026-05-05", ...base },
      // strictly NEWER → conflict
      "semantic/p/new": { id: "semantic/p/new", type: "semantic", scope: "project:p", project: "p",
        title: "New fact (sibling)", summary: "s", path: "memory/semantic/p/new.md", status: "active",
        validTo: null, updatedAt: "2026-07-01", ...base },
      // strictly OLDER → local authoritative
      "semantic/p/old": { id: "semantic/p/old", type: "semantic", scope: "project:p", project: "p",
        title: "Old fact", summary: "s", path: "memory/semantic/p/old.md", status: "active",
        validTo: "2000-01-01", updatedAt: "2026-01-01", ...base },
    };
    writeFileSync(join(overlayRoot, ".memarium", "index.memory.json"),
      JSON.stringify({ version: 1, entries: overlayEntries }, null, 2) + "\n");
    // The `eqv` overlay copy must have an IDENTICAL BODY at its CANONICAL overlay
    // path (the conflict check now also compares the .md body, not just metadata),
    // so an equivalent synced copy is still archivable. Body matches local eqv.
    mkdirSync(join(overlayRoot, "memory/semantic/p"), { recursive: true });
    writeFileSync(join(overlayRoot, "memory/semantic/p/eqv.md"), md("Eqv fact", "semantic/p/eqv"));

    await memoryArchiveCmd({ cwd: repo, apply: true });
    expect(readIndexStatus("semantic/p/eqv")).toBe("archived");
    expect(readMdField("semantic/p/eqv.md", "status")).toBe("archived");
    // older-overlay id archived normally
    expect(readIndexStatus("semantic/p/old")).toBe("archived");
    // divergent same-day + strictly-newer both skipped (stay active, .md untouched)
    expect(readIndexStatus("semantic/p/div")).toBe("active");
    expect(readMdField("semantic/p/div.md", "status")).toBe("active");
    expect(readIndexStatus("semantic/p/new")).toBe("active");
    expect(readMdField("semantic/p/new.md", "status")).toBe("active");
    expect(warnings.join("\n")).toMatch(/skipped 2 id/); // div + new
  });

  it("skips a same-day overlay copy that differs ONLY in the BODY, or only in trust/validFrom/project", async () => {
    // Round-8: a sibling edit that changes ONLY the Markdown body — or only a
    // field the old metadata comparison omitted (trust / validFrom / project) —
    // used to be misread as an equivalent synced copy and archived, clobbering
    // the sibling's edit on the next merge. All of these must now be SKIPPED.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    const base = {
      confidence: 1, importance: 1, createdAt: "2026-01-01",
      sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [] as string[], originDevice: null,
      accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
    };
    const localEntries = {
      // identical metadata + same updatedAt, overlay .md body DIFFERS → SKIP
      "semantic/p/body": { id: "semantic/p/body", type: "semantic", scope: "project:p", project: "p",
        title: "Body fact", summary: "s", path: "memory/semantic/p/body.md", status: "active",
        validTo: "2000-01-01", validFrom: null, trust: "trusted" as const, updatedAt: "2026-05-05", ...base },
      // overlay copy differs ONLY in trust → SKIP
      "semantic/p/trust": { id: "semantic/p/trust", type: "semantic", scope: "project:p", project: "p",
        title: "Trust fact", summary: "s", path: "memory/semantic/p/trust.md", status: "active",
        validTo: "2000-01-01", validFrom: null, trust: "trusted" as const, updatedAt: "2026-05-05", ...base },
      // overlay copy differs ONLY in validFrom → SKIP
      "semantic/p/vf": { id: "semantic/p/vf", type: "semantic", scope: "project:p", project: "p",
        title: "ValidFrom fact", summary: "s", path: "memory/semantic/p/vf.md", status: "active",
        validTo: "2000-01-01", validFrom: "2026-01-01", trust: "trusted" as const, updatedAt: "2026-05-05", ...base },
      // equivalent (metadata + body identical) at same updatedAt → ARCHIVE (control)
      "semantic/p/eqv": { id: "semantic/p/eqv", type: "semantic", scope: "project:p", project: "p",
        title: "Eqv fact", summary: "s", path: "memory/semantic/p/eqv.md", status: "active",
        validTo: "2000-01-01", validFrom: null, trust: "trusted" as const, updatedAt: "2026-05-05", ...base },
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries: localEntries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const mdBody = (id: string, body: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# ${id}\n\n${body}\n`;
    for (const id of ["body", "trust", "vf", "eqv"])
      writeFileSync(join(repo, `memory/semantic/p/${id}.md`), mdBody(`semantic/p/${id}`, `Local body of ${id}.`));

    const overlayRoot = join(home, ".memarium", "aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    const overlayEntries = {
      // identical metadata, same updatedAt — only the .md body differs
      "semantic/p/body": { ...localEntries["semantic/p/body"], title: "Body fact" },
      // only trust differs
      "semantic/p/trust": { ...localEntries["semantic/p/trust"], trust: "untrusted" as const },
      // only validFrom differs
      "semantic/p/vf": { ...localEntries["semantic/p/vf"], validFrom: "2025-01-01" },
      // fully equivalent (metadata + body) → archivable
      "semantic/p/eqv": { ...localEntries["semantic/p/eqv"] },
    };
    writeFileSync(join(overlayRoot, ".memarium", "index.memory.json"),
      JSON.stringify({ version: 1, entries: overlayEntries }, null, 2) + "\n");
    mkdirSync(join(overlayRoot, "memory/semantic/p"), { recursive: true });
    // body case: overlay .md body DIFFERS from local; trust/vf/eqv: identical body
    writeFileSync(join(overlayRoot, "memory/semantic/p/body.md"), mdBody("semantic/p/body", "SIBLING body of body."));
    for (const id of ["trust", "vf", "eqv"])
      writeFileSync(join(overlayRoot, `memory/semantic/p/${id}.md`), mdBody(`semantic/p/${id}`, `Local body of ${id}.`));

    await memoryArchiveCmd({ cwd: repo, apply: true });

    // body-only, trust-only, validFrom-only divergences are all SKIPPED (stay active)
    expect(readIndexStatus("semantic/p/body")).toBe("active");
    expect(readIndexStatus("semantic/p/trust")).toBe("active");
    expect(readIndexStatus("semantic/p/vf")).toBe("active");
    // the fully-equivalent control still archives
    expect(readIndexStatus("semantic/p/eqv")).toBe("archived");
    expect(warnings.join("\n")).toMatch(/skipped 3 id/); // body + trust + vf
  });
});

describe("memoryArchiveCmd — round-16 fail-closed guards", () => {
  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [] as string[], trust: "trusted" as const, originDevice: null,
    accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
  };
  /** An expired (therefore archivable) semantic row + its .md. */
  const expired = (slug: string, over: Record<string, unknown> = {}) => ({
    id: `semantic/p/${slug}`, type: "semantic", scope: "project:p", project: "p",
    title: `${slug} fact`, summary: "s", path: `memory/semantic/p/${slug}.md`, status: "active",
    validTo: "2000-01-01", ...base, ...over,
  });
  const md = (slug: string) =>
    `---\nid: semantic/p/${slug}\ntype: semantic\nstatus: active\n---\n\n# ${slug} fact\n\nThe real body of semantic/p/${slug}.\n`;
  function writeLocal(entries: Record<string, unknown>) {
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    for (const key of Object.keys(entries)) {
      const slug = key.split("/").pop()!;
      writeFileSync(join(repo, `memory/semantic/p/${slug}.md`), md(slug));
    }
  }
  const overlayRoot = () => join(home, ".memarium", "aggregated");
  function writeOverlayRaw(raw: string) {
    mkdirSync(join(overlayRoot(), ".memarium"), { recursive: true });
    writeFileSync(join(overlayRoot(), ".memarium", "index.memory.json"), raw);
  }

  it("skips (and counts) a row whose COLLECTION field is not an array — the automatic run never throws", async () => {
    // A superseded/expired row carrying `sourceSessions: "s1"` (a STRING) used to
    // pass the scalar-only rewrite gate, get planned, and then crash
    // renderMemoryMarkdown's `.join()` — inside the AUTOMATIC digest consolidation.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    writeLocal({
      "semantic/p/good": expired("good"),
      "semantic/p/badcoll": expired("badcoll", { sourceSessions: "s1" }),   // string, not array
      "semantic/p/badents": expired("badents", { entities: { a: 1 } }),      // object, not array
    });
    const badcollMd = readFileSync(join(repo, "memory/semantic/p/badcoll.md"), "utf8");

    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();

    expect(readIndexStatus("semantic/p/good")).toBe("archived");      // healthy row still archives
    expect(readIndexStatus("semantic/p/badcoll")).toBe("active");     // malformed rows skipped
    expect(readIndexStatus("semantic/p/badents")).toBe("active");
    expect(readFileSync(join(repo, "memory/semantic/p/badcoll.md"), "utf8")).toBe(badcollMd); // .md untouched
    expect(warnings.join("\n")).toMatch(/skipped 2 malformed index row\(s\)/);
  });

  it("skips an id whose overlay row EXISTS but cannot be compared (non-object, or no updatedAt)", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    writeLocal({
      "semantic/p/ovbad": expired("ovbad"),
      "semantic/p/ovnoupd": expired("ovnoupd"),
      "semantic/p/ovnone": expired("ovnone"),   // genuinely no overlay row → archivable
    });
    const noUpd: Record<string, unknown> = { ...expired("ovnoupd"), title: "sibling edit" };
    delete noUpd.updatedAt;
    writeOverlayRaw(JSON.stringify({
      version: 1,
      entries: {
        "semantic/p/ovbad": "not-an-object",   // present but unusable
        "semantic/p/ovnoupd": noUpd,           // present but not comparable (no updatedAt)
      },
    }, null, 2) + "\n");

    await memoryArchiveCmd({ cwd: repo, apply: true });

    expect(readIndexStatus("semantic/p/ovbad")).toBe("active");
    expect(readMdField("semantic/p/ovbad.md", "status")).toBe("active");
    expect(readIndexStatus("semantic/p/ovnoupd")).toBe("active");
    expect(readIndexStatus("semantic/p/ovnone")).toBe("archived"); // absent overlay row still archives
    expect(warnings.join("\n")).toMatch(/skipped 2 id\(s\) in a cross-device conflict/);
  });

  it("archives NOTHING and warns when the overlay index EXISTS but is corrupt (guard must not fail open)", async () => {
    // loadMemoryIndex turns a corrupt index into an EMPTY one — fine for read
    // paths, catastrophic here: every local candidate would look overlay-absent,
    // so the whole store becomes archivable/restampable and can clobber sibling
    // state wholesale on the next merge.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    writeLocal({ "semantic/p/a": expired("a"), "semantic/p/b": expired("b") });
    writeOverlayRaw("{ this is not valid json");
    const idxBefore = readFileSync(idxPath(), "utf8");
    const aMd = readFileSync(join(repo, "memory/semantic/p/a.md"), "utf8");

    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();

    expect(warnings.join("\n")).toMatch(/overlay index unreadable — skipping archival this run/);
    expect(readFileSync(idxPath(), "utf8")).toBe(idxBefore);   // index byte-identical
    expect(readFileSync(join(repo, "memory/semantic/p/a.md"), "utf8")).toBe(aMd);
    expect(readIndexStatus("semantic/p/a")).toBe("active");
    expect(readIndexStatus("semantic/p/b")).toBe("active");
    expect(out.join("\n")).toContain("archived 0");
  });

  it("also refuses when the overlay index parses but is not a v1 entries map", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    writeLocal({ "semantic/p/a": expired("a") });
    writeOverlayRaw(JSON.stringify({ version: 1, entries: ["not", "a", "map"] }) + "\n");

    await memoryArchiveCmd({ cwd: repo, apply: true });

    expect(warnings.join("\n")).toMatch(/overlay index unreadable/);
    expect(readIndexStatus("semantic/p/a")).toBe("active");
  });

  it("proceeds normally when the overlay directory exists but holds NO index file (genuinely absent)", async () => {
    writeLocal({ "semantic/p/a": expired("a") });
    mkdirSync(join(overlayRoot(), ".memarium"), { recursive: true }); // dir, no index file
    await memoryArchiveCmd({ cwd: repo, apply: true });
    expect(readIndexStatus("semantic/p/a")).toBe("archived");
  });

  describe("round-17: an UNCOMPARABLE overlay row is SKIPPED, never thrown", () => {
    it("skips an overlay row with a malformed collection field instead of aborting the unattended run", async () => {
      // Round-16 promised isOverlayConflict FAILS CLOSED, but the metadata
      // comparison spread `entities` unconditionally — so an overlay row that is
      // otherwise IDENTICAL to the local one but carries `entities: {}` threw
      // "is not iterable". That throw escaped and ABORTED `memory-archive
      // --apply`, which digest runs automatically with no human in the loop.
      const warnings: string[] = [];
      vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
      writeLocal({
        "semantic/p/ovents": expired("ovents"),
        "semantic/p/ovsrc": expired("ovsrc"),
        "semantic/p/ovnone": expired("ovnone"),   // no overlay row → still archivable
      });
      const ovEntsMd = readFileSync(join(repo, "memory/semantic/p/ovents.md"), "utf8");
      writeOverlayRaw(JSON.stringify({
        version: 1,
        entries: {
          // byte-for-byte the local row EXCEPT a non-array `entities` — every
          // scalar matches, so the comparison reaches the collection compare.
          "semantic/p/ovents": { ...expired("ovents"), entities: {} },
          // the shape the finding names literally: a partial row whose only
          // collection field is a bare string.
          "semantic/p/ovsrc": { updatedAt: "2026-01-01", sourceSessions: "s1" },
        },
      }, null, 2) + "\n");

      await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined(); // no exception escapes

      expect(readIndexStatus("semantic/p/ovents")).toBe("active");   // skipped, not archived
      expect(readIndexStatus("semantic/p/ovsrc")).toBe("active");    // skipped, not archived
      expect(readFileSync(join(repo, "memory/semantic/p/ovents.md"), "utf8")).toBe(ovEntsMd); // .md untouched
      expect(readIndexStatus("semantic/p/ovnone")).toBe("archived"); // healthy id still archives
      expect(warnings.join("\n")).toMatch(/skipped 2 id\(s\) in a cross-device conflict/);
    });
  });

  describe("round-21: an overlay row whose `id` disagrees with its key is a CONFLICT", () => {
    it("skips an id whose overlay row is identical EXCEPT for a different `id`", async () => {
      // The overlay index is filed by MAP KEY and no loader checks the key
      // against the row's own `id`, so the row fetched under the local key can
      // name a DIFFERENT record. Pre-fix `sameMemoryContent` omitted `id`, so
      // this compared as "an already-synced copy" — and archival then wrote a
      // .md path derived from `entry.id`, i.e. against a record it never
      // compared. Discriminating fixture: the overlay tree also holds the .md
      // the FOREIGN id derives, with the same body, so the body check answers
      // "equivalent" too and only the id comparison can flip this to a skip.
      const warnings: string[] = [];
      vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
      writeLocal({
        "semantic/p/idmix": expired("idmix"),   // overlay row carries a foreign id → SKIP
        "semantic/p/idsame": expired("idsame"), // overlay row agrees on id + body → ARCHIVE (control)
      });
      const idmixMd = readFileSync(join(repo, "memory/semantic/p/idmix.md"), "utf8");
      writeOverlayRaw(JSON.stringify({
        version: 1,
        entries: {
          // every compared field matches the local row; only `id` differs
          "semantic/p/idmix": { ...expired("idmix"), id: "semantic/p/victim" },
          "semantic/p/idsame": { ...expired("idsame") },
        },
      }, null, 2) + "\n");
      mkdirSync(join(overlayRoot(), "memory/semantic/p"), { recursive: true });
      writeFileSync(join(overlayRoot(), "memory/semantic/p/victim.md"), md("idmix"));
      writeFileSync(join(overlayRoot(), "memory/semantic/p/idsame.md"), md("idsame"));

      await memoryArchiveCmd({ cwd: repo, apply: true });

      expect(readIndexStatus("semantic/p/idmix")).toBe("active");     // skipped, not archived
      expect(readFileSync(join(repo, "memory/semantic/p/idmix.md"), "utf8")).toBe(idmixMd); // .md untouched
      expect(readIndexStatus("semantic/p/idsame")).toBe("archived");  // equivalent copy still archives
      expect(warnings.join("\n")).toMatch(/skipped 1 id\(s\) in a cross-device conflict/);
    });
  });
});

describe("memoryArchiveCmd — round-22: a row whose CANONICAL PATH cannot be derived", () => {
  // Round-22: the row-shape gate checked that `id` and `project` were NON-EMPTY
  // STRINGS — not that the path DERIVED from them is valid. A row with
  // `project: "../x"`, or an `id` whose slug segment is "..", passed the gate,
  // got PLANNED, and then threw out of `canonicalMemoryPath` inside
  // `assertMemoryBodyRecoverable`'s whole-plan preflight — aborting the entire
  // AUTOMATIC digest consolidation (no human in the loop). Same class as
  // round-16: such a row must be SKIPPED and COUNTED, never allowed to crash the
  // run.
  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [] as string[], trust: "trusted" as const, originDevice: null,
    accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
  };
  /** An expired (therefore archivable) semantic row. `key` is BOTH the index key
   *  and the row's `id`, so `validEntryExists` waves it through and only the
   *  canonical-path derivation can reject it. */
  const expired = (key: string, over: Record<string, unknown> = {}) => ({
    id: key, type: "semantic", scope: "project:p", project: "p",
    title: "a fact", summary: "s", path: "", status: "active",
    validTo: "2000-01-01", ...base, ...over,
  });
  const md = (id: string) =>
    `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# a fact\n\nThe real body of ${id}.\n`;

  it("skips (and counts) rows with an unsafe project / slug — the automatic run never throws, the healthy row still archives", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    const entries: Record<string, unknown> = {
      "semantic/p/good": expired("semantic/p/good", { path: "memory/semantic/p/good.md" }),
      // traversing project: canonicalMemoryPath throws on the project segment
      "semantic/p/badproj": expired("semantic/p/badproj", { project: "../x" }),
      // id whose FINAL segment is "..": canonicalMemoryPath throws on the slug
      "semantic/p/..": expired("semantic/p/.."),
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    writeFileSync(join(repo, "memory/semantic/p/good.md"), md("semantic/p/good"));
    const badProjBefore = JSON.parse(JSON.stringify(entries["semantic/p/badproj"]));
    const badSlugBefore = JSON.parse(JSON.stringify(entries["semantic/p/.."]));
    const goodMdBefore = readFileSync(join(repo, "memory/semantic/p/good.md"), "utf8");

    // THE LANDMINE: pre-fix this rejected with "memory path: unsafe project segment",
    // aborting the whole unattended consolidation run.
    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();

    // the healthy row still archives normally (index + .md both stamped)
    expect(readIndexStatus("semantic/p/good")).toBe("archived");
    expect(readMdField("semantic/p/good.md", "status")).toBe("archived");
    expect(readFileSync(join(repo, "memory/semantic/p/good.md"), "utf8")).not.toBe(goodMdBefore);
    // the malformed rows are untouched and counted
    expect(readIndex().entries["semantic/p/badproj"]).toEqual(badProjBefore);
    expect(readIndex().entries["semantic/p/.."]).toEqual(badSlugBefore);
    expect(warnings.join("\n")).toMatch(/skipped 2 malformed index row\(s\)/);
    // no stray file escaped memory/semantic/p/
    expect(existsSync(join(repo, "memory/semantic/x.md"))).toBe(false);
  });

  it("a legal project/slug with unusual-but-safe characters is unaffected (regression lock)", async () => {
    // The gate must reject only genuinely UNDERIVABLE rows — a dotted or
    // dashed-but-safe segment is still a normal, archivable memory.
    const entries: Record<string, unknown> = {
      "semantic/my.proj-1/a.b-c": expired("semantic/my.proj-1/a.b-c", {
        project: "my.proj-1", path: "memory/semantic/my.proj-1/a.b-c.md",
      }),
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/my.proj-1"), { recursive: true });
    writeFileSync(join(repo, "memory/semantic/my.proj-1/a.b-c.md"), md("semantic/my.proj-1/a.b-c"));

    await memoryArchiveCmd({ cwd: repo, apply: true });

    expect(readIndexStatus("semantic/my.proj-1/a.b-c")).toBe("archived");
    expect(readMdField("semantic/my.proj-1/a.b-c.md", "status")).toBe("archived");
  });
});

describe("memoryArchiveCmd — round-23: a row with a NON-FINITE `importance`", () => {
  // Round-23: the rewrite gate accepted a row whose `importance` was missing or
  // non-numeric, but planArchival's near-duplicate pass RANKS a pair by it:
  // `undefined !== 5` is true while `undefined < 5` is false, so the HEALTHY,
  // higher-importance entry came out as the LOSER and was ARCHIVED while the
  // malformed row stayed hot. Such a row must be SKIPPED + COUNTED before
  // planning, exactly like every other malformed-row class.
  const NEAR_DUP = { title: "declare list params as array", summary: "type array not string" };

  it("skips + counts the malformed near-duplicate rows and leaves the HEALTHY entry active", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    seed();
    const idx = readIndex();
    const base = {
      type: "semantic", scope: "project:p", project: "p", status: "active", validTo: null,
      confidence: 1, createdAt: "2026-01-01", updatedAt: "2026-06-01", validFrom: null,
      sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], trust: "trusted", originDevice: null, accessCount: 3,
      lastAccess: "2026-06-01", archivedAt: null, archivedReason: null, ...NEAR_DUP,
    };
    // The healthy record the bug demoted: importance 5 keeps it out of every
    // per-entry rule, so ONLY the near-duplicate pass could ever archive it.
    const healthy = { id: "semantic/p/healthy", path: "memory/semantic/p/healthy.md", importance: 5, ...base };
    idx.entries["semantic/p/healthy"] = healthy;
    // Two malformed near-duplicates of it: importance ABSENT, and importance NON-NUMERIC.
    const noImp = { id: "semantic/p/noimp", path: "memory/semantic/p/noimp.md", ...base } as Record<string, unknown>;
    const strImp = { id: "semantic/p/strimp", path: "memory/semantic/p/strimp.md", importance: "5", ...base };
    idx.entries["semantic/p/noimp"] = noImp;
    idx.entries["semantic/p/strimp"] = strImp;
    writeFileSync(idxPath(), JSON.stringify(idx, null, 2) + "\n");
    const md = (id: string) =>
      `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# declare list params as array\n\nThe real body of ${id}.\n`;
    for (const id of ["healthy", "noimp", "strimp"]) {
      writeFileSync(join(repo, `memory/semantic/p/${id}.md`), md(`semantic/p/${id}`));
    }
    const healthyMdBefore = readFileSync(join(repo, "memory/semantic/p/healthy.md"), "utf8");

    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();

    // THE LANDMINE: the healthy, higher-importance entry is untouched on both sides
    expect(readIndexStatus("semantic/p/healthy")).toBe("active");
    expect(readIndex().entries["semantic/p/healthy"]).toEqual(healthy);
    expect(readFileSync(join(repo, "memory/semantic/p/healthy.md"), "utf8")).toBe(healthyMdBefore);
    // the malformed rows are skipped, counted, and never stamped
    expect(warnings.join("\n")).toMatch(/skipped 2 malformed index row\(s\)/);
    expect(readIndexStatus("semantic/p/noimp")).toBe("active");
    expect(readIndexStatus("semantic/p/strimp")).toBe("active");
    expect(readIndex().entries["semantic/p/noimp"]).toEqual(noImp);
    expect(readIndex().entries["semantic/p/strimp"]).toEqual(strImp);
    // and the genuinely archivable entry still archives (the run is not derailed)
    expect(readIndexStatus("semantic/p/exp")).toBe("archived");
  });
});

describe("memoryArchiveCmd — round-27: a row whose `status` is not a MemoryEntry status", () => {
  // Round-27: the shared rewrite gate only asserted `typeof status === "string"`,
  // so a parseable-but-malformed row reading `status: "blocked"` passed and was
  // handed to planArchival — whose `archivable()` only excludes `pinned` and
  // `archived`. The unknown status therefore counted as ARCHIVABLE, and the
  // expired rule silently FLIPPED that corrupt row to `archived`, mutating a
  // record the fail-closed policy says must be SKIPPED and COUNTED.
  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [] as string[], trust: "trusted" as const, originDevice: null,
    accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
  };
  /** An EXPIRED (therefore rule-1-archivable) semantic row filed under its own id. */
  const expired = (key: string, over: Record<string, unknown> = {}) => ({
    id: key, type: "semantic", scope: "project:p", project: "p",
    title: "a fact", summary: "s", path: "", status: "active",
    validTo: "2000-01-01", ...base, ...over,
  });
  const md = (id: string) =>
    `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# a fact\n\nThe real body of ${id}.\n`;

  it("skips + counts an unknown / non-string status, never flipping it to archived; the valid entry still archives", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    const entries: Record<string, unknown> = {
      "semantic/p/good": expired("semantic/p/good", { path: "memory/semantic/p/good.md" }),
      // THE LANDMINE: a plausible-looking but invalid status. Expired ⇒ rule 1
      // would have archived it, because archivable() only rejects pinned/archived.
      "semantic/p/blocked": expired("semantic/p/blocked", { status: "blocked", path: "memory/semantic/p/blocked.md" }),
      // and a status that isn't even a string
      "semantic/p/numstat": expired("semantic/p/numstat", { status: 42, path: "memory/semantic/p/numstat.md" }),
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    for (const slug of ["good", "blocked", "numstat"]) {
      writeFileSync(join(repo, `memory/semantic/p/${slug}.md`), md(`semantic/p/${slug}`));
    }
    const blockedBefore = JSON.parse(JSON.stringify(entries["semantic/p/blocked"]));
    const numstatBefore = JSON.parse(JSON.stringify(entries["semantic/p/numstat"]));
    const blockedMdBefore = readFileSync(join(repo, "memory/semantic/p/blocked.md"), "utf8");
    const numstatMdBefore = readFileSync(join(repo, "memory/semantic/p/numstat.md"), "utf8");

    // the automatic (unattended) run must not throw
    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();

    // the malformed rows are untouched on BOTH sides and counted
    expect(readIndex().entries["semantic/p/blocked"]).toEqual(blockedBefore);
    expect(readIndex().entries["semantic/p/numstat"]).toEqual(numstatBefore);
    expect(readIndexStatus("semantic/p/blocked")).toBe("blocked");   // NOT flipped to archived
    expect(readIndex().entries["semantic/p/numstat"].status).toBe(42);
    expect(readFileSync(join(repo, "memory/semantic/p/blocked.md"), "utf8")).toBe(blockedMdBefore);
    expect(readFileSync(join(repo, "memory/semantic/p/numstat.md"), "utf8")).toBe(numstatMdBefore);
    expect(warnings.join("\n")).toMatch(/skipped 2 malformed index row\(s\)/);

    // the healthy row still archives normally (index + .md both stamped)
    expect(readIndexStatus("semantic/p/good")).toBe("archived");
    expect(readMdField("semantic/p/good.md", "status")).toBe("archived");
  });

  it("all four VALID statuses still pass the gate (regression lock)", async () => {
    // active/superseded stay archivable; pinned/archived are protected by
    // archivable() — none of them may be rejected as a malformed row.
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    const entries: Record<string, unknown> = {
      "semantic/p/act": expired("semantic/p/act", { title: "alpha rule", path: "memory/semantic/p/act.md" }),
      "semantic/p/sup": expired("semantic/p/sup", { title: "beta convention", status: "superseded", path: "memory/semantic/p/sup.md" }),
      "semantic/p/pin": expired("semantic/p/pin", { title: "gamma invariant", status: "pinned", path: "memory/semantic/p/pin.md" }),
      "semantic/p/arc": expired("semantic/p/arc", { title: "delta note", status: "archived", path: "memory/semantic/p/arc.md",
        archivedAt: "2026-05-01", archivedReason: "expired" }),
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    for (const slug of ["act", "sup", "pin", "arc"]) {
      writeFileSync(join(repo, `memory/semantic/p/${slug}.md`), md(`semantic/p/${slug}`));
    }

    await memoryArchiveCmd({ cwd: repo, apply: true });

    expect(warnings.join("\n")).not.toMatch(/malformed index row/); // none rejected by the gate
    expect(readIndexStatus("semantic/p/act")).toBe("archived");     // expired → archived
    expect(readIndexStatus("semantic/p/sup")).toBe("archived");     // superseded is archivable too
    expect(readIndexStatus("semantic/p/pin")).toBe("pinned");       // protected, not skipped-as-malformed
    expect(readIndexStatus("semantic/p/arc")).toBe("archived");     // idempotent
  });
});

describe("memoryArchiveCmd — round-32 (SECURITY): an id that FORGES frontmatter", () => {
  // Round-32: the rewrite gate validated only the id's FINAL SLUG SEGMENT, so a
  // KEY-CONSISTENT row whose id carried a NEWLINE in an earlier segment —
  // `semantic/p\nforged: value/safe` — passed, got PLANNED, and reached the
  // automatic rewrite path. `renderMemoryMarkdown` writes `id: ${entry.id}` into
  // YAML frontmatter, which is LINE-ORIENTED, so the newline FORGES ADDITIONAL
  // FRONTMATTER LINES in the written .md (`status: active` would silently
  // UN-ARCHIVE the entry). This runs unattended from digest consolidation. The
  // gate now validates the FULL id via the shared `isSafeMemoryId`, so such a row
  // is SKIPPED and COUNTED like every other malformed-row class — the run must
  // neither throw nor write anything for it.
  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [] as string[], trust: "trusted" as const, originDevice: null,
    accessCount: 0, lastAccess: null, archivedAt: null, archivedReason: null,
  };
  /** An expired (therefore archivable) row filed under its OWN id, so
   *  `validEntryExists` waves it through and only the id gate can reject it. */
  const expired = (key: string, over: Record<string, unknown> = {}) => ({
    id: key, type: "semantic", scope: "project:p", project: "p",
    title: "a fact", summary: "s", path: "", status: "active",
    validTo: "2000-01-01", ...base, ...over,
  });
  const md = (id: string) =>
    `---\nid: ${id}\ntype: semantic\nstatus: active\n---\n\n# a fact\n\nThe real body of ${id}.\n`;

  /** Every .md now under memory/, as raw text. */
  function allWrittenMd(): string[] {
    const outp: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const abs = join(dir, name);
        if (statSync(abs).isDirectory()) walk(abs);
        else if (name.endsWith(".md")) outp.push(readFileSync(abs, "utf8"));
      }
    };
    walk(join(repo, "memory"));
    return outp;
  }

  it("SKIPS + COUNTS a newline-bearing and a metacharacter-bearing id; the healthy row still archives; nothing throws", async () => {
    const warnings: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => { warnings.push(a.map(String).join(" ")); });
    // THE PAYLOAD: the final segment ("safe") is innocuous, so the OLD slug-only
    // check accepted it — while `id: semantic/p` + `forged: value/safe` would be
    // written as TWO frontmatter lines.
    const FORGED_ID = "semantic/p\nforged: value/safe";
    const SPACED_ID = "semantic/p q/safe";
    const entries: Record<string, unknown> = {
      "semantic/p/good": expired("semantic/p/good", { path: "memory/semantic/p/good.md" }),
      [FORGED_ID]: expired(FORGED_ID),
      [SPACED_ID]: expired(SPACED_ID),
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    writeFileSync(join(repo, "memory/semantic/p/good.md"), md("semantic/p/good"));
    const forgedBefore = JSON.parse(JSON.stringify(entries[FORGED_ID]));
    const spacedBefore = JSON.parse(JSON.stringify(entries[SPACED_ID]));

    await expect(memoryArchiveCmd({ cwd: repo, apply: true })).resolves.toBeUndefined();

    // the healthy row still archives normally (index + .md both stamped)
    expect(readIndexStatus("semantic/p/good")).toBe("archived");
    expect(readMdField("semantic/p/good.md", "status")).toBe("archived");
    // the poisoned rows are untouched in the index and counted in the warning
    expect(readIndex().entries[FORGED_ID]).toEqual(forgedBefore);
    expect(readIndex().entries[SPACED_ID]).toEqual(spacedBefore);
    expect(warnings.join("\n")).toMatch(/skipped 2 malformed index row\(s\)/);
    // NO forged frontmatter key anywhere on disk, and no extra .md was created
    const written = allWrittenMd();
    expect(written.length).toBe(1);
    for (const doc of written) {
      expect(doc).not.toMatch(/^forged:/m);
      expect(doc).not.toContain("forged");
      // the only id line is the healthy one
      expect(doc.match(/^id: .*$/gm)).toEqual(["id: semantic/p/good"]);
    }
    // the poisoned rows' would-be canonical target was never written
    expect(existsSync(join(repo, "memory/semantic/p/safe.md"))).toBe(false);
    expect(existsSync(join(repo, "memory/semantic/p q"))).toBe(false);
  });

  it("normal ids are unaffected (regression lock)", async () => {
    const entries: Record<string, unknown> = {
      "semantic/my.proj-1/a.b-c": expired("semantic/my.proj-1/a.b-c", {
        project: "my.proj-1", path: "memory/semantic/my.proj-1/a.b-c.md",
      }),
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/my.proj-1"), { recursive: true });
    writeFileSync(join(repo, "memory/semantic/my.proj-1/a.b-c.md"), md("semantic/my.proj-1/a.b-c"));

    await memoryArchiveCmd({ cwd: repo, apply: true });

    expect(readIndexStatus("semantic/my.proj-1/a.b-c")).toBe("archived");
    expect(readMdField("semantic/my.proj-1/a.b-c.md", "status")).toBe("archived");
  });
});
