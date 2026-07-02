import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { firstRunCmd } from "../../src/commands/first-run.js";

describe("firstRunCmd", () => {
  let fakeHome: string;
  let originalPath: string | undefined;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-fr-"));
    vi.stubEnv("HOME", fakeHome);
    originalPath = process.env.PATH;
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    process.env.PATH = originalPath;
    logSpy.mockRestore();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("prints the nudge when npm memarium is NOT on PATH and state is fresh", async () => {
    process.env.PATH = "/usr/bin"; // a PATH dir that won't have a fake `memarium`
    await firstRunCmd();
    const allOutput = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("npm i -g memarium");
    // State file was written with firstRunNudgeShown=true
    const statePath = join(fakeHome, ".memarium/.plugin-state.json");
    expect(existsSync(statePath)).toBe(true);
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    expect(state.firstRunNudgeShown).toBe(true);
  });

  it("does NOT print the nudge a second time", async () => {
    process.env.PATH = "/usr/bin";
    await firstRunCmd();
    logSpy.mockClear();
    await firstRunCmd();
    expect(logSpy.mock.calls.length).toBe(0);
  });

  it("does NOT print the nudge when npm memarium is detected on PATH", async () => {
    // Create a fake `memarium` binary in a tmp dir and put it on PATH
    const binDir = mkdtempSync(join(tmpdir(), "vbp-bin-"));
    const fakeBin = join(binDir, "memarium");
    writeFileSync(fakeBin, "#!/bin/sh\necho 0.5.0", { mode: 0o755 });
    process.env.PATH = `${binDir}:/usr/bin`;
    try {
      await firstRunCmd();
      expect(logSpy.mock.calls.length).toBe(0);
      // State still records that we've checked once (so we don't re-detect endlessly)
      const statePath = join(fakeHome, ".memarium/.plugin-state.json");
      const state = JSON.parse(readFileSync(statePath, "utf8"));
      expect(state.firstRunNudgeShown).toBe(true);
    } finally {
      rmSync(binDir, { recursive: true, force: true });
    }
  });
});
