import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// R2 "resurrect valve" on the PRIMARY recall path.
//
// The archival feature's safety argument is "a wrongly-archived memory
// resurfaces on demand". That valve originally existed only in `memory-query`,
// but `/memarium-recall` invokes `recall` — whose scoring excludes every
// archived entry — so the guarantee did NOT hold in the workflow that matters
// most. These tests lock the shared cold pass into `recall`:
//   - weak primary → strongly-matching ARCHIVED entries surface in coldStorage,
//     scoped to the query's project, carrying `trust`,
//   - strong primary → nothing cold surfaces,
//   - recall stays a READ path: the synced index is byte-identical after a run.

function mk(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "semantic/code-demo/x", type: "semantic", scope: "project:code-demo", project: "code-demo",
    title: "t", summary: "s", path: "memory/semantic/code-demo/x.md", status: "active",
    confidence: 0.9, importance: 3, createdAt: "2026-06-01", updatedAt: "2026-06-01",
    validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], trust: "trusted", originDevice: null, accessCount: 0,
    lastAccess: null, archivedAt: null, archivedReason: null,
    ...over,
  };
}

describe("recall — R2 cold-storage valve (shared with memory-query)", () => {
  let fakeHome: string, repo: string, stdout: string[], errs: string[];
  const idxPath = () => join(repo, ".memarium/index.memory.json");

  function writeLocalIndex(entries: Record<string, unknown>) {
    writeFileSync(idxPath(), JSON.stringify({ version: 1, entries }, null, 2) + "\n");
  }

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-recall-cold-"));
    vi.stubEnv("HOME", fakeHome);
    vi.stubEnv("MEMARIUM_DIR", ""); // force homedir-based memariumHome under the HOME stub
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // spool index so cwd "/work/code-demo" resolves to project "code-demo"
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": {
        sessionId: "s1", shortId: "s1", tool: "claude", project: "code-demo",
        projectRaw: "/work/code-demo", startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T00:00:00Z",
        nameSlug: "x", displayName: "x", relativePath: "raw_sessions/claude/code-demo/2026-01-01/x__s1.md",
        sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x" } },
    }));
    stdout = [];
    errs = [];
    vi.spyOn(process.stdout, "write").mockImplementation((c) => {
      stdout.push(typeof c === "string" ? c : Buffer.from(c).toString()); return true;
    });
    vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => { errs.push(a.map(String).join(" ")); });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  async function run(opts: Record<string, unknown>) {
    const { recallCmd } = await import("../../src/commands/recall.js");
    await recallCmd(opts);
    return JSON.parse(stdout.join(""));
  }

  it("weak primary → surfaces the strong archived match (project-scoped, with trust) and never writes the index", async () => {
    writeLocalIndex({
      // ACTIVE entry that does NOT match "vim" → 0 active content hits, valve fires
      "semantic/code-demo/spool": mk({ id: "semantic/code-demo/spool", title: "Spool single md",
        summary: "since 0.6.0", entities: ["spool"], path: "memory/semantic/code-demo/spool.md" }),
      // ARCHIVED, this project, strongly matches "vim" → SHOULD surface in coldStorage
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", title: "Vim keybindings",
        summary: "vim editor setup", entities: ["vim"], status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/coldvim.md" }),
      // ARCHIVED, OTHER project, also matches "vim" → MUST be scoped OUT (leak guard)
      "semantic/other/coldvim2": mk({ id: "semantic/other/coldvim2", scope: "project:other",
        project: "other", title: "Vim in other project", summary: "vim setup elsewhere",
        entities: ["vim"], status: "archived", archivedAt: "2026-05-01", archivedReason: "stale",
        path: "memory/semantic/other/coldvim2.md" }),
      // ARCHIVED untrusted match → surfaces WITH trust preserved + flagged in the hint
      "semantic/code-demo/uvim": mk({ id: "semantic/code-demo/uvim", title: "Vim untrusted note",
        summary: "vim tip from an unverified source", entities: ["vim"], status: "archived",
        trust: "untrusted", archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/uvim.md" }),
    });

    const before = readFileSync(idxPath(), "utf8");
    const p = await run({ cwd: "/work/code-demo", q: "vim" });

    // (a) archived entries stay OUT of the primary ranked list…
    const ids = p.entries.map((h: { id: string }) => h.id);
    expect(ids).not.toContain("semantic/code-demo/coldvim");

    // (b) …but surface in the read-only cold-storage section, project-scoped
    const coldIds = p.coldStorage.map((c: { id: string }) => c.id);
    expect(coldIds).toContain("semantic/code-demo/coldvim");
    expect(coldIds).not.toContain("semantic/other/coldvim2"); // no cross-project leak
    const hit = p.coldStorage.find((c: { id: string }) => c.id === "semantic/code-demo/coldvim");
    expect(hit.archivedReason).toBe("unused-low-value");
    expect(hit.title).toBe("Vim keybindings");
    expect(hit.score).toBeGreaterThanOrEqual(2);
    expect(hit.source).toBe("local");
    expect(hit.trust).toBe("trusted");
    const untrusted = p.coldStorage.find((c: { id: string }) => c.id === "semantic/code-demo/uvim");
    expect(untrusted.trust).toBe("untrusted");

    // (c) human restore hint (stderr — stdout stays clean JSON), untrusted flagged
    const lines = errs.join("\n").split("\n");
    expect(lines.some((l) => /memory-unarchive semantic\/code-demo\/coldvim to restore/.test(l))).toBe(true);
    expect(lines.find((l) => l.includes("uvim"))).toMatch(/untrusted/);
    expect(lines.find((l) => l.includes("coldvim "))).not.toMatch(/untrusted/);

    // (d) READ PATH: the synced index is byte-identical (no status/index mutation)
    expect(readFileSync(idxPath(), "utf8")).toBe(before);
  });

  it("strong primary → coldStorage empty even though an archived entry matches", async () => {
    const active = (n: number) => mk({ id: `semantic/code-demo/w${n}`, title: `widget ${n}`,
      summary: "about widget", entities: ["widget"], path: `memory/semantic/code-demo/w${n}.md` });
    writeLocalIndex({
      "semantic/code-demo/w1": active(1),
      "semantic/code-demo/w2": active(2),
      "semantic/code-demo/w3": active(3),
      "semantic/code-demo/coldwidget": mk({ id: "semantic/code-demo/coldwidget",
        title: "widget archived", summary: "old widget", entities: ["widget"], status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/coldwidget.md" }),
    });
    const p = await run({ cwd: "/work/code-demo", q: "widget" });
    expect(p.coldStorage).toEqual([]);
    expect(errs.join("\n")).not.toMatch(/❄️/);
  });

  it("empty query → coldStorage empty (the valve never fires on a primer-style overview)", async () => {
    writeLocalIndex({
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", title: "Vim keybindings",
        summary: "vim editor setup", entities: ["vim"], status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/coldvim.md" }),
    });
    const p = await run({ cwd: "/work/code-demo" });
    expect(p.coldStorage).toEqual([]);
  });

  it("an overlay-only cold hit points at its origin device instead of a local memory-unarchive", async () => {
    writeLocalIndex({
      "semantic/code-demo/local": mk({ id: "semantic/code-demo/local", title: "Local unrelated note",
        summary: "nothing about the query", path: "memory/semantic/code-demo/local.md" }),
    });
    const overlayRoot = join(fakeHome, ".memarium/aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    writeFileSync(join(overlayRoot, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "semantic/code-demo/ovim": mk({ id: "semantic/code-demo/ovim", title: "Vim keybindings",
        summary: "vim editor setup", entities: ["vim"], status: "archived", originDevice: "laptop",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/ovim.md" }),
    } }, null, 2) + "\n");

    const p = await run({ cwd: "/work/code-demo", q: "vim" });
    const hit = p.coldStorage.find((c: { id: string }) => c.id === "semantic/code-demo/ovim");
    expect(hit).toBeTruthy();
    expect(hit.source).toBe("overlay");
    expect(hit.originDevice).toBe("laptop");
    const hint = errs.join("\n");
    expect(hint).toMatch(/archived on device laptop; restore it there/);
    expect(hint).not.toMatch(/memory-unarchive semantic\/code-demo\/ovim/);
  });
});
