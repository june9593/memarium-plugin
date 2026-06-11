import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("memoryDiffCmd", () => {
  let home: string, repo: string, logs: string[];
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-diff-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".vibebook/session-repo");
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
    mkdirSync(join(home, ".vibebook"), { recursive: true });
    writeFileSync(join(home, ".vibebook/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    logs = [];
    vi.spyOn(console, "log").mockImplementation((m?: unknown) => { logs.push(String(m)); });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  async function seedProposal(action: "create" | "update") {
    const { writeProposal } = await import("../../src/memory/proposal-store.js");
    if (action === "update") {
      const { saveMemoryIndex } = await import("../../src/memory/index-store.js");
      saveMemoryIndex(repo, { version: 1, entries: { "core/y": {
        id: "core/y", type: "core", scope: "global", project: null, title: "old title", summary: "old",
        path: "memory/core/_global/y.md", status: "active", confidence: 1, importance: 5,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
        originDevice: null, accessCount: 0, lastAccess: null } } } as never);
    }
    writeProposal(repo, {
      proposalId: "core__y", targetKey: "core/y", proposedEntryId: "core/y", action,
      rationale: "r", sourceSession: "s", createdAt: "2026-06-12T00:00:00.000Z",
      proposal: { entry: {
        id: "core/y", type: "core", scope: "global", project: null, title: "new title", summary: "new",
        path: "", status: "active", confidence: 1, importance: 5,
        createdAt: "2026-06-12", updatedAt: "2026-06-12", validFrom: null, validTo: null,
        sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
        originDevice: null, accessCount: 0, lastAccess: null } as never, body: "new body" },
    });
  }

  it("renders a create diff (no live target)", async () => {
    await seedProposal("create");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({});
    const out = logs.join("\n");
    expect(out).toMatch(/core\/y/);
    expect(out).toMatch(/create/);
  });

  it("renders an update diff with changed fields", async () => {
    await seedProposal("update");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({});
    const out = logs.join("\n");
    expect(out).toMatch(/title/);
    expect(out).toMatch(/old title/);
    expect(out).toMatch(/new title/);
  });

  it("--json emits a structured array", async () => {
    await seedProposal("update");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({ json: true });
    const parsed = JSON.parse(logs.join("\n"));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].targetKey).toBe("core/y");
    expect(parsed[0].fieldChanges.some((c: { field: string }) => c.field === "title")).toBe(true);
  });

  it("is read-only: writes nothing to memory/ or the index", async () => {
    await seedProposal("update");
    const before = JSON.parse((await import("node:fs")).readFileSync(join(repo, ".vibebook/index.memory.json"), "utf8"));
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({});
    const after = JSON.parse((await import("node:fs")).readFileSync(join(repo, ".vibebook/index.memory.json"), "utf8"));
    expect(after).toEqual(before);
  });
});
