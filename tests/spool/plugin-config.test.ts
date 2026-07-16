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

  it("returns a default config (repoPath = ~/.memarium/session-repo) when config.json is absent", () => {
    const cfg = readPluginConfig();
    expect(cfg.repoPath).toBe(join(fakeHome, ".memarium/session-repo"));
    expect(cfg.digestEnabled).toBe(true);
    expect(cfg.runner).toBe("claude-cli");
  });

  it("does NOT write config.json on first read (plugin is borrowed-tenant)", () => {
    readPluginConfig();
    expect(existsSync(join(fakeHome, ".memarium/config.json"))).toBe(false);
  });

  it("returns the real config when ~/.memarium/config.json exists", () => {
    mkdirSync(join(fakeHome, ".memarium"), { recursive: true });
    const customRepo = join(fakeHome, "custom/repo");
    writeFileSync(
      join(fakeHome, ".memarium/config.json"),
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

describe("readPluginConfig — MEMARIUM_DIR override", () => {
  let home: string, dir: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-cfg-home-"));
    dir = mkdtempSync(join(tmpdir(), "vbp-cfg-mdir-"));
    vi.stubEnv("HOME", home);
  });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); rmSync(dir, { recursive: true, force: true }); });

  it("MEMARIUM_DIR set + config present → reads <MEMARIUM_DIR>/config.json (not ~/.memarium)", () => {
    vi.stubEnv("MEMARIUM_DIR", dir);
    writeFileSync(join(dir, "config.json"), JSON.stringify({
      repoPath: join(dir, "session-repo"), repoUrl: "", deviceBranch: "eval", runner: "claude-cli" }));
    expect(readPluginConfig().repoPath).toBe(join(dir, "session-repo"));
    expect(readPluginConfig().deviceBranch).toBe("eval");
  });

  it("MEMARIUM_DIR set + NO config → default repoPath = <MEMARIUM_DIR>/session-repo", () => {
    vi.stubEnv("MEMARIUM_DIR", dir);
    expect(readPluginConfig().repoPath).toBe(join(dir, "session-repo"));
  });

  it("MEMARIUM_DIR unset → falls back to homedir()/.memarium (back-compat)", () => {
    expect(readPluginConfig().repoPath).toBe(join(home, ".memarium", "session-repo"));
  });

  it("MEMARIUM_DIR set → legacy ~/.vibebook migration is SKIPPED (sandbox must not touch the real home)", () => {
    vi.stubEnv("MEMARIUM_DIR", dir);
    // Seed a legacy pre-rename dir under the real HOME. If the migration guard
    // regressed, readPluginConfig would rename it into HOME/.memarium.
    const legacy = join(home, ".vibebook");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, "config.json"), JSON.stringify({
      repoPath: join(legacy, "session-repo"), repoUrl: "", deviceBranch: "legacy", runner: "claude-cli" }));
    readPluginConfig();
    // Migration must NOT have fired: legacy stays put, real HOME/.memarium is not created.
    expect(existsSync(legacy)).toBe(true);
    expect(existsSync(join(home, ".memarium"))).toBe(false);
  });
});
