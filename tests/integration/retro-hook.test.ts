import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const user = { message: { role: "user", content: "Update the sample" } };
const use = (name: string, input: object = {}) => ({ message: { role: "assistant", content: [{ type: "tool_use", id: "call-1", name, input }] } });
const done = (meta: object = {}) => ({ message: { role: "user", content: [{ type: "tool_result", tool_use_id: "call-1", is_error: false, content: "ok" }] }, toolUseResult: { stdout: "ok", ...meta } });

describe("packaged Stop hook", () => {
  let home: string;
  let memoryHome: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "memarium-retro-hook-"));
    memoryHome = join(home, ".memarium");
    mkdirSync(memoryHome);
    writeFileSync(join(home, "sample.ts"), "original");
  });
  afterEach(() => { rmSync(home, { recursive: true, force: true }); });
  function run(rows: unknown[], extra: object = {}, raw?: string) {
    const transcript = join(home, "transcript.jsonl");
    writeFileSync(transcript, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const r = spawnSync("bash", [join(repo, "hooks/session-end.sh")], {
      cwd: home, encoding: "utf8", timeout: 10000,
      env: { ...process.env, HOME: home, MEMARIUM_DIR: memoryHome, CLAUDE_PLUGIN_ROOT: repo },
      input: raw ?? JSON.stringify({ session_id: "fixture", transcript_path: transcript, stop_hook_active: false, ...extra }),
    });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
    expect(r.stderr).toBe("");
    expect(readFileSync(join(home, "sample.ts"), "utf8")).toBe("original");
    expect(readdirSync(memoryHome)).toEqual([]);
    return r.stdout.trim() ? JSON.parse(r.stdout) : null;
  }
  it("reads mutation records without executing the recorded command", () => {
    const decision = run([user, use("Bash", { command: "cat > sample.ts <<'EOF'\nchanged\nEOF" }), done()]);
    expect(decision.decision).toBe("block");
    expect(decision.reason).toContain('skill: "memarium:memarium-retro"');
  });
  it("keeps read-only results and background launches quiet", () => {
    expect(run([user, use("Bash", { command: "git status" }), done()])).toBeNull();
    expect(run([user, use("Bash", { command: "cat > sample.ts" }), done({ backgroundTaskId: "background-1", exitCode: 0 })])).toBeNull();
  });
  it("keeps the loop guard, malformed input and missing transcript nonblocking", () => {
    expect(run([user, use("Edit"), done()], { stop_hook_active: true })).toBeNull();
    expect(run([], {}, "{not json")).toBeNull();
    expect(run([], { transcript_path: join(home, "absent.jsonl") })).toBeNull();
  });
  it("retains recent work after a large prior transcript", () => {
    const large = { message: { role: "assistant", content: "x".repeat(1024 * 1024 + 128) } };
    expect(run([large, user, use("Edit"), done()]).decision).toBe("block");
    expect(run([user, use("Edit"), large, done()])).toBeNull(); // call fell outside bounded tail
  });
});
