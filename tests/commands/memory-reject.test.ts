import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryRejectCmd", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-rej-"));
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

  it("deletes the proposal file", async () => {
    const { writeProposal, listProposals } = await import("../../src/memory/proposal-store.js");
    writeProposal(repo, {
      proposalId: "core__y", targetKey: "core/y", proposedEntryId: "core/y", action: "create",
      rationale: null, sourceSession: null, createdAt: "2026-06-12T00:00:00.000Z",
      proposal: { entry: { id: "core/y" } as never, body: "b" },
    });
    const { memoryRejectCmd } = await import("../../src/commands/memory-reject.js");
    const r = await memoryRejectCmd({ id: "core/y" });
    expect(r.rejected).toBe(1);
    expect(listProposals(repo).length).toBe(0);
  });

  it("throws on unknown id", async () => {
    const { memoryRejectCmd } = await import("../../src/commands/memory-reject.js");
    await expect(memoryRejectCmd({ id: "core/nope" })).rejects.toThrow(/no pending proposal/i);
  });
});
