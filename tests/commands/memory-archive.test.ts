import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
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
    // Two expired entries land in the plan: one perfectly valid, one whose project
    // is an unsafe path segment ("..") so its canonical-path derivation throws.
    // With an order-aware whole-plan preflight, the throw must happen BEFORE the
    // first write — so the valid entry's .md and the index stay untouched.
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
      "semantic/bad": { id: "semantic/bad", type: "semantic", scope: "project:..", project: "..",
        title: "Bad path", summary: "s", path: "", status: "active",
        validTo: "2000-01-01", ...base },
    };
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
    mkdirSync(join(repo, "memory/semantic/p"), { recursive: true });
    const goodMd = "---\nid: semantic/p/good\ntype: semantic\nstatus: active\n---\n\n# Good expired\n\nThe real body.\n";
    writeFileSync(join(repo, "memory/semantic/p/good.md"), goodMd);
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
