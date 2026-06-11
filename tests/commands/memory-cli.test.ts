import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("plugin-cli memory subcommands", () => {
  let fakeHome: string, repo: string;
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-memcli-"));
    vi.stubEnv("HOME", fakeHome); vi.resetModules();
    repo = join(fakeHome, ".vibebook/session-repo");
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
    mkdirSync(join(fakeHome, ".vibebook"), { recursive: true });
    writeFileSync(join(fakeHome, ".vibebook/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("memory-write is dispatchable and writes a file (non-gated entry)", async () => {
    // v4: memory-write rejects gated changes (core/procedural/pinned). Use a
    // non-gated semantic entry to exercise CLI dispatch + the write path.
    const input = join(fakeHome, "m.json");
    writeFileSync(input, JSON.stringify([{ entry: {
      id: "semantic/_global/r", type: "semantic", scope: "global", project: null,
      title: "fact", summary: "x", status: "active", confidence: 1, importance: 5,
      createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], originDevice: null, accessCount: 0, lastAccess: null }, body: "b" }]));
    const { run } = await import("../../src/plugin-cli.js");
    await run(["node", "vibebook-plugin", "memory-write", "--input", input]);
    expect(existsSync(join(repo, "memory/semantic/_global/r.md"))).toBe(true);
  });

  it("memory-write CLI rejects a gated (core) entry", async () => {
    const input = join(fakeHome, "g.json");
    writeFileSync(input, JSON.stringify([{ entry: {
      id: "core/r", type: "core", scope: "global", project: null,
      title: "rule", summary: "x", status: "active", confidence: 1, importance: 5,
      createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], originDevice: null, accessCount: 0, lastAccess: null }, body: "b" }]));
    const { run } = await import("../../src/plugin-cli.js");
    await expect(run(["node", "vibebook-plugin", "memory-write", "--input", input]))
      .rejects.toThrow(/memory-propose/);
    expect(existsSync(join(repo, "memory/core/_global/r.md"))).toBe(false);
  });
});
