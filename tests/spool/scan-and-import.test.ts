import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, readdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanAndImport } from "../../src/spool/scan-and-import.js";

const fixturesDir = join(fileURLToPath(new URL(".", import.meta.url)), "..", "fixtures");

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

  /** Helper: write a minimal Claude Code jsonl file. Content must be ≥10
   *  chars or the 0.6.3+ sanitizer drops it as noise → empty messages →
   *  scan-and-import skips the whole session as an empty shell. */
  function writeFakeJsonl(projectDir: string, sessionId: string, cwd: string) {
    mkdirSync(projectDir, { recursive: true });
    const lines = [
      JSON.stringify({ type: "user", message: { role: "user", content: "fix the auth bug in the login flow" }, sessionId, cwd, timestamp: "2026-05-10T00:00:00Z" }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: "Looking into it now, reading the auth code." }, sessionId, cwd, timestamp: "2026-05-10T00:00:01Z" }),
    ];
    writeFileSync(join(projectDir, `${sessionId}.jsonl`), lines.join("\n") + "\n");
  }

  it("imports new sessions: writes .md under raw_sessions/<tool>/<project>/<date>/", async () => {
    const projDir = join(claudeProjectsDir, "-Users-test-code-src");
    writeFakeJsonl(projDir, "abc-123", "/Users/test/code/src");

    const result = await scanAndImport({ projectFilter: null });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);

    const spoolRoot = join(fakeHome, ".memarium/session-repo");
    // raw_sessions/claude/<project-slug>/<YYYY-MM-DD>/ should now contain
    // exactly one .md. 0.2.0 dropped the .raw.json sibling.
    const claudeDir = join(spoolRoot, "raw_sessions/claude");
    expect(existsSync(claudeDir)).toBe(true);
    const projectSlugs = readdirSync(claudeDir);
    expect(projectSlugs.length).toBe(1);
    const dates = readdirSync(join(claudeDir, projectSlugs[0]));
    expect(dates.length).toBe(1);
    const files = readdirSync(join(claudeDir, projectSlugs[0], dates[0]));
    const md = files.find((f) => f.endsWith(".md"));
    expect(md).toBeTruthy();
    // No .raw.json — single-file md format since 0.2.0 (matches npm memarium >= 0.6)
    expect(files.find((f) => f.endsWith(".raw.json"))).toBeUndefined();
  });

  it("writes ~/.memarium/session-repo/.memarium/index.json with the imported session entry", async () => {
    const projDir = join(claudeProjectsDir, "-Users-test-code-src");
    writeFakeJsonl(projDir, "abc-123", "/Users/test/code/src");

    await scanAndImport({ projectFilter: null });

    const indexPath = join(fakeHome, ".memarium/session-repo/.memarium/index.json");
    expect(existsSync(indexPath)).toBe(true);
    const idx = JSON.parse(readFileSync(indexPath, "utf8"));
    expect(idx.version).toBe(1);
    expect(Object.keys(idx.entries).length).toBe(1);
    const entry = Object.values(idx.entries)[0] as { sessionId: string; tool: string; project: string };
    expect(entry.sessionId).toBe("abc-123");
    expect(entry.tool).toBe("claude");
    // code-src is the parent-basename slug for /Users/test/code/src
    expect(entry.project).toBe("code-src");
  });

  it("is idempotent — running twice imports 1 then 0 (mtime unchanged)", async () => {
    const projDir = join(claudeProjectsDir, "-Users-test-code-src");
    writeFakeJsonl(projDir, "abc-123", "/Users/test/code/src");

    const r1 = await scanAndImport({ projectFilter: null });
    expect(r1.imported).toBe(1);

    const r2 = await scanAndImport({ projectFilter: null });
    expect(r2.imported).toBe(0);
    expect(r2.skipped).toBe(1);
  });

  it("with projectFilter, imports only sessions matching that project slug", async () => {
    writeFakeJsonl(join(claudeProjectsDir, "-Users-test-code-src"), "s1", "/Users/test/code/src");
    writeFakeJsonl(join(claudeProjectsDir, "-Users-test-foo"), "s2", "/Users/test/foo");

    const result = await scanAndImport({ projectFilter: "code-src" });
    expect(result.imported).toBe(1);

    const spoolRoot = join(fakeHome, ".memarium/session-repo");
    const projectSlugs = readdirSync(join(spoolRoot, "raw_sessions/claude"));
    expect(projectSlugs).toEqual(["code-src"]);
  });

  it("imports Codex Desktop and interactive CLI sessions without npm", async () => {
    cpSync(join(fixturesDir, "codex"), join(fakeHome, ".codex"), { recursive: true });

    const result = await scanAndImport({ projectFilter: null });
    expect(result.imported).toBe(4);
    const indexPath = join(fakeHome, ".memarium/session-repo/.memarium/index.json");
    const idx = JSON.parse(readFileSync(indexPath, "utf8"));
    expect(Object.keys(idx.entries).every((key) => key.startsWith("codex:"))).toBe(true);
    expect(existsSync(join(fakeHome, ".memarium/session-repo/raw_sessions/codex"))).toBe(true);

    const second = await scanAndImport({ projectFilter: null });
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(4);
  });

  it("removes the superseded Codex render after a title-only rename", async () => {
    const codexRoot = join(fakeHome, ".codex");
    cpSync(join(fixturesDir, "codex"), codexRoot, { recursive: true });
    await scanAndImport({ projectFilter: null });
    const indexPath = join(fakeHome, ".memarium/session-repo/.memarium/index.json");
    const id = "019f0000-1111-7000-8000-0000aaaabbbb";
    const before = JSON.parse(readFileSync(indexPath, "utf8")).entries[`codex:${id}`];
    const titleIndex = join(codexRoot, "session_index.jsonl");
    writeFileSync(titleIndex, readFileSync(titleIndex, "utf8") + JSON.stringify({
      id, thread_name: "Renamed plugin thread", updated_at: "2026-09-01T11:00:00Z",
    }) + "\n");

    const result = await scanAndImport({ projectFilter: null });
    const after = JSON.parse(readFileSync(indexPath, "utf8")).entries[`codex:${id}`];
    expect(result.imported).toBe(1);
    expect(after.relativePath).not.toBe(before.relativePath);
    expect(existsSync(join(fakeHome, ".memarium/session-repo", before.relativePath))).toBe(false);
    expect(existsSync(join(fakeHome, ".memarium/session-repo", after.relativePath))).toBe(true);
  });

  it("skips meta-project paths (.worktrees-, *-workspacestorage)", async () => {
    writeFakeJsonl(
      join(claudeProjectsDir, "-Users-test-.worktrees-foo"),
      "noisy",
      "/Users/test/.worktrees-foo"
    );
    const result = await scanAndImport({ projectFilter: null });
    expect(result.imported).toBe(0);
    expect(result.filteredAsPseudoProject).toBeGreaterThanOrEqual(1);
  });
});
