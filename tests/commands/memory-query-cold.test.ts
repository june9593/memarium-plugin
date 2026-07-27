import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// R2 "resurrect valve" — when a memory-query recall has few/weak ACTIVE content
// hits, surface strongly-matching ARCHIVED entries in a read-only coldStorage
// section. This is the READ path: it must NEVER mutate status or the index, and
// the cold results MUST be scoped to the query's project (scoreArchived filters
// ONLY on status === "archived", not scope, so an unscoped cold pass would leak
// OTHER projects' archived memory into this project's recall).

describe("memoryQueryCmd — R2 cold-storage resurrect valve", () => {
  let fakeHome: string, repo: string, stdout: string[];
  const idxPath = () => join(repo, ".memarium/index.memory.json");

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memq-cold-"));
    vi.stubEnv("HOME", fakeHome);
    vi.stubEnv("MEMARIUM_DIR", ""); // force homedir-based memariumHome under the HOME stub
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // session index so cwd "/work/code-demo" resolves to project "code-demo"
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": {
        sessionId: "s1", shortId: "s1", tool: "claude", project: "code-demo",
        projectRaw: "/work/code-demo", startedAt: "2026-01-01T00:00:00Z",
        endedAt: "2026-01-01T00:00:00Z", nameSlug: "x", displayName: "x",
        relativePath: "raw_sessions/claude/code-demo/2026-01-01/x__s1.md",
        sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x" } },
    }));
    stdout = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      stdout.push(typeof c === "string" ? c : Buffer.from(c).toString()); return true;
    });
    // silence the human ❄️ hint (goes to stderr) during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  const base = {
    confidence: 1, importance: 1, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, trust: "trusted" as const, originDevice: null, accessCount: 0,
    lastAccess: null, archivedAt: null, archivedReason: null as string | null,
  };
  const mk = (o: Record<string, unknown>) => ({ type: "semantic", ...base, ...o });
  const writeIndex = (entries: Record<string, unknown>) =>
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");

  it("weak primary → surfaces the strong archived match, project-scoped, and NEVER writes the index", async () => {
    writeIndex({
      // one ACTIVE project entry that does NOT match "vim" → 0 active content hits
      "semantic/code-demo/spool": mk({ id: "semantic/code-demo/spool", scope: "project:code-demo",
        project: "code-demo", title: "Spool single md", summary: "since 0.6.0",
        path: "memory/semantic/code-demo/spool.md", status: "active", importance: 4, entities: ["spool"] }),
      // ARCHIVED, this project, strongly matches "vim" → SHOULD appear in coldStorage
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/coldvim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
      // ARCHIVED, OTHER project, also matches "vim" → MUST be scoped OUT (leak guard)
      "semantic/other/coldvim2": mk({ id: "semantic/other/coldvim2", scope: "project:other",
        project: "other", title: "Vim in other project", summary: "vim setup elsewhere",
        path: "memory/semantic/other/coldvim2.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "stale", entities: ["vim"] }),
    });

    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const before = readFileSync(idxPath(), "utf8");

    const result = await memoryQueryCmd({ cwd: "/work/code-demo", q: "vim" });

    // (a) returned object carries coldStorage with the in-scope archived match only
    const coldIds = result.coldStorage.map((c) => c.id);
    expect(coldIds).toContain("semantic/code-demo/coldvim");
    expect(coldIds).not.toContain("semantic/other/coldvim2"); // scoped out — no cross-project leak
    const hit = result.coldStorage.find((c) => c.id === "semantic/code-demo/coldvim")!;
    expect(hit.archivedReason).toBe("unused-low-value");
    expect(hit.title).toBe("Vim keybindings");
    expect(hit.score).toBeGreaterThanOrEqual(2);

    // ...and the same coldStorage is present in the JSON printed to stdout
    const payload = JSON.parse(stdout.join(""));
    expect(payload.coldStorage.map((c: { id: string }) => c.id)).toEqual(["semantic/code-demo/coldvim"]);

    // (b) NO write on the read path — index file is byte-identical
    expect(readFileSync(idxPath(), "utf8")).toBe(before);
  });

  it("strong/plentiful active matches → coldStorage empty even when an archived entry matches", async () => {
    const active = (n: number) => mk({ id: `semantic/code-demo/w${n}`, scope: "project:code-demo",
      project: "code-demo", title: `widget ${n}`, summary: "about widget",
      path: `memory/semantic/code-demo/w${n}.md`, status: "active", entities: ["widget"] });
    writeIndex({
      "semantic/code-demo/w1": active(1),
      "semantic/code-demo/w2": active(2),
      "semantic/code-demo/w3": active(3),
      // an archived entry that WOULD match "widget" — must stay hidden while primary is strong
      "semantic/code-demo/coldwidget": mk({ id: "semantic/code-demo/coldwidget", scope: "project:code-demo",
        project: "code-demo", title: "widget archived", summary: "old widget",
        path: "memory/semantic/code-demo/coldwidget.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["widget"] }),
    });

    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo", q: "widget" });
    expect(result.coldStorage).toEqual([]);
    const payload = JSON.parse(stdout.join(""));
    expect(payload.coldStorage).toEqual([]);
  });

  it("archived-and-expired entry is excluded from conflicts (archived is out of recall)", async () => {
    writeIndex({
      // ARCHIVED via the "expired" rule → keeps validTo !== null, so it would
      // otherwise match the conflicts time-bounded rule. The archival invariant
      // ("archived is out of recall") must keep it out of the conflicts section too.
      "semantic/code-demo/arch-expired": mk({ id: "semantic/code-demo/arch-expired", scope: "project:code-demo",
        project: "code-demo", title: "Archived expired note", summary: "old",
        path: "memory/semantic/code-demo/arch-expired.md", status: "archived",
        validTo: "2000-01-01", archivedAt: "2026-05-01", archivedReason: "expired", entities: [] }),
      // ACTIVE + time-bounded (validTo set) — the conflicts rule STILL applies here
      // (control: proves we excluded only archived, not every validTo entry).
      "semantic/code-demo/active-bounded": mk({ id: "semantic/code-demo/active-bounded", scope: "project:code-demo",
        project: "code-demo", title: "Active time-bounded note", summary: "valid window",
        path: "memory/semantic/code-demo/active-bounded.md", status: "active",
        validTo: "2000-01-01", entities: [] }),
    });

    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo", q: "" });
    const conflictIds = result.conflicts.map((c) => c.entry.id);
    expect(conflictIds).not.toContain("semantic/code-demo/arch-expired"); // archived excluded
    expect(conflictIds).toContain("semantic/code-demo/active-bounded");   // non-archived time-bounded still surfaces
  });

  it("a superseded-cleanup archive never surfaces in coldStorage (its replacement is already live)", async () => {
    // The valve exists to undo AGGRESSIVE HEURISTIC archival (unused-low-value /
    // stale-episodic / stale-provenance / expired / near-duplicate). A
    // `superseded-cleanup` archive is not a heuristic guess: the entry was
    // deliberately superseded and its live replacement is findable by primary
    // recall. Worse, memory-unarchive restores it to `superseded` (not active),
    // so the "memory-unarchive <id> to restore" hint can't even bring it back
    // into recall — the hint would be misleading and acting on it would surface
    // an obsolete fact.
    writeIndex({
      // active non-matching → 0 active content hits, so the valve fires
      "semantic/code-demo/local": mk({ id: "semantic/code-demo/local", scope: "project:code-demo",
        project: "code-demo", title: "Local unrelated note", summary: "nothing about the query",
        path: "memory/semantic/code-demo/local.md", status: "active", entities: [] }),
      // archived by superseded-cleanup, STRONG match for "vim" → MUST be excluded
      "semantic/code-demo/supvim": mk({ id: "semantic/code-demo/supvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/supvim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "superseded-cleanup", entities: ["vim"] }),
      // archived by a HEURISTIC rule, same strong match → control, MUST surface
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/coldvim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
    });
    const errs: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => { errs.push(a.map(String).join(" ")); });

    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo", q: "vim" });

    const coldIds = result.coldStorage.map((c) => c.id);
    expect(coldIds).not.toContain("semantic/code-demo/supvim"); // ineffective hint suppressed
    expect(coldIds).toContain("semantic/code-demo/coldvim");    // heuristic archive still resurfaces
    // ...and no restore hint is ever printed for the superseded-cleanup id
    expect(errs.join("\n")).not.toMatch(/supvim/);
  });

  it("empty query → coldStorage empty (never fires the valve on a plain primer refresh)", async () => {
    writeIndex({
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/coldvim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
    });
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo" }); // no q
    expect(result.coldStorage).toEqual([]);
  });

  it("a typed query does NOT surface a wrong-type archived cold hit (applies --type to the cold pass)", async () => {
    writeIndex({
      // active PROCEDURAL that doesn't match "vim" → 0 active content hits, valve fires
      "procedural/code-demo/run": mk({ type: "procedural", id: "procedural/code-demo/run",
        scope: "project:code-demo", project: "code-demo", title: "Run the tests", summary: "how to run",
        path: "memory/procedural/code-demo/run.md", status: "active", entities: [] }),
      // archived SEMANTIC matching "vim" → MUST be excluded under --type procedural
      "semantic/code-demo/svim": mk({ id: "semantic/code-demo/svim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/svim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
      // archived PROCEDURAL matching "vim" → SHOULD be included (control, right type)
      "procedural/code-demo/pvim": mk({ type: "procedural", id: "procedural/code-demo/pvim",
        scope: "project:code-demo", project: "code-demo", title: "Vim workflow", summary: "vim editing procedure",
        path: "memory/procedural/code-demo/pvim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "stale-provenance", entities: ["vim"] }),
    });
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo", type: "procedural", q: "vim" });
    const coldIds = result.coldStorage.map((c) => c.id);
    expect(coldIds).toContain("procedural/code-demo/pvim");   // typed match kept
    expect(coldIds).not.toContain("semantic/code-demo/svim"); // wrong-type archived excluded
  });

  it("a cold hit that lives only on an overlay device → source 'overlay' + restore-elsewhere hint (not a local memory-unarchive)", async () => {
    // local: one active non-matching entry so the valve fires
    writeIndex({
      "semantic/code-demo/local": mk({ id: "semantic/code-demo/local", scope: "project:code-demo",
        project: "code-demo", title: "Local unrelated note", summary: "nothing about the query",
        path: "memory/semantic/code-demo/local.md", status: "active", entities: [] }),
    });
    // overlay-only: an ARCHIVED entry (owned by device 'laptop') matching "vim".
    // memory-query merges the aggregated overlay index at ~/.memarium/aggregated.
    const overlayRoot = join(fakeHome, ".memarium/aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    writeFileSync(join(overlayRoot, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "semantic/code-demo/ovim": mk({ id: "semantic/code-demo/ovim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/ovim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", originDevice: "laptop", entities: ["vim"] }),
    } }, null, 2) + "\n");

    // capture the human hint (stderr) — beforeEach silenced it; re-spy to record
    const errs: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => { errs.push(a.map(String).join(" ")); });

    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo", q: "vim" });

    const hit = result.coldStorage.find((c) => c.id === "semantic/code-demo/ovim");
    expect(hit).toBeTruthy();
    expect(hit!.source).toBe("overlay");
    expect(hit!.originDevice).toBe("laptop");
    const hint = errs.join("\n");
    expect(hint).toMatch(/archived on device laptop; restore it there/);
    expect(hint).not.toMatch(/memory-unarchive semantic\/code-demo\/ovim/); // never advertise a local restore that would fail
  });

  it("a LOCAL cold hit keeps the memory-unarchive restore hint (source 'local')", async () => {
    writeIndex({
      "semantic/code-demo/spool": mk({ id: "semantic/code-demo/spool", scope: "project:code-demo",
        project: "code-demo", title: "Spool single md", summary: "unrelated to query",
        path: "memory/semantic/code-demo/spool.md", status: "active", entities: [] }),
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/coldvim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
    });
    const errs: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => { errs.push(a.map(String).join(" ")); });
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo", q: "vim" });
    const hit = result.coldStorage.find((c) => c.id === "semantic/code-demo/coldvim");
    expect(hit!.source).toBe("local");
    expect(hit!.originDevice).toBe(null);
    expect(errs.join("\n")).toMatch(/memory-unarchive 'semantic\/code-demo\/coldvim' to restore/);
  });

  it("cold hits preserve trust: an UNTRUSTED archived hit carries trust in JSON and is flagged; a TRUSTED one is not", async () => {
    // An archived untrusted semantic must NOT be surfaced indistinguishably from a
    // trusted one (issue #23 boundary): the cold hit carries `trust` in the JSON and
    // its human ❄️ hint is flagged (untrusted), so a restored-from-cold untrusted
    // fact is never mistaken for an established project fact.
    writeIndex({
      // active non-matching so the valve fires (0 active content hits for "vim")
      "semantic/code-demo/local": mk({ id: "semantic/code-demo/local", scope: "project:code-demo",
        project: "code-demo", title: "Local unrelated note", summary: "nothing about the query",
        path: "memory/semantic/code-demo/local.md", status: "active", entities: [] }),
      // archived UNTRUSTED semantic matching "vim" → flagged
      "semantic/code-demo/uvim": mk({ id: "semantic/code-demo/uvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/uvim.md", status: "archived", trust: "untrusted",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
      // archived TRUSTED semantic matching "vim" → NOT flagged (control)
      "semantic/code-demo/tvim": mk({ id: "semantic/code-demo/tvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/tvim.md", status: "archived", trust: "trusted",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
    });
    const errs: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => { errs.push(a.map(String).join(" ")); });
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/work/code-demo", q: "vim" });

    // (a) returned object + JSON payload carry trust
    const u = result.coldStorage.find((c) => c.id === "semantic/code-demo/uvim")!;
    const t = result.coldStorage.find((c) => c.id === "semantic/code-demo/tvim")!;
    expect(u.trust).toBe("untrusted");
    expect(t.trust).toBe("trusted");
    const payload = JSON.parse(stdout.join(""));
    const pu = payload.coldStorage.find((c: { id: string }) => c.id === "semantic/code-demo/uvim");
    expect(pu.trust).toBe("untrusted");

    // (b) human ❄️ hint flags the untrusted line only
    const lines = errs.join("\n").split("\n");
    const uLine = lines.find((l) => l.includes("uvim"))!;
    const tLine = lines.find((l) => l.includes("tvim"))!;
    expect(uLine).toMatch(/untrusted/);
    expect(tLine).not.toMatch(/untrusted/);
  });

  // ROUND-34 (SECURITY / scope leak): `memory-query` has no --all/--project
  // escape hatch, so a null project means exactly "this cwd is not a synced
  // project" — and a null project means WHOLE STORE to the cold pass. Running
  // /memarium-context from an unsynced directory therefore surfaced every OTHER
  // project's archived memory, each with its own restore command. Fail closed.
  it("an UNRESOLVABLE cwd surfaces NO cold hits (no whole-store fallback)", async () => {
    writeIndex({
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", scope: "project:code-demo",
        project: "code-demo", title: "Vim keybindings", summary: "vim editor setup",
        path: "memory/semantic/code-demo/coldvim.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value", entities: ["vim"] }),
      "semantic/other/coldvim2": mk({ id: "semantic/other/coldvim2", scope: "project:other",
        project: "other", title: "Vim in other project", summary: "vim setup elsewhere",
        path: "memory/semantic/other/coldvim2.md", status: "archived",
        archivedAt: "2026-05-01", archivedReason: "stale", entities: ["vim"] }),
    });
    const { memoryQueryCmd } = await import("../../src/commands/memory-query.js");
    const result = await memoryQueryCmd({ cwd: "/nowhere/unsynced", q: "vim" });
    expect(result.project).toBeNull();
    expect(result.coldStorage).toEqual([]);
    expect(JSON.parse(stdout.join("")).coldStorage).toEqual([]);
  });
});
