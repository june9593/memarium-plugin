import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

describe("buildPreparePayload — consumed = episodic sourceSessions ∪ skip ledger", () => {
  let fakeHome: string, repo: string;

  // shortId is the 8-char truncation of sessionId (they DIFFER in reality) —
  // sourceSessions/skips must key on the FULL sessionId, not shortId.
  const uuid = (id: string) => `${id}-1111-2222-3333-444455556666`;
  const rel = (id: string) => `raw_sessions/claude/edge-memvc/2026-01-01/x__${id}.md`;
  const sess = (id: string) => ({
    sessionId: uuid(id), shortId: id, tool: "claude", project: "edge-memvc",
    projectRaw: "/work/edge-memvc", startedAt: "2026-01-01T00:00:00Z", endedAt: `2026-01-0${id.slice(1)}T00:00:00Z`,
    nameSlug: "x", displayName: "x", relativePath: rel(id),
    sourcePath: "/x.jsonl", sourceMtimeMs: 1, sourceSha256: "x",
  });
  const memEntry = (over: Record<string, unknown>) => ({
    scope: "project:edge-memvc", project: "edge-memvc", title: "t", summary: "s",
    status: "active", confidence: 0.8, importance: 2, createdAt: "2026-01-01", updatedAt: "2026-01-02",
    validFrom: null, validTo: null, sourceSessions: [], sourceCommits: [], sourceFiles: [],
    supersedes: null, entities: [], originDevice: null, accessCount: 0, lastAccess: null, ...over,
  });

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-prep-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
    // 4 synced sessions, each with a (non-meta) .md on disk
    writeFileSync(join(repo, ".memarium/index.json"), JSON.stringify({
      version: 1, entries: {
        "claude:s1": sess("s1"), "claude:s2": sess("s2"), "claude:s3": sess("s3"), "claude:s4": sess("s4"),
      },
    }));
    for (const id of ["s1", "s2", "s3", "s4"]) {
      const p = join(repo, rel(id));
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, `# session ${id}\n\nuser: do a thing in edge-memvc\n`);
    }
    // memory: s1 consumed by an EPISODIC (receipt = FULL sessionId); s3 referenced
    // ONLY by a SEMANTIC (derived → NOT consumed)
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "episodic/edge-memvc/e1": memEntry({ id: "episodic/edge-memvc/e1", type: "episodic",
        path: "memory/episodic/edge-memvc/e1.md", sourceSessions: [uuid("s1")] }),
      "semantic/edge-memvc/f1": memEntry({ id: "semantic/edge-memvc/f1", type: "semantic",
        path: "memory/semantic/edge-memvc/f1.md", sourceSessions: [uuid("s3")] }),
    } }));
    // skip ledger: s2 intentionally skipped (keyed by FULL sessionId)
    writeFileSync(join(repo, ".memarium/index.skips.json"), JSON.stringify({
      version: 1, sessions: { [uuid("s2")]: { reason: "meta", at: "2026-07-13" } },
    }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("digests only sessions not consumed by an episodic and not skip-ledgered; a semantic-only session stays PENDING", async () => {
    const { buildPreparePayload } = await import("../../src/commands/prepare.js");
    const p = buildPreparePayload({ project: "edge-memvc" });
    const ids = p.newSessions.map((s) => s.sessionId).sort();
    // s1 = episodic-consumed, s2 = skip-ledgered → both consumed (matched by FULL
    // sessionId, not the 8-char shortId). s3 = referenced ONLY by a semantic
    // (derived) → STILL pending. s4 = fresh.
    expect(ids).toEqual([uuid("s3"), uuid("s4")]);
    expect(p.meta.sessionsAlreadyDigested).toBe(2);
  });

  it("exposes existing episodic ids per project (dedup hint), not topics/cards", async () => {
    const { buildPreparePayload } = await import("../../src/commands/prepare.js");
    const p = buildPreparePayload({ project: "edge-memvc" }) as unknown as Record<string, unknown>;
    expect(p.existingEpisodes).toEqual({ "edge-memvc": ["episodic/edge-memvc/e1"] });
    expect(p.existingTopics).toBeUndefined();
    expect(p.existingCards).toBeUndefined();
  });
});
