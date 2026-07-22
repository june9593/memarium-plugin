import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, symlinkSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MemoryProposal } from "../../src/memory/proposal-store.js";

function prop(over: Partial<MemoryProposal> = {}): MemoryProposal {
  return {
    proposalId: "core__user-workflow", targetKey: "core/user-workflow",
    proposedEntryId: "core/user-workflow", action: "create",
    rationale: "why", sourceSession: "sess-1", createdAt: "2026-06-12T00:00:00.000Z",
    proposal: { entry: { id: "core/user-workflow" } as never, body: "b" },
    ...over,
  };
}

describe("proposal-store", () => {
  let home: string;
  const repo = "/tmp/some/session-repo";
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-ps-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("queue dir is under ~/.memarium/local-proposals and outside the repo", async () => {
    const { proposalsDir } = await import("../../src/memory/proposal-store.js");
    const dir = proposalsDir(repo);
    expect(dir.startsWith(join(home, ".memarium", "local-proposals"))).toBe(true);
    expect(dir.startsWith(repo)).toBe(false);
  });

  it("flatTargetKey flattens slashes and rejects traversal", async () => {
    const { flatTargetKey } = await import("../../src/memory/proposal-store.js");
    expect(flatTargetKey("core/user-workflow")).toBe("core__user-workflow");
    expect(() => flatTargetKey("../escape")).toThrow();
    expect(() => flatTargetKey("a/../b")).toThrow();
    expect(() => flatTargetKey("core/a__b")).toThrow(/__/);
  });

  it("write → read → list → delete round-trip", async () => {
    const { writeProposal, readProposal, listProposals, deleteProposal, proposalsDir } =
      await import("../../src/memory/proposal-store.js");
    const p = writeProposal(repo, prop());
    expect(existsSync(p)).toBe(true);
    expect(p.startsWith(proposalsDir(repo))).toBe(true);

    expect(readProposal(repo, "core/user-workflow")?.targetKey).toBe("core/user-workflow");
    expect(readProposal(repo, "core__user-workflow")?.targetKey).toBe("core/user-workflow");

    expect(listProposals(repo).length).toBe(1);

    const del = deleteProposal(repo, "core/user-workflow");
    expect(del).toBe(p);
    expect(existsSync(p)).toBe(false);
    expect(listProposals(repo).length).toBe(0);
  });

  it("re-writing the same target overwrites (one file)", async () => {
    const { writeProposal, listProposals } = await import("../../src/memory/proposal-store.js");
    writeProposal(repo, prop({ rationale: "v1" }));
    writeProposal(repo, prop({ rationale: "v2" }));
    const all = listProposals(repo);
    expect(all.length).toBe(1);
    expect(all[0].rationale).toBe("v2");
  });

  it("listProposals skips a corrupt file rather than throwing", async () => {
    const { writeProposal, proposalsDir, listProposals } = await import("../../src/memory/proposal-store.js");
    writeProposal(repo, prop());
    const { writeFileSync } = await import("node:fs");
    writeFileSync(join(proposalsDir(repo), "broken.json"), "{ not json");
    expect(listProposals(repo).length).toBe(1);
  });

  it("readProposal/deleteProposal return null for unknown id", async () => {
    const { readProposal, deleteProposal } = await import("../../src/memory/proposal-store.js");
    expect(readProposal(repo, "core/nope")).toBeNull();
    expect(deleteProposal(repo, "core/nope")).toBeNull();
  });

  it("refuses to operate through a symlinked local-proposals dir (symlink guard)", async () => {
    const { writeProposal } = await import("../../src/memory/proposal-store.js");
    const outside = join(home, "evil");
    mkdirSync(outside, { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    symlinkSync(outside, join(home, ".memarium", "local-proposals"));
    expect(() => writeProposal(repo, prop())).toThrow(/symlink guard/i);
  });

  it("refuses to write through a symlinked proposal file (leaf symlink guard)", async () => {
    const { writeProposal, proposalsDir } = await import("../../src/memory/proposal-store.js");
    const dir = proposalsDir(repo);
    mkdirSync(dir, { recursive: true });
    const outside = join(home, "evil.json");
    writeFileSync(outside, "x\n");
    symlinkSync(outside, join(dir, "core__user-workflow.json"));
    expect(() => writeProposal(repo, prop())).toThrow(/symlink guard/i);
  });

  it("refuses to list through a symlinked proposal file (leaf symlink guard)", async () => {
    const { listProposals, proposalsDir } = await import("../../src/memory/proposal-store.js");
    const dir = proposalsDir(repo);
    mkdirSync(dir, { recursive: true });
    const outside = join(home, "evil2.json");
    writeFileSync(outside, '{"x":1}\n');
    symlinkSync(outside, join(dir, "core__leak.json"));
    expect(() => listProposals(repo)).toThrow(/symlink guard/i);
  });
});
