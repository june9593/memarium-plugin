import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { orchestrateCmd } from "../../src/digest/orchestrator.js";
import { listProjectsCmd } from "../../src/commands/list-projects.js";
import { prepareCmd } from "../../src/commands/prepare.js";

/**
 * Autonomy invariant (spec patch 1, §1):
 *   A user with only the plugin (no npm vibebook on PATH, no ~/.vibebook/)
 *   must be able to run /vibebook end-to-end. This test plants jsonl
 *   sessions, runs orchestrate → list-projects → prepare, and asserts each
 *   produces non-empty output.
 *
 * If this test starts failing, plugin autonomy is broken — likely a missing
 * writer step or a stale assumption about config.json existing.
 */
describe("plugin autonomy (no npm CLI, no ~/.vibebook/ at start)", () => {
  let fakeHome: string;
  let claudeProjectsDir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stdoutChunks: string[];

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-aut-"));
    vi.stubEnv("HOME", fakeHome);
    // Strip PATH so command -v vibebook in first-run cannot accidentally
    // detect a real npm CLI installation.
    vi.stubEnv("PATH", "/usr/bin:/bin");
    claudeProjectsDir = join(fakeHome, ".claude/projects");
    mkdirSync(claudeProjectsDir, { recursive: true });
    stdoutChunks = [];
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    stdoutSpy.mockRestore();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  function writeFakeJsonl(projectDir: string, sessionId: string, cwd: string) {
    mkdirSync(projectDir, { recursive: true });
    const lines = [
      JSON.stringify({ type: "user", message: { role: "user", content: "hi" }, sessionId, cwd, timestamp: "2026-05-13T00:00:00Z" }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: "hey" }, sessionId, cwd, timestamp: "2026-05-13T00:00:01Z" }),
    ];
    writeFileSync(join(projectDir, `${sessionId}.jsonl`), lines.join("\n") + "\n");
  }

  it("orchestrate → list-projects → prepare all succeed end-to-end on a fresh machine", async () => {
    // Plant 2 sessions in the same project.
    writeFakeJsonl(join(claudeProjectsDir, "-Users-test-edge-src"), "ses-1", "/Users/test/edge/src");
    writeFakeJsonl(join(claudeProjectsDir, "-Users-test-edge-src"), "ses-2", "/Users/test/edge/src");

    // Pre-conditions: no ~/.vibebook/ exists at all.
    expect(existsSync(join(fakeHome, ".vibebook"))).toBe(false);

    // Step 1: orchestrate project mode.
    await orchestrateCmd({ mode: "project", cwd: "/Users/test/edge/src" });
    const orchestrateOut = JSON.parse(stdoutChunks.join(""));
    expect(orchestrateOut.mode).toBe("project");
    expect(orchestrateOut.project).toBe("edge-src");
    expect(orchestrateOut.scan.imported).toBe(2);

    // Spool was created on demand.
    expect(existsSync(join(fakeHome, ".vibebook/session-repo/raw_sessions"))).toBe(true);
    expect(existsSync(join(fakeHome, ".vibebook/session-repo/book"))).toBe(true);
    // index.json was written by plugin (this is the autonomy fix).
    expect(existsSync(join(fakeHome, ".vibebook/session-repo/.vibebook/index.json"))).toBe(true);
    // Plugin did NOT write config.json — that's npm CLI's territory.
    expect(existsSync(join(fakeHome, ".vibebook/config.json"))).toBe(false);

    // Reset stdout for next call.
    stdoutChunks = [];

    // Step 2: list-projects must show edge-src with 2 sessions.
    await listProjectsCmd();
    const listOut = JSON.parse(stdoutChunks.join(""));
    expect(listOut.projects).toBeInstanceOf(Array);
    const edgeSrc = listOut.projects.find((p: { project: string }) => p.project === "edge-src");
    expect(edgeSrc).toBeDefined();
    expect(edgeSrc.totalSessions).toBeGreaterThanOrEqual(2);

    // Reset stdout.
    stdoutChunks = [];

    // Step 3: prepare must return both new sessions.
    await prepareCmd({ cwd: "/Users/test/edge/src" });
    const prepareOut = JSON.parse(stdoutChunks.join(""));
    expect(prepareOut.project).toBe("edge-src");
    expect(prepareOut.newSessions).toBeInstanceOf(Array);
    expect(prepareOut.newSessions.length).toBe(2);
    const sessionIds = prepareOut.newSessions.map((s: { sessionId: string }) => s.sessionId).sort();
    expect(sessionIds).toEqual(["ses-1", "ses-2"]);
  });
});
