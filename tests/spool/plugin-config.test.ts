import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPluginConfig } from "../../src/spool/plugin-config.js";

describe("readPluginConfig", () => {
  let fakeHome: string;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-cfg-"));
    vi.stubEnv("HOME", fakeHome);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("returns a default config (repoPath = ~/.vibebook/session-repo) when config.json is absent", () => {
    const cfg = readPluginConfig();
    expect(cfg.repoPath).toBe(join(fakeHome, ".vibebook/session-repo"));
    expect(cfg.digestEnabled).toBe(true);
    expect(cfg.runner).toBe("claude-cli");
  });

  it("does NOT write config.json on first read (plugin is borrowed-tenant)", () => {
    readPluginConfig();
    expect(existsSync(join(fakeHome, ".vibebook/config.json"))).toBe(false);
  });

  it("returns the real config when ~/.vibebook/config.json exists", () => {
    mkdirSync(join(fakeHome, ".vibebook"), { recursive: true });
    const customRepo = join(fakeHome, "custom/repo");
    writeFileSync(
      join(fakeHome, ".vibebook/config.json"),
      JSON.stringify({
        repoPath: customRepo,
        repoUrl: "git@example.com:me/repo.git",
        deviceBranch: "macA",
        runner: "claude-cli",
        enableAggregateCI: true,
        includeReasoning: false,
        threadingConcurrency: 8,
        threadingMaxAttempts: 5,
        digestEnabled: true,
      }),
    );
    const cfg = readPluginConfig();
    expect(cfg.repoPath).toBe(customRepo);
    expect(cfg.includeReasoning).toBe(false);
    expect(cfg.deviceBranch).toBe("macA");
  });
});
