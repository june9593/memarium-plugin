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

  it("memory-write is dispatchable and writes a file", async () => {
    const input = join(fakeHome, "m.json");
    writeFileSync(input, JSON.stringify([{ entry: {
      id: "core/_global/r", type: "core", scope: "global", project: null,
      title: "rule", summary: "x", status: "active", confidence: 1, importance: 5,
      createdAt: "2026-06-09", updatedAt: "2026-06-09", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], originDevice: null, accessCount: 0, lastAccess: null }, body: "b" }]));
    const { run } = await import("../../src/plugin-cli.js");
    await run(["node", "vibebook-plugin", "memory-write", "--input", input]);
    expect(existsSync(join(repo, "memory/core/_global/r.md"))).toBe(true);
  });
});
