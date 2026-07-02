import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memory v4 propose → diff → approve round-trip + queue isolation", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-rt-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("a gated change proposed, then approved, lands live and dequeues — and never lived in the repo", async () => {
    const input = join(home, "in.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "procedural/edge-memvc/build-rule", type: "procedural",
        scope: "project:edge-memvc", project: "edge-memvc",
        title: "rm -rf dist before build", summary: "clean script", status: "active",
        confidence: 0.9, importance: 4,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "Always rm -rf dist first.",
    }]));

    const { memoryProposeCmd } = await import("../../src/commands/memory-propose.js");
    await memoryProposeCmd({ inputPath: input });
    expect(existsSync(join(repo, "memory/procedural/edge-memvc/build-rule.md"))).toBe(false);

    const queueRoot = join(home, ".memarium", "local-proposals");
    expect(existsSync(queueRoot)).toBe(true);
    const repoFiles: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name); if (e.isDirectory()) walk(p); else repoFiles.push(p); } };
    walk(repo);
    expect(repoFiles.some((f) => f.includes("local-proposals"))).toBe(false);

    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    const r = await memoryApproveCmd({ id: "procedural/edge-memvc/build-rule" });
    expect(r.applied).toBe(1);
    expect(existsSync(join(repo, "memory/procedural/edge-memvc/build-rule.md"))).toBe(true);

    const { listProposals } = await import("../../src/memory/proposal-store.js");
    expect(listProposals(repo).length).toBe(0);
  });
});
