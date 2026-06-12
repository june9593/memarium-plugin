import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryApproveCmd", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-appr-"));
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

  async function seed(entryOver: Record<string, unknown> = {}, primerProject?: string) {
    const { writeProposal, flatTargetKey } = await import("../../src/memory/proposal-store.js");
    const { targetKey } = await import("../../src/memory/gate.js");
    if (primerProject) {
      mkdirSync(join(repo, "memory/_primer"), { recursive: true });
      writeFileSync(join(repo, `memory/_primer/${primerProject}.md`), "# stale primer\n");
    }
    const entry = {
      id: "core/y", type: "core", scope: "global", project: null, title: "T", summary: "S",
      path: "", status: "active", confidence: 1, importance: 5,
      createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
      originDevice: null, accessCount: 0, lastAccess: null, ...entryOver,
    } as never;
    const tk = targetKey(entry);
    writeProposal(repo, {
      proposalId: flatTargetKey(tk), targetKey: tk, proposedEntryId: (entry as { id: string }).id,
      action: "create", rationale: "r", sourceSession: "s", createdAt: "2026-06-12T00:00:00.000Z",
      proposal: { entry, body: "approved body" },
    });
  }

  it("applies the proposal to live memory and deletes the proposal file", async () => {
    await seed();
    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    const r = await memoryApproveCmd({ id: "core/y" });
    expect(r.applied).toBe(1);
    expect(existsSync(join(repo, "memory/core/_global/y.md"))).toBe(true);
    const idx = JSON.parse(readFileSync(join(repo, ".vibebook/index.memory.json"), "utf8"));
    expect(idx.entries["core/y"].title).toBe("T");
    const { listProposals } = await import("../../src/memory/proposal-store.js");
    expect(listProposals(repo).length).toBe(0);
  });

  it("global/user-scope approve deletes ALL cached primers", async () => {
    await seed({}, "edge-memvc");
    mkdirSync(join(repo, "memory/_primer"), { recursive: true });
    writeFileSync(join(repo, "memory/_primer/other.md"), "# other\n");
    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    const r = await memoryApproveCmd({ id: "core/y" });
    expect(existsSync(join(repo, "memory/_primer/edge-memvc.md"))).toBe(false);
    expect(existsSync(join(repo, "memory/_primer/other.md"))).toBe(false);
    expect(r.primersRefreshed.length).toBeGreaterThanOrEqual(2);
  });

  it("project-scope approve deletes only that project's primer", async () => {
    await seed({ scope: "project:edge-memvc", project: "edge-memvc", id: "procedural/edge-memvc/x", type: "procedural" });
    mkdirSync(join(repo, "memory/_primer"), { recursive: true });
    writeFileSync(join(repo, "memory/_primer/edge-memvc.md"), "# p\n");
    writeFileSync(join(repo, "memory/_primer/keep.md"), "# keep\n");
    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    await memoryApproveCmd({ id: "procedural/edge-memvc/x" });
    expect(existsSync(join(repo, "memory/_primer/edge-memvc.md"))).toBe(false);
    expect(existsSync(join(repo, "memory/_primer/keep.md"))).toBe(true);
  });

  it("throws on an unknown proposal id", async () => {
    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    await expect(memoryApproveCmd({ id: "core/nope" })).rejects.toThrow(/no pending proposal/i);
  });

  it("derives the affected primer from scope (project-scoped entry with null project deletes only its primer)", async () => {
    // inconsistent-but-valid input: scope says project, project field is null
    await seed({ scope: "project:edge-memvc", project: null, id: "core/y", type: "core" }, "edge-memvc");
    mkdirSync(join(repo, "memory/_primer"), { recursive: true });
    writeFileSync(join(repo, "memory/_primer/edge-memvc.md"), "p\n");
    writeFileSync(join(repo, "memory/_primer/keep.md"), "keep\n");
    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    await memoryApproveCmd({ id: "core/y" });
    expect(existsSync(join(repo, "memory/_primer/edge-memvc.md"))).toBe(false);
    expect(existsSync(join(repo, "memory/_primer/keep.md"))).toBe(true);
  });
});

