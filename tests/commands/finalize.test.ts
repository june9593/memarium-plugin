import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";

describe("finalizeCmd", () => {
  let home: string, repo: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "vbp-final-"));
    vi.stubEnv("HOME", home);
    vi.resetModules();
    repo = join(home, ".vibebook/session-repo");
    mkdirSync(join(home, ".vibebook"), { recursive: true });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); rmSync(home, { recursive: true, force: true }); });

  function writeConfig(extra: Record<string, unknown>) {
    writeFileSync(join(home, ".vibebook/config.json"), JSON.stringify({
      repoPath: repo, repoUrl: "", deviceBranch: "",
      runner: "claude-cli", enableAggregateCI: false, includeReasoning: true,
      threadingConcurrency: 4, threadingMaxAttempts: 3, digestEnabled: true, ...extra,
    }));
  }
  function seedSpool() {
    mkdirSync(join(repo, "raw_sessions/claude/p/2026-06-15"), { recursive: true });
    writeFileSync(join(repo, "raw_sessions/claude/p/2026-06-15/s.md"), "# session\n");
    mkdirSync(join(repo, ".vibebook"), { recursive: true });
    writeFileSync(join(repo, ".vibebook/index.json"), "{}\n");
  }

  it("init-if-absent: inits repo and commits whitelist (no remote)", async () => {
    writeConfig({});
    seedSpool();
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    const r = await finalizeCmd({});
    expect(r.initialized).toBe(true);
    expect(r.committed).toBe(true);
    expect(r.pushed).toBe(false);
    expect(r.remote).toBe(false);
    expect(existsSync(join(repo, ".git"))).toBe(true);
    const tracked = (await simpleGit(repo).raw(["ls-files"])).trim().split("\n");
    expect(tracked).toContain("raw_sessions/claude/p/2026-06-15/s.md");
    expect(tracked).toContain(".vibebook/index.json");
  });

  it("whitelist safety: never commits a foreign dir", async () => {
    writeConfig({});
    seedSpool();
    mkdirSync(join(repo, "connect_extracts"), { recursive: true });
    writeFileSync(join(repo, "connect_extracts/secret.txt"), "do not push");
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    await finalizeCmd({});
    const tracked = (await simpleGit(repo).raw(["ls-files"])).trim().split("\n");
    expect(tracked.some((t) => t.startsWith("connect_extracts/"))).toBe(false);
    expect(tracked).toContain("raw_sessions/claude/p/2026-06-15/s.md");
  });

  it("never commits a foreign file even if it was already staged before finalize", async () => {
    // P1: git commit (no pathspec) would sweep in ALL staged files. A foreign
    // file staged before finalize must stay out of the commit.
    writeConfig({});
    mkdirSync(repo, { recursive: true });
    const g = simpleGit(repo);
    await g.init(["-b", "main"]);
    await g.addConfig("user.email", "t@t").addConfig("user.name", "t");
    writeFileSync(join(repo, "foreign-staged.txt"), "pre-staged foreign");
    await g.add(["foreign-staged.txt"]); // already in the index before finalize
    seedSpool();
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    const r = await finalizeCmd({});
    expect(r.committed).toBe(true);
    const inHead = (await simpleGit(repo).raw(["show", "--name-only", "--format=", "HEAD"])).trim().split("\n");
    expect(inHead).toContain("raw_sessions/claude/p/2026-06-15/s.md");
    expect(inHead).not.toContain("foreign-staged.txt");
    // the foreign file is left staged (not lost), just never committed
    const stillStaged = (await simpleGit(repo).raw(["diff", "--cached", "--name-only"])).trim().split("\n");
    expect(stillStaged).toContain("foreign-staged.txt");
  });

  it("commits entity + qa markdown AND their indexes", async () => {
    // P1: entity-write / qa-write update .vibebook/index.entity.json and
    // .vibebook/index.qa.json; merge-books needs them. They must be committed.
    writeConfig({});
    seedSpool();
    mkdirSync(join(repo, "memory/entities/p"), { recursive: true });
    writeFileSync(join(repo, "memory/entities/p/foo.md"), "# foo\n");
    mkdirSync(join(repo, "memory/qa/p"), { recursive: true });
    writeFileSync(join(repo, "memory/qa/p/q.md"), "# q\n");
    writeFileSync(join(repo, ".vibebook/index.entity.json"), "{}\n");
    writeFileSync(join(repo, ".vibebook/index.qa.json"), "{}\n");
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    await finalizeCmd({});
    const tracked = (await simpleGit(repo).raw(["ls-files"])).trim().split("\n");
    expect(tracked).toContain("memory/entities/p/foo.md");
    expect(tracked).toContain("memory/qa/p/q.md");
    expect(tracked).toContain(".vibebook/index.entity.json");
    expect(tracked).toContain(".vibebook/index.qa.json");
  });

  it("resolves a repoPath containing ~ consistently (whitelist still found)", async () => {
    // cfg.repoPath with a literal ~ must be expanded for BOTH the init and the
    // whitelist existsSync checks, else nothing would be staged. HOME is stubbed
    // to `home`, so "~/.vibebook/session-repo" resolves to the seeded `repo`.
    writeConfig({ repoPath: "~/.vibebook/session-repo" });
    seedSpool();
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    const r = await finalizeCmd({});
    expect(r.committed).toBe(true);
    const tracked = (await simpleGit(repo).raw(["ls-files"])).trim().split("\n");
    expect(tracked).toContain("raw_sessions/claude/p/2026-06-15/s.md");
  });

  it("idempotent: a second finalize with no new changes commits nothing", async () => {
    writeConfig({});
    seedSpool();
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    await finalizeCmd({});
    const r2 = await finalizeCmd({});
    expect(r2.committed).toBe(false);
  });

  it("with remote: commits and pushes to origin", async () => {
    const bare = join(home, "origin.git");
    await simpleGit().init(["--bare", bare]);
    mkdirSync(repo, { recursive: true });
    const g = simpleGit(repo);
    await g.init(["-b", "main"]);
    await g.addConfig("user.email", "t@t").addConfig("user.name", "t");
    await g.addRemote("origin", bare);
    writeConfig({ repoUrl: bare, deviceBranch: "main" });
    seedSpool();
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    const r = await finalizeCmd({});
    expect(r.remote).toBe(true);
    expect(r.committed).toBe(true);
    expect(r.pushed).toBe(true);
    const log = (await simpleGit(bare).raw(["log", "--oneline", "main"])).trim();
    expect(log).toMatch(/finalize digest/);
  });

  it("--no-push: with a remote, commits locally but does not push", async () => {
    const bare = join(home, "origin2.git");
    await simpleGit().init(["--bare", bare]);
    mkdirSync(repo, { recursive: true });
    const g = simpleGit(repo);
    await g.init(["-b", "main"]);
    await g.addConfig("user.email", "t@t").addConfig("user.name", "t");
    await g.addRemote("origin", bare);
    writeConfig({ repoUrl: bare, deviceBranch: "main" });
    seedSpool();
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    const r = await finalizeCmd({ noPush: true });
    expect(r.committed).toBe(true);
    expect(r.pushed).toBe(false);
    let bareLog = "";
    try { bareLog = (await simpleGit(bare).raw(["log", "--oneline", "main"])).trim(); } catch { bareLog = ""; }
    expect(bareLog).toBe("");
  });

  it("no crash when repoPath is a fresh path and nothing is seeded", async () => {
    writeConfig({});
    const { finalizeCmd } = await import("../../src/commands/finalize.js");
    const r = await finalizeCmd({});
    expect(r.committed).toBe(false);
    expect(r.initialized).toBe(true);
  });
});
