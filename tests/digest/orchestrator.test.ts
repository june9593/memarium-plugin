import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { orchestrateCmd } from "../../src/digest/orchestrator.js";

describe("orchestrateCmd", () => {
  let fakeHome: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), "vbp-orc-"));
    vi.stubEnv("HOME", fakeHome);
    mkdirSync(join(fakeHome, ".claude/projects/-Users-test-edge-src"), { recursive: true });
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    stdoutSpy.mockRestore();
    rmSync(fakeHome, { recursive: true, force: true });
  });

  function writeFakeJsonl(projectDir: string, sessionId: string, cwd: string) {
    const lines = [
      JSON.stringify({ type: "user", message: { role: "user", content: "hi" }, sessionId, cwd, timestamp: "2026-05-10T00:00:00Z" }),
      JSON.stringify({ type: "assistant", message: { role: "assistant", content: "hey" }, sessionId, cwd, timestamp: "2026-05-10T00:00:01Z" }),
    ];
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, `${sessionId}.jsonl`), lines.join("\n") + "\n");
  }

  it("project mode: imports only matching project, prints JSON with mode=project", async () => {
    writeFakeJsonl(join(fakeHome, ".claude/projects/-Users-test-edge-src"), "abc", "/Users/test/edge/src");
    writeFakeJsonl(join(fakeHome, ".claude/projects/-Users-test-other"), "xyz", "/Users/test/other");

    await orchestrateCmd({ mode: "project", cwd: "/Users/test/edge/src" });

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join("");
    const parsed = JSON.parse(out);
    expect(parsed.mode).toBe("project");
    expect(parsed.project).toBe("edge-src");
    expect(parsed.scan.imported).toBe(1);
    // Only edge-src made it into spool. New layout: raw_sessions/<tool>/<project>/<date>/
    const spoolProjects = readdirSync(join(fakeHome, ".vibebook/session-repo/raw_sessions/claude"));
    expect(spoolProjects).toEqual(["edge-src"]);
  });

  it("global mode: imports all projects, prints JSON with mode=global", async () => {
    writeFakeJsonl(join(fakeHome, ".claude/projects/-Users-test-edge-src"), "abc", "/Users/test/edge/src");
    writeFakeJsonl(join(fakeHome, ".claude/projects/-Users-test-foo"), "xyz", "/Users/test/foo");

    await orchestrateCmd({ mode: "global" });

    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join("");
    const parsed = JSON.parse(out);
    expect(parsed.mode).toBe("global");
    expect(parsed.scan.imported).toBe(2);
    const spoolProjects = readdirSync(join(fakeHome, ".vibebook/session-repo/raw_sessions/claude"));
    // projectSlugFromPath("/Users/test/foo") → "test-foo" (parent-basename rule)
    expect(new Set(spoolProjects)).toEqual(new Set(["edge-src", "test-foo"]));
  });

  it("project mode without --cwd uses process.cwd()", async () => {
    await orchestrateCmd({ mode: "project" });
    const out = stdoutSpy.mock.calls.map((c) => String(c[0])).join("");
    const parsed = JSON.parse(out);
    expect(parsed.mode).toBe("project");
  });

  it("invalid mode throws", async () => {
    await expect(orchestrateCmd({ mode: "bogus" })).rejects.toThrow(/mode/);
  });
});
