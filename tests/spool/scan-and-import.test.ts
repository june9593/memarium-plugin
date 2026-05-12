import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanAndImport } from "../../src/spool/scan-and-import.js";

describe("scanAndImport", () => {
  let fakeHome: string;
  let claudeProjectsDir: string;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-scan-"));
    vi.stubEnv("HOME", fakeHome);
    claudeProjectsDir = join(fakeHome, ".claude/projects");
    mkdirSync(claudeProjectsDir, { recursive: true });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  /** Helper: write a minimal Claude Code jsonl file. */
  function writeFakeJsonl(projectDir: string, sessionId: string, cwd: string) {
    mkdirSync(projectDir, { recursive: true });
    const lines = [
      JSON.stringify({ type: "user", message: { role: "user", content: "hi" }, sessionId, cwd, timestamp: "2026-05-10T00:00:00Z" }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: "hey" }, sessionId, cwd, timestamp: "2026-05-10T00:00:01Z" }),
    ];
    writeFileSync(join(projectDir, `${sessionId}.jsonl`), lines.join("\n") + "\n");
  }

  it("imports new sessions into spool/raw_sessions/<project>/", async () => {
    const projDir = join(claudeProjectsDir, "-Users-test-edge-src");
    writeFakeJsonl(projDir, "abc-123", "/Users/test/edge/src");

    const result = await scanAndImport({ projectFilter: null });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    const spoolDir = join(fakeHome, ".vibebook/session-repo/raw_sessions");
    expect(existsSync(spoolDir)).toBe(true);
    const subdirs = readdirSync(spoolDir);
    expect(subdirs.length).toBe(1);
    const subdirJsonls = readdirSync(join(spoolDir, subdirs[0]));
    expect(subdirJsonls).toContain("abc-123.jsonl");
  });

  it("is idempotent — running twice imports 1 then 0", async () => {
    const projDir = join(claudeProjectsDir, "-Users-test-edge-src");
    writeFakeJsonl(projDir, "abc-123", "/Users/test/edge/src");

    const r1 = await scanAndImport({ projectFilter: null });
    expect(r1.imported).toBe(1);

    const r2 = await scanAndImport({ projectFilter: null });
    expect(r2.imported).toBe(0);
    expect(r2.skipped).toBe(1);
  });

  it("with projectFilter, imports only sessions matching that project slug", async () => {
    writeFakeJsonl(join(claudeProjectsDir, "-Users-test-edge-src"), "s1", "/Users/test/edge/src");
    writeFakeJsonl(join(claudeProjectsDir, "-Users-test-foo-bar"), "s2", "/Users/test/foo/bar");

    const result = await scanAndImport({ projectFilter: "edge-src" });
    expect(result.imported).toBe(1);
    const spoolDir = join(fakeHome, ".vibebook/session-repo/raw_sessions");
    const subdirs = readdirSync(spoolDir);
    expect(subdirs).toEqual(["edge-src"]);
  });

  it("skips meta-project paths (.worktrees-, *-workspacestorage)", async () => {
    writeFakeJsonl(
      join(claudeProjectsDir, "-Users-test-.worktrees-foo"),
      "noisy",
      "/Users/test/.worktrees-foo"
    );
    const result = await scanAndImport({ projectFilter: null });
    expect(result.imported).toBe(0);
  });
});
