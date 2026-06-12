import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MemoryProposal } from "../../src/memory/proposal-store.js";

function prop(over: Partial<MemoryProposal> = {}): MemoryProposal {
  return {
    proposalId: "core__yue-workflow", targetKey: "core/yue-workflow",
    proposedEntryId: "core/yue-workflow", action: "create",
    rationale: "why", sourceSession: "sess-1", createdAt: "2026-06-12T00:00:00.000Z",
    proposal: { entry: { id: "core/yue-workflow" } as never, body: "b" },
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

  it("queue dir is under ~/.vibebook/local-proposals and outside the repo", async () => {
    const { proposalsDir } = await import("../../src/memory/proposal-store.js");
    const dir = proposalsDir(repo);
    expect(dir.startsWith(join(home, ".vibebook", "local-proposals"))).toBe(true);
    expect(dir.startsWith(repo)).toBe(false);
  });

  it("flatTargetKey flattens slashes and rejects traversal", async () => {
    const { flatTargetKey } = await import("../../src/memory/proposal-store.js");
    expect(flatTargetKey("core/yue-workflow")).toBe("core__yue-workflow");
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

    expect(readProposal(repo, "core/yue-workflow")?.targetKey).toBe("core/yue-workflow");
    expect(readProposal(repo, "core__yue-workflow")?.targetKey).toBe("core/yue-workflow");

    expect(listProposals(repo).length).toBe(1);

    const del = deleteProposal(repo, "core/yue-workflow");
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
});
