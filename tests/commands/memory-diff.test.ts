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

  it("default list (create): scannable, no ∅, no body, shows targetKey + summary", async () => {
    await seedProposal("create");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({});
    const out = logs.join("\n");
    expect(out).toMatch(/core\/y/);          // exact targetKey
    expect(out).toMatch(/\(create\)/);
    expect(out).toMatch(/new/);              // entry.summary
    expect(out).not.toContain("∅");          // no field-dump noise for creates
    expect(out).not.toContain("new body");   // body never in the default list
    expect(out).not.toMatch(/changes:/);     // create shows no changed-field line
  });

  it("default list (update): shows changed field NAMES, no old→new, no body", async () => {
    await seedProposal("update");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({});
    const out = logs.join("\n");
    expect(out).toMatch(/core\/y/);
    expect(out).toMatch(/changes: .*title/); // changed field name appears
    expect(out).not.toContain("old title");  // old→new moved to --id detail
    expect(out).not.toContain("new body");   // body never in the default list
  });

  it("default list is ASCII (no emoji type icons)", async () => {
    await seedProposal("create");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({});
    const out = logs.join("\n");
    // no emoji / pictographic chars; ASCII labels like [core] only
    expect(out).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(out).toMatch(/\[core\]/);
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

  it("--json includes a display block with human-facing fields", async () => {
    await seedProposal("update");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({ json: true });
    const parsed = JSON.parse(logs.join("\n"));
    const d = parsed[0].display;
    expect(d.targetKey).toBe("core/y");
    expect(d.type).toBe("core");
    expect(d.title).toBe("new title");
    expect(d.summary).toBe("new");
    expect(d.action).toBe("update");
    expect(d.changedFields).toContain("title");
    expect(d.changedFields).toContain("summary");
    expect(typeof d.bodyLineCount).toBe("number");
    expect(typeof d.bodyPreview).toBe("string");
    // backward-compat: fieldChanges + newBody still present
    expect(parsed[0].fieldChanges.some((c: { field: string }) => c.field === "title")).toBe(true);
    expect(parsed[0].newBody).toBe("new body");
  });

  it("--json display.changedFields is empty for a create", async () => {
    await seedProposal("create");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({ json: true });
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed[0].display.action).toBe("create");
    expect(parsed[0].display.changedFields).toEqual([]);
  });

  it("--id (update): shows old→new and full body and approve/reject hints", async () => {
    await seedProposal("update");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({ id: "core/y" });
    const out = logs.join("\n");
    expect(out).toContain("old title");          // old→new only in detail mode
    expect(out).toContain("new title");
    expect(out).toContain("new body");           // full body shown here
    expect(out).toContain("core/y");             // exact targetKey
    expect(out).toMatch(/memory-approve --id core\/y/);
    expect(out).toMatch(/memory-reject --id core\/y/);
  });

  it("--id (create): shows full body, no ∅, with approve/reject hints", async () => {
    await seedProposal("create");
    const { memoryDiffCmd } = await import("../../src/commands/memory-diff.js");
    await memoryDiffCmd({ id: "core/y" });
    const out = logs.join("\n");
    expect(out).toContain("new body");
    expect(out).not.toContain("∅");
    expect(out).toMatch(/memory-approve --id core\/y/);
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
