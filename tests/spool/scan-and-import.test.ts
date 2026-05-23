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
    const projDir = join(claudeProjectsDir, "-Users-test-edge-src");
    writeFakeJsonl(projDir, "abc-123", "/Users/test/edge/src");

    const result = await scanAndImport({ projectFilter: null });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);

    const spoolRoot = join(fakeHome, ".vibebook/session-repo");
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
    // No .raw.json — single-file md format since 0.2.0 (matches npm vibebook >= 0.6)
    expect(files.find((f) => f.endsWith(".raw.json"))).toBeUndefined();
  });

  it("writes ~/.vibebook/session-repo/.vibebook/index.json with the imported session entry", async () => {
    const projDir = join(claudeProjectsDir, "-Users-test-edge-src");
    writeFakeJsonl(projDir, "abc-123", "/Users/test/edge/src");

    await scanAndImport({ projectFilter: null });

    const indexPath = join(fakeHome, ".vibebook/session-repo/.vibebook/index.json");
    expect(existsSync(indexPath)).toBe(true);
    const idx = JSON.parse(readFileSync(indexPath, "utf8"));
    expect(idx.version).toBe(1);
    expect(Object.keys(idx.entries).length).toBe(1);
    const entry = Object.values(idx.entries)[0] as { sessionId: string; tool: string; project: string };
    expect(entry.sessionId).toBe("abc-123");
    expect(entry.tool).toBe("claude");
    // edge-src is the parent-basename slug for /Users/test/edge/src
    expect(entry.project).toBe("edge-src");
  });

  it("is idempotent — running twice imports 1 then 0 (mtime unchanged)", async () => {
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
    writeFakeJsonl(join(claudeProjectsDir, "-Users-test-foo"), "s2", "/Users/test/foo");

    const result = await scanAndImport({ projectFilter: "edge-src" });
    expect(result.imported).toBe(1);

    const spoolRoot = join(fakeHome, ".vibebook/session-repo");
    const projectSlugs = readdirSync(join(spoolRoot, "raw_sessions/claude"));
    expect(projectSlugs).toEqual(["edge-src"]);
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
