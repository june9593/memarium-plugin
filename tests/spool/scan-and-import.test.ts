import { createHash } from "node:crypto";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, readdirSync, cpSync, chmodSync, appendFileSync, statSync } from "node:fs";
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

  it("imports the latest Copilot customTitle through the autonomous scanner", async () => {
    const ws = join(
      fakeHome,
      process.platform === "darwin" ? "Library/Application Support/Code/User/workspaceStorage/hashTitle"
        : process.platform === "win32" ? "AppData/Roaming/Code/User/workspaceStorage/hashTitle"
        : ".config/Code/User/workspaceStorage/hashTitle",
    );
    mkdirSync(join(ws, "chatSessions"), { recursive: true });
    cpSync(join(fixturesDir, "copilot", "workspace.json"), join(ws, "workspace.json"));
    cpSync(
      join(fixturesDir, "copilot", "vscode-copilot-chatsessions.jsonl"),
      join(ws, "chatSessions", "sess-bbbb2222.jsonl"),
    );

    const result = await scanAndImport({ projectFilter: null });
    expect(result.imported).toBe(1);
    const indexPath = join(fakeHome, ".memarium/session-repo/.memarium/index.json");
    const entry = JSON.parse(readFileSync(indexPath, "utf8")).entries["copilot:sess-bbbb2222"];
    expect(entry.displayName).toBe("Final Copilot session title");
    expect(entry.relativePath).toContain("Final-Copilot-session-title");
  });

  it.each(["json", "jsonl"] as const)("migrates an unchanged %s source once and tracks subsequent provider renames", async (extension) => {
    const storage = join(fakeHome, process.platform === "darwin"
      ? "Library/Application Support/Code/User/workspaceStorage"
      : process.platform === "win32" ? "AppData/Roaming/Code/User/workspaceStorage"
      : ".config/Code/User/workspaceStorage");
    const ws = join(storage, "workspace");
    mkdirSync(join(ws, "chatSessions"), { recursive: true });
    cpSync(join(fixturesDir, "copilot", "workspace.json"), join(ws, "workspace.json"));
    const id = "12345678-abcd-4000-8000-123456789abc";
    const sourcePath = join(ws, "chatSessions", `${id}.${extension}`);
    const state = {
      version: 3, sessionId: id, customTitle: "Provider title", requests: [{
        message: { text: "First user prompt" }, timestamp: Date.parse("2026-09-01T00:00:00Z"),
        response: [{ kind: "markdownContent", content: { value: "Original response" } }],
      }],
    };
    writeFileSync(sourcePath, JSON.stringify(extension === "json" ? state : { kind: 0, v: state }) + "\n");
    const originalSource = readFileSync(sourcePath);
    const st = statSync(sourcePath);
    const spool = join(fakeHome, ".memarium/session-repo");
    const relativePath = "raw_sessions/copilot/code-demo/2026-09-01/First-user-prompt__12345678.md";
    mkdirSync(join(spool, "raw_sessions/copilot/code-demo/2026-09-01"), { recursive: true });
    writeFileSync(join(spool, relativePath), "Legacy render");
    mkdirSync(join(spool, ".memarium"), { recursive: true });
    const indexPath = join(spool, ".memarium/index.json");
    writeFileSync(indexPath, JSON.stringify({ version: 1, entries: { [`copilot:${id}`]: {
      sessionId: id, shortId: "12345678", tool: "copilot", project: "code-demo",
      projectRaw: "/Users/me/code/demo", startedAt: "2026-09-01T00:00:00.000Z",
      endedAt: "2026-09-01T00:00:00.000Z", displayName: "First user prompt",
      nameSlug: "First-user-prompt", relativePath, sourcePath, sourceMtimeMs: st.mtimeMs,
      sourceSha256: createHash("sha256").update(originalSource).digest("hex"),
    } } }));

    expect((await scanAndImport({ projectFilter: null })).imported).toBe(1);
    const migrated = JSON.parse(readFileSync(indexPath, "utf8")).entries[`copilot:${id}`];
    expect(migrated.displayName).toBe("Provider title");
    expect(existsSync(join(spool, relativePath))).toBe(false);
    expect(readFileSync(join(spool, migrated.relativePath), "utf8")).toContain("First user prompt");
    expect(readFileSync(sourcePath)).toEqual(originalSource);
    expect(statSync(sourcePath).mtimeMs).toBe(st.mtimeMs);
    expect((await scanAndImport({ projectFilter: null })).imported).toBe(0);

    if (extension === "json") {
      writeFileSync(sourcePath, JSON.stringify({ ...state, customTitle: "Renamed provider title" }));
    } else {
      appendFileSync(sourcePath, JSON.stringify({ kind: 1, k: ["customTitle"], v: "Renamed provider title" }) + "\n");
    }
    expect((await scanAndImport({ projectFilter: null })).imported).toBe(1);
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    expect(Object.keys(index.entries)).toEqual([`copilot:${id}`]);
    const renamed = index.entries[`copilot:${id}`];
    expect(renamed.displayName).toBe("Renamed provider title");
    expect(existsSync(join(spool, migrated.relativePath))).toBe(false);
    expect(existsSync(join(spool, renamed.relativePath))).toBe(true);
    expect((await scanAndImport({ projectFilter: null })).imported).toBe(0);
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

  it.skipIf(process.platform === "win32")("keeps the indexed render when replacement index persistence fails", async () => {
    const codexRoot = join(fakeHome, ".codex");
    cpSync(join(fixturesDir, "codex"), codexRoot, { recursive: true });
    await scanAndImport({ projectFilter: null });
    const indexPath = join(fakeHome, ".memarium/session-repo/.memarium/index.json");
    const id = "019f0000-1111-7000-8000-0000aaaabbbb";
    const oldPath = JSON.parse(readFileSync(indexPath, "utf8")).entries[`codex:${id}`].relativePath;
    const titleIndex = join(codexRoot, "session_index.jsonl");
    writeFileSync(titleIndex, readFileSync(titleIndex, "utf8") + JSON.stringify({
      id, thread_name: "Rename before failed save", updated_at: "2026-09-02T12:00:00Z",
    }) + "\n");
    chmodSync(indexPath, 0o444);
    try {
      await expect(scanAndImport({ projectFilter: null })).rejects.toThrow();
      expect(existsSync(join(fakeHome, ".memarium/session-repo", oldPath))).toBe(true);
    } finally {
      chmodSync(indexPath, 0o644);
    }
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
