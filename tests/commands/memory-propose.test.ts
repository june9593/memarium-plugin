import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryProposeCmd", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-prop-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".vibebook/session-repo");
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
    mkdirSync(join(home, ".vibebook"), { recursive: true });
    writeFileSync(join(home, ".vibebook/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  function gatedInput(): string {
    const input = join(home, "in.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "core/yue-workflow", type: "core", scope: "global", project: null,
        title: "wf", summary: "s", status: "active", confidence: 0.9, importance: 5,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "the workflow body",
      rationale: "captured from session",
      sourceSession: "sess-9",
    }]));
    return input;
  }

  it("writes a proposal for a gated change; nothing lands in memory/", async () => {
    const { memoryProposeCmd } = await import("../../src/commands/memory-propose.js");
    const r = await memoryProposeCmd({ inputPath: gatedInput() });
    expect(r.proposed).toBe(1);
    expect(existsSync(join(repo, "memory/core/_global/yue-workflow.md"))).toBe(false);
    const { listProposals } = await import("../../src/memory/proposal-store.js");
    const all = listProposals(repo);
    expect(all.length).toBe(1);
    expect(all[0].targetKey).toBe("core/yue-workflow");
    expect(all[0].action).toBe("create");
    expect(all[0].rationale).toBe("captured from session");
  });

  it("rejects a non-gated change with a memory-write hint", async () => {
    const input = join(home, "ng.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "semantic/p/z", type: "semantic", scope: "project:p", project: "p",
        title: "z", summary: "s", status: "active", confidence: 0.5, importance: 1,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "b",
    }]));
    const { memoryProposeCmd } = await import("../../src/commands/memory-propose.js");
    await expect(memoryProposeCmd({ inputPath: input })).rejects.toThrow(/memory-write/);
  });

  it("report returns targetKeys and proposedEntryIds aligned with paths", async () => {
    const { memoryProposeCmd } = await import("../../src/commands/memory-propose.js");
    const r = await memoryProposeCmd({ inputPath: gatedInput() });
    expect(r.proposed).toBe(1);
    expect(r.paths.length).toBe(1);
    expect(r.targetKeys).toEqual(["core/yue-workflow"]);
    expect(r.proposedEntryIds).toEqual(["core/yue-workflow"]);
  });

  it("canonicalizes a wrong entry.path so the queued proposal is approvable", async () => {
    const input = join(home, "wrongpath.json");
    writeFileSync(input, JSON.stringify([{
      entry: {
        id: "core/yue-workflow", type: "core", scope: "global", project: null,
        title: "wf", summary: "s", path: "memory/STALE/wrong.md",
        status: "active", confidence: 0.9, importance: 5,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [],
        supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null,
      },
      body: "b",
    }]));
    const { memoryProposeCmd } = await import("../../src/commands/memory-propose.js");
    await memoryProposeCmd({ inputPath: input });
    const { readProposal } = await import("../../src/memory/proposal-store.js");
    const p = readProposal(repo, "core/yue-workflow");
    expect(p?.proposal.entry.path).toBe("memory/core/_global/yue-workflow.md");
    // and approve succeeds (no canonical-path mismatch)
    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    const r = await memoryApproveCmd({ id: "core/yue-workflow" });
    expect(r.applied).toBe(1);
  });
});
