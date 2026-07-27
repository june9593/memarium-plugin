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
    expect(lines.some((l) => /memory-unarchive 'semantic\/code-demo\/coldvim' to restore/.test(l))).toBe(true);
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

  // meta.nextStep is the line the /memarium-recall skill reads when the ranked
  // list is empty. It used to hard-code "memory-unarchive <id> to restore" — a
  // lie when every cold hit came from the OVERLAY (memory-unarchive reads the
  // LOCAL index and would report "not archived"). It now goes through the same
  // origin-aware renderer as the stderr hint.
  it("no active hits + ONLY overlay cold hits → nextStep points at the origin device, not a local memory-unarchive", async () => {
    writeLocalIndex({}); // nothing active locally → p.entries === [] → the cold nextStep branch
    const overlayRoot = join(fakeHome, ".memarium/aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    writeFileSync(join(overlayRoot, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "semantic/code-demo/ovim": mk({ id: "semantic/code-demo/ovim", title: "Vim keybindings",
        summary: "vim editor setup", entities: ["vim"], status: "archived", originDevice: "laptop",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/ovim.md" }),
    } }, null, 2) + "\n");

    const p = await run({ cwd: "/work/code-demo", q: "vim" });
    expect(p.entries).toEqual([]);
    expect(p.coldStorage.map((c: { id: string }) => c.id)).toEqual(["semantic/code-demo/ovim"]);
    expect(p.coldStorage[0].source).toBe("overlay");

    // origin-aware: names the device, and NEVER advertises the local restore
    // command (which would fail for an overlay-only archive).
    expect(p.meta.nextStep).toMatch(/device laptop/);
    expect(p.meta.nextStep).toMatch(/restore it there/);
    expect(p.meta.nextStep).not.toMatch(/memory-unarchive '<id>' to restore/);
    expect(p.meta.nextStep).not.toMatch(/memory-unarchive semantic\/code-demo\/ovim/);
  });

  it("no active hits + LOCAL cold hits → nextStep keeps the memory-unarchive restore instruction", async () => {
    writeLocalIndex({
      // archived-only local index → no active hits, one local cold hit
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", title: "Vim keybindings",
        summary: "vim editor setup", entities: ["vim"], status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/coldvim.md" }),
    });

    const p = await run({ cwd: "/work/code-demo", q: "vim" });
    expect(p.entries).toEqual([]);
    expect(p.coldStorage[0].source).toBe("local");
    expect(p.meta.nextStep).toMatch(/memory-unarchive '<id>' to restore/);
    expect(p.meta.nextStep).not.toMatch(/restore it there/);
  });

  // Round-21: `view.sources` is keyed by the index MAP KEY, but the cold pass
  // looked the origin up under the untrusted `entry.id` and defaulted a miss to
  // "local". No index loader checks that a row's key matches its own `id`, so an
  // OVERLAY-only archive filed under a mismatched key rendered a local
  // `memory-unarchive <id>` — a command that fails (the id isn't in the local
  // index) or, worse, acts on a different local record that happens to own that id.
  it("an overlay-only cold hit whose row `id` disagrees with its index KEY is never reported as local", async () => {
    writeLocalIndex({}); // nothing local at all → any "local" claim is provably false
    const overlayRoot = join(fakeHome, ".memarium/aggregated");
    mkdirSync(join(overlayRoot, ".memarium"), { recursive: true });
    writeFileSync(join(overlayRoot, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      // filed under one key, carrying a DIFFERENT id of its own
      "semantic/code-demo/keyed": mk({ id: "semantic/code-demo/ovim", title: "Vim keybindings",
        summary: "vim editor setup", entities: ["vim"], status: "archived", originDevice: "laptop",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/ovim.md" }),
    } }, null, 2) + "\n");

    const p = await run({ cwd: "/work/code-demo", q: "vim" });
    expect(p.coldStorage).toHaveLength(1);
    expect(p.coldStorage[0].source).not.toBe("local");

    // neither the per-hit stderr hint nor meta.nextStep may advertise the local
    // restore command for an archive that does not live in the local index.
    expect(errs.join("\n")).not.toMatch(/memory-unarchive semantic\/code-demo\/ovim/);
    expect(p.meta.nextStep).not.toMatch(/memory-unarchive '<id>' to restore/);
  });

  // Round-28 (SECURITY): a cold hit's `id` comes from the LENIENT memory index,
  // and memory content originates from digested sessions — memory POISONING is in
  // this project's threat model. The cold hint renders that id into something
  // that LOOKS like a runnable command and is meant to be copy-pasted (or acted
  // on by an agent), so a poisoned id would smuggle shell into it. End-to-end:
  // neither the stderr hint nor `meta.nextStep` may hand back anything runnable.
  it("a POISONED archived id produces NO runnable memory-unarchive anywhere (hint, nextStep, payload)", async () => {
    const evil = "semantic/code-demo/coldvim; rm -rf ~";
    writeLocalIndex({
      [evil]: mk({ id: evil, title: "Vim keybindings", summary: "vim editor setup",
        entities: ["vim"], status: "archived", archivedAt: "2026-05-01",
        archivedReason: "unused-low-value", path: "memory/semantic/code-demo/coldvim.md" }),
    });

    const p = await run({ cwd: "/work/code-demo", q: "vim" });
    expect(p.coldStorage).toHaveLength(1);
    expect(p.coldStorage[0].source).toBe("local"); // it IS local — the id is the problem

    // (a) the machine payload carries NO command for it…
    expect(p.coldStorage[0].restoreCommand).toBe(null);
    // (b) …the stderr hint neither names the command nor echoes the raw id
    //     (its `;` must never reach an executable-looking position)…
    const hintLine = errs.join("\n").split("\n").find((l) => l.includes("coldvim"))!;
    expect(hintLine).not.toMatch(/memory-unarchive/);
    expect(hintLine).not.toContain(evil);
    expect(hintLine).not.toContain(";");
    expect(hintLine).toMatch(/unsafe id — restore manually/);
    // (c) …and nextStep is disarmed too.
    expect(p.meta.nextStep).not.toMatch(/memory-unarchive/);
    expect(p.meta.nextStep).not.toContain(";");
    expect(p.meta.nextStep).toMatch(/unsafe to use in a command/);
  });

  it("a normal archived id still gets the (now single-QUOTED) command in the payload", async () => {
    writeLocalIndex({
      "semantic/code-demo/coldvim": mk({ id: "semantic/code-demo/coldvim", title: "Vim keybindings",
        summary: "vim editor setup", entities: ["vim"], status: "archived",
        archivedAt: "2026-05-01", archivedReason: "unused-low-value",
        path: "memory/semantic/code-demo/coldvim.md" }),
    });
    const p = await run({ cwd: "/work/code-demo", q: "vim" });
    expect(p.coldStorage[0].restoreCommand).toBe("memory-unarchive 'semantic/code-demo/coldvim'");
  });
});
