import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("buildListProjectsPayload — memory-based counts + consumed tracking", () => {
  let fakeHome: string, repo: string;

  const uuid = (id: string) => `${id}-1111-2222-3333-444455556666`;
  const sess = (id: string) => ({
    sessionId: uuid(id), shortId: id, tool: "claude", project: "edge-memvc",
    projectRaw: "/work/edge-memvc", startedAt: "2026-01-01T00:00:00Z", endedAt: "2026-01-01T00:00:00Z",
    nameSlug: "x", displayName: "x", relativePath: `raw_sessions/claude/edge-memvc/2026-01-01/x__${id}.md`,
    sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x",
  });
  const memEntry = (over: Record<string, unknown>) => ({
    scope: "project:edge-memvc", project: "edge-memvc", title: "t", summary: "s",
    status: "active", confidence: 0.8, importance: 2, createdAt: "2026-01-01", updatedAt: "2026-01-05",
    validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null, ...over,
  });

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-lp-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: { "claude:s1": sess("s1"), "claude:s2": sess("s2"), "claude:s3": sess("s3") },
    }));
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "episodic/edge-memvc/e1": memEntry({ id: "episodic/edge-memvc/e1", type: "episodic",
        path: "memory/episodic/edge-memvc/e1.md", sourceSessions: [uuid("s1")], updatedAt: "2026-01-05" }),
      "semantic/edge-memvc/f1": memEntry({ id: "semantic/edge-memvc/f1", type: "semantic",
        path: "memory/semantic/edge-memvc/f1.md", updatedAt: "2026-01-03" }),
    } }));
    writeFileSync(join(repo, ".memarium/index.skips.json"), JSON.stringify({
      version: 1, sessions: { [uuid("s2")]: { reason: "meta", at: "2026-07-13" } },
    }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("counts episodes/memories from the memory index and consumed from episodic+skips", async () => {
    const { buildListProjectsPayload } = await import("../../src/commands/list-projects.js");
    const p = buildListProjectsPayload(repo);
    const s = p.projects.find((x) => x.project === "edge-memvc")!;
    expect(s.totalSessions).toBe(3);
    expect(s.consumedSessions).toBe(2);   // s1 (episodic) + s2 (skip ledger)
    expect(s.pendingSessions).toBe(1);    // s3 fresh
    expect(s.episodes).toBe(1);
    expect(s.memories).toBe(2);
    expect(s.lastTouchedAt).toBe("2026-01-05");
    // book fields are gone
    expect((s as unknown as Record<string, unknown>).chronicles).toBeUndefined();
    expect((s as unknown as Record<string, unknown>).topics).toBeUndefined();
  });

  it("survives a parseable-but-malformed memory index (non-object / missing-field / bad-type entries)", async () => {
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      bad1: 42, bad2: null, bad3: { type: "episodic" /* no project */ },
      bad4: { project: "edge-memvc", type: "garbage" /* invalid type */, updatedAt: "2026-09-09" },
      good: memEntry({ id: "episodic/edge-memvc/ok", type: "episodic",
        path: "memory/episodic/edge-memvc/ok.md", sourceSessions: [uuid("s1")] }),
    } }));
    const { buildListProjectsPayload } = await import("../../src/commands/list-projects.js");
    expect(() => buildListProjectsPayload(repo)).not.toThrow();
    const s = buildListProjectsPayload(repo).projects.find((x) => x.project === "edge-memvc")!;
    expect(s.episodes).toBe(1);  // only the well-formed entry counted
    expect(s.memories).toBe(1);  // bad4 (invalid type) must NOT inflate the count
    expect(s.consumedSessions).toBe(2); // s1 (good episodic) + s2 (skip ledger)
  });
});
