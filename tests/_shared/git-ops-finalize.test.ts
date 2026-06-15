import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";

describe("ensureLocalRepo + commitWhitelist", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "vbp-gitops-")); });
  afterEach(() => { vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

  it("ensureLocalRepo inits a non-git dir without a remote", async () => {
    const { ensureLocalRepo } = await import("../../src/_shared/git-ops.js");
    const repo = join(dir, "repo");
    const { git, initialized } = await ensureLocalRepo(repo);
    expect(initialized).toBe(true);
    expect(existsSync(join(repo, ".git"))).toBe(true);
    const remotes = await git.getRemotes(false);
    expect(remotes.length).toBe(0);
  });

  it("ensureLocalRepo reuses an existing git repo (initialized=false)", async () => {
    const repo = join(dir, "repo");
    mkdirSync(repo, { recursive: true });
    await simpleGit(repo).init();
    const { ensureLocalRepo } = await import("../../src/_shared/git-ops.js");
    const { initialized } = await ensureLocalRepo(repo);
    expect(initialized).toBe(false);
  });

  it("ensureLocalRepo sets a fallback identity when no global git identity exists", async () => {
    // Suppress global + system git config so the repo truly has no identity,
    // simulating a fresh container / machine. The fallback must kick in so the
    // first commit can't fail with "Author identity unknown".
    vi.stubEnv("GIT_CONFIG_GLOBAL", "/dev/null");
    vi.stubEnv("GIT_CONFIG_SYSTEM", "/dev/null");
    const { ensureLocalRepo } = await import("../../src/_shared/git-ops.js");
    const repo = join(dir, "repo");
    const { git } = await ensureLocalRepo(repo);
    const email = (await git.raw(["config", "user.email"])).trim();
    expect(email).toBe("vibebook@localhost");
  });

  it("commitWhitelist stages only the listed paths (not foreign files), commits, no push", async () => {
    const repo = join(dir, "repo");
    mkdirSync(join(repo, "raw_sessions"), { recursive: true });
    writeFileSync(join(repo, "raw_sessions", "a.md"), "x");
    writeFileSync(join(repo, "foreign.txt"), "not listed");
    const git = simpleGit(repo);
    await git.init();
    await git.addConfig("user.email", "t@t").addConfig("user.name", "t");
    const { commitWhitelist } = await import("../../src/_shared/git-ops.js");
    const branch = (await git.raw(["symbolic-ref", "--short", "HEAD"])).trim();
    const r = await commitWhitelist(git, repo, "msg", ["raw_sessions", "missing-dir"], { push: false, branch });
    expect(r.committed).toBe(true);
    expect(r.pushed).toBe(false);
    const tracked = (await git.raw(["ls-files"])).trim().split("\n");
    expect(tracked).toContain("raw_sessions/a.md");
    expect(tracked).not.toContain("foreign.txt");
  });

  it("commitWhitelist returns committed:false when nothing in the whitelist exists", async () => {
    const repo = join(dir, "repo");
    mkdirSync(repo, { recursive: true });
    const git = simpleGit(repo);
    await git.init();
    await git.addConfig("user.email", "t@t").addConfig("user.name", "t");
    const { commitWhitelist } = await import("../../src/_shared/git-ops.js");
    const r = await commitWhitelist(git, repo, "msg", ["raw_sessions", "book"], { push: false, branch: "main" });
    expect(r.committed).toBe(false);
    expect(r.staged).toBe(0);
  });
});
