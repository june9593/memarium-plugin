import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("buildStatusPayload (#22 coverage)", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-status-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    writeFileSync(join(home, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    const sess = (id: string) => ({
      sessionId: id, shortId: id, tool: "claude", project: "edge-memvc",
      projectRaw: "/work/edge-memvc", startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T00:00:00Z",
      nameSlug: "x", displayName: "x", relativePath: `raw_sessions/claude/edge-memvc/2026-01-01/x__${id}.md`,
      sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x",
    });
    // 3 synced sessions
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": sess("s1"), "claude:s2": sess("s2"), "claude:s3": sess("s3") },
    }));
    // 1 episodic memory consumes s1 → 1 digested, 2 pending; + 1 semantic (typedMemory=2)
    const memEntry = (over: Record<string, unknown>) => ({
      scope: "project:edge-memvc", project: "edge-memvc", title: "t", summary: "s",
      status: "active", confidence: 0.8, importance: 2, createdAt: "2026-01-01", updatedAt: "2026-01-02",
      validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
      supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null, ...over,
    });
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "episodic/edge-memvc/e1": memEntry({ id: "episodic/edge-memvc/e1", type: "episodic", path: "memory/episodic/edge-memvc/e1.md", sourceSessions: ["s1"] }),
      "semantic/edge-memvc/f1": memEntry({ id: "semantic/edge-memvc/f1", type: "semantic", path: "memory/semantic/edge-memvc/f1.md" }),
    } }));
    writeFileSync(join(repo, ".memarium/index.qa.json"), JSON.stringify({ version: 1, entries: { q: {} } }));
    writeFileSync(join(repo, ".memarium/index.entity.json"), JSON.stringify({ version: 1, entries: { e: {} } }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("aggregates the session funnel + memory layer counts", async () => {
    const { buildStatusPayload } = await import("../../src/commands/status.js");
    const s = buildStatusPayload(repo);
    expect(s.sessions).toMatchObject({ total: 3, digested: 1, pending: 2, coveragePct: 33 });
    expect(s.episodes).toBe(1);
    expect(s.memory).toEqual({ typedMemory: 2, entities: 1, qa: 1 });
    expect(s.pendingByProject).toEqual([{ project: "edge-memvc", pending: 2 }]);
    // P0b: no aggregated overlay → local-only view.
    expect(s.crossDevice.overlayPresent).toBe(false);
    expect(s.crossDevice.overlayPath).toBeNull();
    expect(s.crossDevice.memory).toEqual({ local: 2, merged: 2, siblingOnly: 0 });
  });

  it("crossDevice counts sibling-only memory when the overlay is present (P0b)", async () => {
    const ovl = join(home, ".memarium", "aggregated", ".memarium");
    mkdirSync(ovl, { recursive: true });
    const ent = (over: Record<string, unknown>) => ({
      type: "core", scope: "global", project: null, title: "t", summary: "s",
      path: "memory/core/_global/x.md", status: "active", confidence: 1, importance: 5,
      createdAt: "2026-06-20", updatedAt: "2026-06-20", validFrom: null, validTo: null,
      sourceSessions: [], sourceCommits: [], sourceFiles: [], supersedes: null, entities: [],
      originDevice: "mini2", accessCount: 0, lastAccess: null, ...over,
    });
    writeFileSync(join(ovl, "index.memory.json"), JSON.stringify({
      version: 1, entries: {
        // truly sibling-only (absent from local)
        "core/sibling": ent({ id: "core/sibling" }),
        // SHARED id (episodic/edge-memvc/e1 exists locally), overlay copy strictly newer — must NOT count as sibling-only
        "episodic/edge-memvc/e1": ent({ id: "episodic/edge-memvc/e1", updatedAt: "2026-12-31", summary: "newer-from-sibling" }),
      },
    }));
    const { buildStatusPayload } = await import("../../src/commands/status.js");
    const s = buildStatusPayload(repo);
    expect(s.crossDevice.overlayPresent).toBe(true);
    // local=2 (e1 + f1), merged=3 (+core/sibling), siblingOnly=1 (only core/sibling
    // is absent from local; e1 exists locally even though the overlay copy won the merge).
    expect(s.crossDevice.memory).toEqual({ local: 2, merged: 3, siblingOnly: 1 });
  });

  it("coveragePct is 0 (not NaN) when there are no sessions", async () => {
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({ version: 1, entries: {} }));
    const { buildStatusPayload } = await import("../../src/commands/status.js");
    const s = buildStatusPayload(repo);
    expect(s.sessions).toMatchObject({ total: 0, digested: 0, pending: 0, coveragePct: 0 });
    expect(s.pendingByProject).toEqual([]);
  });
});
