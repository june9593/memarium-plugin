import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("skipWriteCmd", () => {
  let fakeHome: string, repo: string;
  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-skipw-"));
    vi.stubEnv("HOME", fakeHome);
    vi.resetModules();
    repo = join(fakeHome, ".memarium/session-repo");
    mkdirSync(join(repo, ".memarium"), { recursive: true });
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    writeFileSync(join(fakeHome, ".memarium/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "test", runner: "claude-cli",
    }));
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(fakeHome, { recursive: true, force: true }); });

  it("writes the input sessions into the local skip ledger and reports counts", async () => {
    const input = join(fakeHome, "skips.json");
    writeFileSync(input, JSON.stringify({ sessions: [{ sessionId: "s1", reason: "ping" }, { sessionId: "s2" }] }));
    const { skipWriteCmd } = await import("../../src/commands/skip-write.js");
    const { loadSkips } = await import("../../src/spool/skip-store.js");
    const r = await skipWriteCmd({ inputPath: input });
    expect(r).toEqual({ skipped: 2, total: 2 });
    const led = loadSkips(repo);
    expect(Object.keys(led.sessions).sort()).toEqual(["s1", "s2"]);
    expect(led.sessions.s1.reason).toBe("ping");
  });

  it("accepts a bare array and is idempotent across runs", async () => {
    const input = join(fakeHome, "skips.json");
    writeFileSync(input, JSON.stringify([{ sessionId: "s1" }]));
    const { skipWriteCmd } = await import("../../src/commands/skip-write.js");
    await skipWriteCmd({ inputPath: input });
    const r2 = await skipWriteCmd({ inputPath: input }); // same input again
    expect(r2).toEqual({ skipped: 0, total: 1 });
  });
});
