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
        "claude:s1": sess("s1"), "claude:s2": sess("s2"), "claude:s3": sess("s3"),
        "claude:s4": sess("s4"), "claude:s5": sess("s5"),
      },
    }));
    for (const id of ["s1", "s2", "s3", "s4"]) {
      const p = join(repo, rel(id));
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, `# session ${id}\n\n## User\n\ndo a thing in edge-memvc\n`);
    }
    // s5 is a memarium meta-session (first user turn is /memarium) — prepare
    // filters it out of newSessions but must return it in filteredMetaSessions.
    const p5 = join(repo, rel("s5"));
    mkdirSync(dirname(p5), { recursive: true });
    writeFileSync(p5, `# session s5\n\n## User\n\n/memarium\n`);
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

  it("exposes only ACTIVE episodic ids as reuse hints (excludes superseded + pinned)", async () => {
    // active e1 stays; a superseded and a pinned episodic must NOT be reuse
    // candidates (superseded → don't resurrect; pinned → gated, would fail the
    // non-gated memory-write batch on reuse).
    writeFileSync(join(repo, ".memarium/index.memory.json"), JSON.stringify({ version: 1, entries: {
      "episodic/edge-memvc/e1": memEntry({ id: "episodic/edge-memvc/e1", type: "episodic", path: "memory/episodic/edge-memvc/e1.md" }),
      "episodic/edge-memvc/old": memEntry({ id: "episodic/edge-memvc/old", type: "episodic", status: "superseded", path: "memory/episodic/edge-memvc/old.md" }),
      "episodic/edge-memvc/pin": memEntry({ id: "episodic/edge-memvc/pin", type: "episodic", status: "pinned", path: "memory/episodic/edge-memvc/pin.md" }),
    } }));
    const { buildPreparePayload } = await import("../../src/commands/prepare.js");
    const p = buildPreparePayload({ project: "edge-memvc" }) as unknown as Record<string, unknown>;
    expect(p.existingEpisodes).toEqual({ "edge-memvc": ["episodic/edge-memvc/e1"] });
    expect(p.existingTopics).toBeUndefined();
    expect(p.existingCards).toBeUndefined();
  });

  it("filters memarium meta-sessions out of newSessions but returns their FULL sessionId in filteredMetaSessions", async () => {
    const { buildPreparePayload } = await import("../../src/commands/prepare.js");
    const p = buildPreparePayload({ project: "edge-memvc" });
    expect(p.newSessions.map((s) => s.sessionId)).not.toContain(uuid("s5"));
    expect(p.filteredMetaSessions).toEqual([uuid("s5")]); // full id, so P9 can skip-ledger it
  });
});
