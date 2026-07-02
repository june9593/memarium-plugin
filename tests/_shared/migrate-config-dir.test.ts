import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { migrateLegacyConfigDir } from "../../src/_shared/config.js";

describe("migrateLegacyConfigDir (mirror of npm canonical)", () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-cfgmig-"));
    vi.stubEnv("HOME", home);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(home, { recursive: true, force: true });
  });

  function plantLegacy(cfg: Record<string, unknown>): string {
    const legacy = join(home, ".vibebook");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, "config.json"), JSON.stringify(cfg, null, 2) + "\n");
    return legacy;
  }

  it("moves ~/.vibebook → ~/.memarium and rewrites the absolute repoPath", () => {
    plantLegacy({ repoPath: join(home, ".vibebook", "session-repo"), repoUrl: "", deviceBranch: "" });
    migrateLegacyConfigDir();
    expect(existsSync(join(home, ".vibebook"))).toBe(false);
    expect(existsSync(join(home, ".memarium"))).toBe(true);
    const raw = readFileSync(join(home, ".memarium", "config.json"), "utf8");
    expect(JSON.parse(raw).repoPath).toBe(join(home, ".memarium", "session-repo"));
    expect(raw).not.toContain(".vibebook");
  });

  it("no-op when ~/.memarium already exists (never touches legacy)", () => {
    plantLegacy({ repoPath: "x" });
    mkdirSync(join(home, ".memarium"), { recursive: true });
    migrateLegacyConfigDir();
    expect(existsSync(join(home, ".vibebook"))).toBe(true);
  });

  it("no-op (no throw) when legacy ~/.vibebook is absent", () => {
    expect(() => migrateLegacyConfigDir()).not.toThrow();
    expect(existsSync(join(home, ".memarium"))).toBe(false);
  });

  it("repairs the aggregated worktree so it stays usable after the move", () => {
    const legacy = join(home, ".vibebook");
    const repo = join(legacy, "session-repo");
    const agg = join(legacy, "aggregated");
    mkdirSync(repo, { recursive: true });
    const g = (args: string[]) => execFileSync("git", ["-C", repo, ...args], { stdio: "pipe" });
    g(["init", "-b", "main"]);
    g(["config", "user.email", "t@t"]);
    g(["config", "user.name", "t"]);
    writeFileSync(join(repo, "f.txt"), "hi\n");
    g(["add", "."]);
    g(["commit", "-m", "init"]);
    // Session-repo sits on a device branch while the worktree checks out main.
    g(["checkout", "-b", "device"]);
    g(["worktree", "add", agg, "main"]);
    writeFileSync(join(legacy, "config.json"), JSON.stringify({ repoPath: repo }) + "\n");

    migrateLegacyConfigDir();

    const newRepo = join(home, ".memarium", "session-repo");
    const newAgg = join(home, ".memarium", "aggregated");
    expect(existsSync(join(newAgg, ".git"))).toBe(true);
    const st = execFileSync("git", ["-C", newAgg, "status", "--porcelain"], { stdio: "pipe" }).toString();
    expect(st).toBe("");
    const list = execFileSync("git", ["-C", newRepo, "worktree", "list"], { stdio: "pipe" }).toString();
    expect(list).toContain(newAgg);
  });
});
