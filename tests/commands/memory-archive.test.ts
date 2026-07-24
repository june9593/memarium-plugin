import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
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
});
