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
    repo = join(home, ".vibebook/session-repo");
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
    mkdirSync(join(home, ".vibebook"), { recursive: true });
    writeFileSync(join(home, ".vibebook/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    const sess = (id: string) => ({
      sessionId: id, shortId: id, tool: "claude", project: "edge-memvc",
      projectRaw: "/work/edge-memvc", startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T00:00:00Z",
      nameSlug: "x", displayName: "x", relativePath: `raw_sessions/claude/edge-memvc/2026-01-01/x__${id}.md`,
      sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x",
    });
    // 3 synced sessions
    writeFileSync(join(repo, ".vibebook/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": sess("s1"), "claude:s2": sess("s2"), "claude:s3": sess("s3") },
    }));
    // 1 chronicle consuming s1 → 1 digested, 2 pending
    writeFileSync(join(repo, ".vibebook/index.book.json"), JSON.stringify({
      version: 2, chronicles: { c1: {
        threadId: "c1", project: "edge-memvc", title: "T", sessionIds: ["s1"],
        path: "book/edge-memvc/chronicle/c1.md", createdAt: "2026-01-01", updatedAt: "2026-01-02", tags: [],
      } }, topics: {}, cards: {},
    }));
    writeFileSync(join(repo, ".vibebook/index.memory.json"), JSON.stringify({ version: 1, entries: { a: {}, b: {} } }));
    writeFileSync(join(repo, ".vibebook/index.qa.json"), JSON.stringify({ version: 1, entries: { q: {} } }));
    writeFileSync(join(repo, ".vibebook/index.entity.json"), JSON.stringify({ version: 1, entries: { e: {} } }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  it("aggregates the session funnel + book/memory layer counts", async () => {
    const { buildStatusPayload } = await import("../../src/commands/status.js");
    const s = buildStatusPayload(repo);
    expect(s.sessions).toMatchObject({ total: 3, digested: 1, pending: 2, coveragePct: 33 });
    expect(s.book.chronicles).toBe(1);
    expect(s.memory).toEqual({ typedMemory: 2, entities: 1, qa: 1 });
    expect(s.pendingByProject).toEqual([{ project: "edge-memvc", pending: 2 }]);
    // P0b: no aggregated overlay → local-only view.
    expect(s.crossDevice.overlayPresent).toBe(false);
    expect(s.crossDevice.overlayPath).toBeNull();
    expect(s.crossDevice.memory).toEqual({ local: 2, merged: 2, siblingOnly: 0 });
  });

  it("crossDevice counts sibling-only memory when the overlay is present (P0b)", async () => {
    const ovl = join(home, ".vibebook", "aggregated", ".vibebook");
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
        // SHARED id ("a" exists locally), overlay copy strictly newer — must NOT count as sibling-only
        "a": ent({ id: "a", updatedAt: "2026-12-31", summary: "newer-from-sibling" }),
      },
    }));
    const { buildStatusPayload } = await import("../../src/commands/status.js");
    const s = buildStatusPayload(repo);
    expect(s.crossDevice.overlayPresent).toBe(true);
    // local=2 (core/g + semantic), merged=3 (+core/sibling), siblingOnly=1 (only core/sibling
    // is absent from local; core/g exists locally even though overlay won the merge).
    expect(s.crossDevice.memory).toEqual({ local: 2, merged: 3, siblingOnly: 1 });
  });

  it("coveragePct is 0 (not NaN) when there are no sessions", async () => {
    writeFileSync(join(repo, ".vibebook/index.json"), JSON.stringify({ version: 1, entries: {} }));
    const { buildStatusPayload } = await import("../../src/commands/status.js");
    const s = buildStatusPayload(repo);
    expect(s.sessions).toMatchObject({ total: 0, digested: 0, pending: 0, coveragePct: 0 });
    expect(s.pendingByProject).toEqual([]);
  });
});
