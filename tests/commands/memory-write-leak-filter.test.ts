import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Command-level end-to-end for the deterministic leak filter: a memory carrying a
// machine-specific absolute home path or a secret-shaped token is refused before
// anything is persisted — on BOTH the auto-write (memory-write) and the
// human-review (memory-propose) routes. Repo-relative paths / API names must NOT
// be over-blocked. Counterpart to the pure leak-scan.test.ts.
describe("memory write leak filter", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-leak-"));
    vi.stubEnv("HOME", home); vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli" }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  function semanticItem(body: string, summary = "s") {
    return [{ entry: {
      id: "semantic/p/leaky", type: "semantic", scope: "project:p", project: "p",
      title: "t", summary, status: "active", confidence: 0.8, importance: 2,
      createdAt: "2026-07-19", updatedAt: "2026-07-19", validFrom: null, validTo: null,
      sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    }, body }];
  }

  it("memory-write refuses a (non-gated) semantic item with an absolute home path — writes nothing", async () => {
    const input = join(home, "path.json");
    writeFileSync(input, JSON.stringify(semanticItem("the crash is in /Users/yueliu/edge/PraestoClaw/apps/x.py line 40")));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    const err = await memoryWriteCmd({ inputPath: input }).then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/home-path leak/);
    expect(err!.message).toMatch(/semantic\/p\/leaky/);
    expect(existsSync(join(repo, "memory/semantic/p/leaky.md"))).toBe(false);
  });

  it("memory-write refuses a secret-shaped token (in the summary field too)", async () => {
    const input = join(home, "secret.json");
    writeFileSync(input, JSON.stringify(semanticItem("clean body", "set key sk-ABCdef0123456789ABCdef01 in env")));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    const err = await memoryWriteCmd({ inputPath: input }).then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/secret leak/);
    expect(existsSync(join(repo, "memory/semantic/p/leaky.md"))).toBe(false);
  });

  it("does NOT over-block a clean item that mentions repo-relative paths + API names", async () => {
    const input = join(home, "clean.json");
    writeFileSync(input, JSON.stringify(semanticItem(
      "VNRecognizeTextRequest reads apps/client_agent/agent/tools/filesystem.py; flag msMacLiquidGlassBubbles")));
    const { memoryWriteCmd } = await import("../../src/commands/memory-write.js");
    const report = await memoryWriteCmd({ inputPath: input });
    expect(report.written).toBe(1);
    expect(existsSync(join(repo, "memory/semantic/p/leaky.md"))).toBe(true);
  });

  it("memory-propose also refuses a gated procedural item carrying a home path", async () => {
    const input = join(home, "proc.json");
    writeFileSync(input, JSON.stringify([{ entry: {
      id: "procedural/p/fix", type: "procedural", scope: "project:p", project: "p",
      title: "t", summary: "s", status: "active", confidence: 0.9, importance: 3,
      createdAt: "2026-07-19", updatedAt: "2026-07-19", validFrom: null, validTo: null,
      sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    }, body: "run the script under /Users/yueliu/edge/PraestoClaw/scripts/build.sh", rationale: "x" }]));
    const { memoryProposeCmd } = await import("../../src/commands/memory-propose.js");
    const err = await memoryProposeCmd({ inputPath: input }).then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/memory-propose: refusing to write "procedural\/p\/fix" .* home-path leak/);
  });

  it("memory-approve refuses a queued proposal that carries a leak (hand-edited / pre-filter) — the apply sink is fail-closed", async () => {
    // Inject a leaky proposal straight into the queue, bypassing memory-propose's
    // queue-time check — simulating a proposal edited on disk, or queued before
    // this filter shipped. The apply sink must still refuse it at approval time.
    const { writeProposal } = await import("../../src/memory/proposal-store.js");
    const entry = {
      id: "procedural/p/leaky-approved", type: "procedural", scope: "project:p", project: "p",
      title: "t", summary: "s", status: "active", confidence: 0.9, importance: 3,
      createdAt: "2026-07-19", updatedAt: "2026-07-19", validFrom: null, validTo: null,
      sourceSessions: ["s1"], sourceCommits: [], sourceFiles: [], supersedes: null,
      entities: [], originDevice: null, accessCount: 0, lastAccess: null,
    };
    writeProposal(repo, {
      proposalId: "procedural__p__leaky-approved", targetKey: "procedural/p/leaky-approved",
      proposedEntryId: entry.id, action: "create", rationale: null, sourceSession: null,
      createdAt: "2026-07-19T00:00:00Z",
      proposal: { entry: entry as never, body: "first run /Users/yueliu/secret/build.sh, then commit" },
    });
    const { memoryApproveCmd } = await import("../../src/commands/memory-approve.js");
    const err = await memoryApproveCmd({ id: "procedural/p/leaky-approved" }).then(() => null, (e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err!.message).toMatch(/home-path leak/);
    // nothing persisted — the sink threw before writing
    expect(existsSync(join(repo, "memory/procedural/p/leaky-approved.md"))).toBe(false);
  });
});
